# Refty Ops Version Service

A microservice that automates the process of updating container image versions across Kubernetes deployment configurations. This service integrates with GitHub to manage infrastructure as code and streamline the CI/CD pipeline.

## 🚀 Features

- **RESTful API**: Simple POST endpoint for updating image versions
- **YAML Processing**: Automatically finds and updates all YAML files containing specified images
- **Git Integration**: Pulls latest changes, commits updates, and pushes to GitHub
- **Error Handling**: Comprehensive error handling and logging
- **Docker Support**: Containerized deployment ready
- **Health Checks**: Built-in health monitoring

## 📋 Prerequisites

- Node.js 18+ 
- Git
- GitHub Personal Access Token (PAT) with repo permissions
- Fork of the target infrastructure repository

## 🛠️ Installation

### 1. Clone and Setup

```bash
# Clone your fork of the infrastructure repository
git clone git@github.com:YOUR_USERNAME/refty-infra-test.git

# Clone this service
git clone <this-repository-url>
cd refty-ops-version-service
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO=YOUR_USERNAME/refty-infra-test
GITHUB_CLONE_URL=git@github.com:YOUR_USERNAME/refty-infra-test.git
REPO_LOCAL_PATH=../refty-infra-test
GIT_USER_NAME=Your Name
GIT_USER_EMAIL=your@email.com
PORT=3000
```

### 4. Build and Run

```bash
# Build TypeScript
npm run build

# Start the service
npm start
```

The service will be available at `http://localhost:3000`

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t refty-ops-version-service .
```

### Run with Docker

```bash
docker run -d \
  --name refty-ops-version-service \
  -p 3000:3000 \
  -e GITHUB_TOKEN=your_token \
  -e GITHUB_REPO=YOUR_USERNAME/refty-infra-test \
  -e REPO_LOCAL_PATH=/app/repo \
  -e GIT_USER_NAME="Your Name" \
  -e GIT_USER_EMAIL=your@email.com \
  -v /path/to/your/repo:/app/repo \
  refty-ops-version-service
```

## 📚 API Documentation

### Health Check

**GET** `/`

Returns service status.

**Response:**
```
refty-ops-version-service is running!
```

### Update Image Version

**POST** `/update-image-version`

Updates all YAML files containing the specified image to the new version.

**Request Body:**
```json
{
  "image": "ghcr.io/refty-yapi/refty-node/refty-node",
  "version": "05-06-42a252"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully updated 3 files",
  "filesUpdated": [
    "deployment1.yaml",
    "deployment2.yaml",
    "cronjob.yaml"
  ],
  "commitHash": "abc123def456..."
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Both 'image' and 'version' are required in the request body"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Internal server error: [error details]"
}
```

## 🔧 Usage Examples

### Using curl

```bash
curl -X POST http://localhost:3000/update-image-version \
  -H "Content-Type: application/json" \
  -d '{
    "image": "ghcr.io/refty-yapi/refty-node/refty-node",
    "version": "05-06-42a252"
  }'
```

### Using JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/update-image-version', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    image: 'ghcr.io/refty-yapi/refty-node/refty-node',
    version: '05-06-42a252'
  })
});

const result = await response.json();
console.log(result);
```

## 🏗️ Architecture

The service follows this workflow:

1. **Receive Request**: POST request with image name and new version
2. **Validate Input**: Ensure both image and version are provided
3. **Pull Latest**: Fetch latest changes from the infrastructure repository
4. **Find YAML Files**: Recursively search for all `.yaml`/`.yml` files
5. **Update Images**: Replace image versions in matching files
6. **Commit Changes**: Create a single commit with all updates
7. **Push to GitHub**: Push changes to the repository
8. **Return Response**: Provide success/error response with details

## 🔍 Logging

The service uses Winston for logging with the following levels:
- **info**: Normal operations (requests, updates, commits)
- **error**: Errors and exceptions
- **warn**: Warning conditions

Logs include timestamps and structured data for easy debugging.

## 🚨 Error Handling

The service handles various error scenarios:

- **Invalid Input**: Missing or malformed request data
- **Git Operations**: Network issues, authentication problems
- **YAML Parsing**: Invalid YAML files
- **File System**: Permission issues, missing files
- **Network**: GitHub API connectivity issues

## 🔐 Security Considerations

- Use environment variables for sensitive data (GitHub tokens)
- Run container as non-root user
- Implement proper authentication for production use
- Use HTTPS in production environments
- Regularly rotate GitHub tokens

## 🧪 Testing

### Manual Testing

1. Start the service: `npm start`
2. Test health endpoint: `curl http://localhost:3000`
3. Test image update: Use the curl example above
4. Verify changes in your GitHub repository

### Integration Testing

The service can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Update Image Version
  run: |
    curl -X POST ${{ secrets.SERVICE_URL }}/update-image-version \
      -H "Content-Type: application/json" \
      -d '{
        "image": "${{ env.IMAGE_NAME }}",
        "version": "${{ env.IMAGE_VERSION }}"
      }'
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🤝 Support

For issues and questions:
1. Check the logs for error details
2. Verify environment configuration
3. Ensure GitHub token has proper permissions
4. Check repository access and paths 