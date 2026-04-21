# InfioraApi Documentation

Welcome to the InfioraApi documentation! This guide will help you understand the project structure, architecture, and how everything works together.

## Table of Contents

1. [Architecture Overview](./architecture.md) - Understanding the clean architecture pattern
2. [Project Structure](./project-structure.md) - Folder and file organization
3. [Configuration](./configuration.md) - Environment variables and settings
4. [API Endpoints](./api-endpoints.md) - Available REST endpoints
5. [Authentication](./authentication.md) - JWT authentication flow
6. [Database](./database.md) - Entity Framework Core setup
7. [Docker](./docker.md) - Container deployment
8. [Development Guide](./development-guide.md) - Getting started and best practices

## Quick Start

### Prerequisites
- .NET 9 SDK
- Docker (optional, for containerized deployment)
- IDE: Visual Studio, VS Code, or Rider

### Run Locally (InMemory Database)
```bash
dotnet run
```
Open http://localhost:5108 for Swagger UI

### Run with Docker
```bash
docker-compose up --build
```
Open http://localhost:8080 for Swagger UI

## Key Technologies

| Technology | Purpose |
|------------|---------|
| ASP.NET Core 9 | Web framework |
| Entity Framework Core 9 | ORM / Data access |
| PostgreSQL | Production database |
| JWT Bearer | Authentication |
| Swagger/OpenAPI | API documentation |
| Docker | Containerization |
| BCrypt | Password hashing |

## Project Philosophy

This project follows **Clean Architecture** principles:
- **Independence**: Business logic doesn't depend on frameworks
- **Testability**: Core logic can be tested without UI, database, or external services
- **Flexibility**: Easy to swap databases, UI, or external services
