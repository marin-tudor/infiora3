.PHONY: help build run watch clean restore test docker-up docker-down docker-build docker-logs db-up db-shell migrate swagger

# Default target
help:
	@echo "InfioraApi - Available Commands"
	@echo "================================"
	@echo ""
	@echo "Development:"
	@echo "  make run          - Run the application"
	@echo "  make watch        - Run with hot reload"
	@echo "  make build        - Build the project"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make restore      - Restore NuGet packages"
	@echo "  make test         - Run tests"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up    - Start all containers (API + PostgreSQL)"
	@echo "  make docker-down  - Stop all containers"
	@echo "  make docker-build - Rebuild and start containers"
	@echo "  make docker-logs  - View container logs"
	@echo "  make db-up        - Start only PostgreSQL"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo ""
	@echo "Database:"
	@echo "  make migrate      - Create a new migration (usage: make migrate name=MigrationName)"
	@echo "  make db-update    - Apply pending migrations"
	@echo "  make db-drop      - Drop the database"
	@echo ""
	@echo "Utilities:"
	@echo "  make swagger      - Open Swagger UI in browser"
	@echo "  make format       - Format code"
	@echo "  make publish      - Publish for deployment"
	@echo ""

# ==================== Development ====================

# Run the application
run:
	dotnet run

# Run with hot reload
watch:
	dotnet watch run

# Build the project
build:
	dotnet build

# Clean build artifacts
clean:
	dotnet clean
	rm -rf bin obj

# Restore packages
restore:
	dotnet restore

# Run tests
test:
	dotnet test

# Format code
format:
	dotnet format

# Publish for deployment
publish:
	dotnet publish -c Release -o ./publish

# ==================== Docker ====================

# Start all containers
docker-up:
	docker-compose up -d

# Stop all containers
docker-down:
	docker-compose down

# Rebuild and start containers
docker-build:
	docker-compose up --build -d

# View logs
docker-logs:
	docker-compose logs -f

# View API logs only
docker-logs-api:
	docker-compose logs -f api

# View DB logs only
docker-logs-db:
	docker-compose logs -f db

# Start only database
db-up:
	docker-compose up -d db

# Stop and remove volumes (WARNING: deletes data)
docker-clean:
	docker-compose down -v --rmi local

# Open PostgreSQL shell
db-shell:
	docker exec -it infiora-db psql -U infiora -d infioradb

# ==================== Database Migrations ====================

# Create a new migration (usage: make migrate name=InitialCreate)
migrate:
ifndef name
	$(error Migration name is required. Usage: make migrate name=MigrationName)
endif
	dotnet ef migrations add $(name)

# Apply pending migrations
db-update:
	dotnet ef database update

# Drop the database
db-drop:
	dotnet ef database drop -f

# List migrations
db-list:
	dotnet ef migrations list

# Generate SQL script
db-script:
	dotnet ef migrations script -o migrations.sql

# ==================== Utilities ====================

# Open Swagger UI (macOS)
swagger:
	@echo "Opening Swagger UI..."
	@open http://localhost:5108 2>/dev/null || xdg-open http://localhost:5108 2>/dev/null || start http://localhost:5108

# Run with PostgreSQL locally
run-postgres:
	DatabaseProvider=PostgreSQL dotnet run

# Check if ports are in use
check-ports:
	@echo "Checking port 5108 (API)..."
	@lsof -i :5108 || echo "Port 5108 is free"
	@echo ""
	@echo "Checking port 5432 (PostgreSQL)..."
	@lsof -i :5432 || echo "Port 5432 is free"

# Kill process on port 5108
kill-api:
	@lsof -ti :5108 | xargs kill -9 2>/dev/null || echo "No process on port 5108"

# Show project info
info:
	@echo "Project: InfioraApi"
	@echo "Framework: .NET 9"
	@echo "Database: PostgreSQL / InMemory"
	@echo ""
	@echo "URLs:"
	@echo "  Local:  http://localhost:5108"
	@echo "  Docker: http://localhost:8080"
	@echo ""
	@echo "Environment:"
	@dotnet --version
