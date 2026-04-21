# Docker

This document explains Docker containerization for the project.

## Overview

The project includes:
- `Dockerfile` - Multi-stage build for the API
- `docker-compose.yml` - Orchestrates API + PostgreSQL
- `.dockerignore` - Excludes unnecessary files from build

---

## Dockerfile Explained

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project file and restore (cached layer)
COPY ["InfioraApi.csproj", "./"]
RUN dotnet restore

# Copy source and build
COPY . .
RUN dotnet build -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Runtime (smallest image)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Security: Run as non-root user
RUN adduser --disabled-password --gecos "" appuser
COPY --from=publish /app/publish .
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "InfioraApi.dll"]
```

### Why Multi-Stage?

| Stage | Base Image | Size | Purpose |
|-------|------------|------|---------|
| build | sdk:9.0 | ~900MB | Compile code |
| publish | sdk:9.0 | ~900MB | Create deployment package |
| final | aspnet:9.0 | ~220MB | Run application |

Only the final stage goes to production = smaller, more secure image.

---

## Docker Compose

```yaml
version: '3.8'

services:
  api:
    build: .
    container_name: infiora-api
    ports:
      - "8080:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__DefaultConnection=Host=db;...
      - DatabaseProvider=PostgreSQL
      - Jwt__SecretKey=${JWT_SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    container_name: infiora-db
    environment:
      - POSTGRES_DB=infioradb
      - POSTGRES_USER=infiora
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U infiora"]
      interval: 10s

volumes:
  postgres_data:
```

---

## Commands

### Build and Run Everything
```bash
docker-compose up --build
```

### Run in Background
```bash
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Just API
docker-compose logs -f api

# Just database
docker-compose logs -f db
```

### Stop Everything
```bash
docker-compose down
```

### Stop and Remove Data
```bash
docker-compose down -v  # Also removes database volume
```

### Rebuild After Code Changes
```bash
docker-compose up --build api
```

### Run Only Database
```bash
docker-compose up -d db
```

### Access Database Shell
```bash
docker exec -it infiora-db psql -U infiora -d infioradb
```

---

## Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
ASPNETCORE_ENVIRONMENT=Development
DATABASE_PROVIDER=PostgreSQL
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=infioradb
POSTGRES_USER=infiora
POSTGRES_PASSWORD=YourSecurePassword123!
JWT_SECRET_KEY=YourSecretKeyAtLeast32CharactersLong!
JWT_ISSUER=InfioraApi
JWT_AUDIENCE=InfioraApi
JWT_EXPIRATION_MINUTES=60
```

Docker Compose automatically reads `.env` file.

---

## Useful Docker Commands

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# View container resource usage
docker stats

# Enter container shell
docker exec -it infiora-api /bin/sh

# View image sizes
docker images

# Clean up unused images
docker image prune

# Clean up everything unused
docker system prune -a
```

---

## Production Considerations

### 1. Use Specific Image Tags
```dockerfile
# Don't use :latest in production
FROM mcr.microsoft.com/dotnet/aspnet:9.0.0
```

### 2. Use Secrets Management
```yaml
services:
  api:
    secrets:
      - jwt_secret
      - db_password

secrets:
  jwt_secret:
    external: true
  db_password:
    external: true
```

### 3. Health Checks
Already configured - Docker will restart unhealthy containers.

### 4. Resource Limits
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### 5. Logging
```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs api

# Common issues:
# - Port already in use
# - Missing environment variables
# - Database not ready
```

### Database Connection Failed
```bash
# Check if db is healthy
docker-compose ps

# Check db logs
docker-compose logs db

# Verify connection string uses 'db' as host (container name)
```

### Permission Denied
```bash
# On Linux, you may need:
sudo docker-compose up
# Or add user to docker group
```

### Clean Slate
```bash
docker-compose down -v --rmi all
docker-compose up --build
```
