import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import simpleGit, { SimpleGit } from 'simple-git';
import logger from './logger';

interface UpdateRequest {
  image: string;
  version: string;
}

interface UpdateResult {
  success: boolean;
  message: string;
  filesUpdated?: string[];
  commitHash?: string;
}

export class ImageUpdater {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async updateImageVersion(request: UpdateRequest): Promise<UpdateResult> {
    try {
      logger.info(`Starting image update: ${request.image} -> ${request.version}`);

      // Validate input
      if (!request.image || !request.version) {
        return {
          success: false,
          message: 'Both image and version are required'
        };
      }

      // Pull latest changes
      await this.pullLatestChanges();

      // Find and update YAML files
      const updatedFiles = await this.updateYamlFiles(request.image, request.version);

      if (updatedFiles.length === 0) {
        return {
          success: false,
          message: `No YAML files found containing image: ${request.image}`
        };
      }

      // Commit and push changes
      const commitHash = await this.commitAndPushChanges(request.image, request.version, updatedFiles);

      logger.info(`Successfully updated ${updatedFiles.length} files with commit: ${commitHash}`);

      return {
        success: true,
        message: `Successfully updated ${updatedFiles.length} files`,
        filesUpdated: updatedFiles,
        commitHash
      };

    } catch (error) {
      logger.error('Error updating image version:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async pullLatestChanges(): Promise<void> {
    logger.info('Pulling latest changes from repository');
    await this.git.pull();
  }

  private async updateYamlFiles(imageName: string, newVersion: string): Promise<string[]> {
    const updatedFiles: string[] = [];
    
    // Find all YAML files recursively
    const yamlFiles = this.findYamlFiles(this.repoPath);
    
    for (const filePath of yamlFiles) {
      try {
        const wasUpdated = await this.updateSingleYamlFile(filePath, imageName, newVersion);
        if (wasUpdated) {
          updatedFiles.push(path.relative(this.repoPath, filePath));
        }
      } catch (error) {
        logger.error(`Error updating file ${filePath}:`, error);
      }
    }

    return updatedFiles;
  }

  private findYamlFiles(dir: string): string[] {
    const yamlFiles: string[] = [];
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .git directories
        if (item !== 'node_modules' && item !== '.git') {
          yamlFiles.push(...this.findYamlFiles(fullPath));
        }
      } else if (item.endsWith('.yaml') || item.endsWith('.yml')) {
        yamlFiles.push(fullPath);
      }
    }
    
    return yamlFiles;
  }

  private async updateSingleYamlFile(filePath: string, imageName: string, newVersion: string): Promise<boolean> {
    const content = fs.readFileSync(filePath, 'utf8');
    let wasUpdated = false;
    
    // Parse YAML content
    const yamlContent = yaml.load(content) as any;
    
    // Update image versions in the YAML structure
    const updatedYamlContent = this.updateYamlContent(yamlContent, imageName, newVersion);
    
    // Convert back to YAML string for comparison
    const newYamlContent = yaml.dump(updatedYamlContent, { lineWidth: -1 });
    
    // If content was updated, write back to file
    if (newYamlContent !== content) {
      fs.writeFileSync(filePath, newYamlContent, 'utf8');
      wasUpdated = true;
      logger.info(`Updated file: ${path.relative(this.repoPath, filePath)}`);
    }
    
    return wasUpdated;
  }

  private updateYamlContent(content: any, imageName: string, newVersion: string): any {
    if (typeof content === 'object' && content !== null) {
      if (Array.isArray(content)) {
        return content.map(item => this.updateYamlContent(item, imageName, newVersion));
      } else {
        const updated: any = {};
        for (const [key, value] of Object.entries(content)) {
          if (key === 'image' && typeof value === 'string') {
            // Check if this image matches our target image (without version)
            const imageWithoutVersion = value.split(':')[0];
            if (imageWithoutVersion === imageName) {
              updated[key] = `${imageName}:${newVersion}`;
              logger.info(`Updated image: ${value} -> ${updated[key]}`);
            } else {
              updated[key] = value;
            }
          } else {
            updated[key] = this.updateYamlContent(value, imageName, newVersion);
          }
        }
        return updated;
      }
    }
    return content;
  }

  private async commitAndPushChanges(imageName: string, version: string, filesUpdated: string[]): Promise<string> {
    // Configure git user
    await this.git.addConfig('user.name', process.env.GIT_USER_NAME || 'refty-ops-version-service');
    await this.git.addConfig('user.email', process.env.GIT_USER_EMAIL || 'service@refty.com');

    // Add all changes
    await this.git.add('.');

    // Create commit message
    const commitMessage = `Update ${imageName} to version ${version}\n\nUpdated files:\n${filesUpdated.map(f => `- ${f}`).join('\n')}`;

    // Commit changes
    await this.git.commit(commitMessage);

    // Get the latest commit hash
    const logResult = await this.git.log(['-1']);
    const commitHash = logResult.latest?.hash || '';

    // Push changes
    await this.git.push();

    logger.info(`Committed and pushed changes with hash: ${commitHash}`);

    return commitHash;
  }
} 