import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import logger from "./logger";
import { ImageUpdater } from "./updater";

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Health check
app.get("/", (_req, res) => {
  res.send("refty-ops-version-service is running!");
});

// Main POST endpoint
app.post("/update-image-version", async (req, res) => {
  try {
    const { image, version } = req.body;

    // Validate request body
    if (!image || !version) {
      return res.status(400).json({
        success: false,
        message: "Both 'image' and 'version' are required in the request body"
      });
    }

    logger.info(`Received update request: ${image} -> ${version}`);

    // Initialize updater with repository path
    const repoPath = process.env.REPO_LOCAL_PATH || "../refty-infra-test";
    const updater = new ImageUpdater(repoPath);

    // Perform the update
    const result = await updater.updateImageVersion({ image, version });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    logger.error("Error in update-image-version endpoint:", error);
    res.status(500).json({
      success: false,
      message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
}); 