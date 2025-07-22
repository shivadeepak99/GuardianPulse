# GuardianPulse

Revolutionary AI-powered personal safety application with persistent monitoring and anomaly detection.

## Project Structure

This is a monorepo managed with pnpm workspaces containing:

- `packages/api` - Backend API service (Node.js + TypeScript + Express)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose (for containerized deployment)

### Local Development

```bash
# Install dependencies for all packages
pnpm install

# Start the API development server
cd packages/api
pnpm dev
```

### Docker Deployment

#### Production
```bash
# Build and start production container
docker-compose up --build api

# Or build manually
docker build -t guardian-pulse-api ./packages/api
docker run -p 8080:8080 guardian-pulse-api
```

#### Development with Hot-Reloading
```bash
# Start development container with volume mounting
docker-compose --profile dev up --build api-dev
```

### API Service

The backend API runs on port 8080 and provides:
- Health check endpoint: `GET /health`

## Development

This project uses:
- TypeScript for type safety
- pnpm workspaces for monorepo management
- Express.js for the API server
- Docker multi-stage builds for production deployment
- **ESLint + Prettier** for code quality and formatting
- **Husky + lint-staged** for pre-commit quality checks
- Strict TypeScript configuration for code quality

### Code Quality
```bash
# Lint all packages
pnpm run lint

# Format all packages  
pnpm run format

# Run comprehensive quality checks
pnpm run code-quality
```

Pre-commit hooks automatically:
- Format code with Prettier
- Fix ESLint issues
- Validate TypeScript types

## Docker Features

- **Multi-stage builds** for optimized production images
- **Security hardening** with non-root user
- **Health checks** for container monitoring
- **Development mode** with hot-reloading via volume mounts
- **Production mode** with lean Alpine Linux base
