# GuardianPulse Docker Commands

## Development Environment

### Start development server with hot-reloading
```bash
docker-compose --profile dev up api-dev
```

### Build and start development container
```bash
docker-compose --profile dev up --build api-dev
```

### Stop development container
```bash
docker-compose --profile dev down
```

## Production Environment

### Build and start production container
```bash
docker-compose up --build api
```

### Start production container (if already built)
```bash
docker-compose up api
```

### Stop production container
```bash
docker-compose down
```

## Docker Commands

### Build production image only
```bash
docker build -t guardian-pulse-api ./packages/api
```

### Run production container manually
```bash
docker run -p 8080:8080 guardian-pulse-api
```

### View container logs
```bash
# Development
docker-compose --profile dev logs -f api-dev

# Production
docker-compose logs -f api
```

### Execute commands in running container
```bash
# Development
docker-compose --profile dev exec api-dev sh

# Production
docker-compose exec api sh
```

## Health Checks

The containers include built-in health checks that monitor the `/health` endpoint every 30 seconds.
