# Infiora Backend Makefile
# Production-grade Django REST API

# Variables
DOCKER_COMPOSE = docker compose
DOCKER_COMPOSE_PROD = docker compose -f docker-compose.prod.yml
DJANGO_MANAGE = python src/manage.py
DOCKER_DJANGO_MANAGE = $(DOCKER_COMPOSE) exec web python src/manage.py

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Default target
.PHONY: help
help:
	@echo "$(BLUE)Infiora Backend - Available Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make setup          - Initial project setup"
	@echo "  make dev            - Start dev environment"
	@echo "  make build          - Build Docker images"
	@echo "  make up             - Start all services"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make migrate        - Run database migrations"
	@echo "  make makemigrations - Create new migrations"
	@echo "  make dbshell        - Access database shell"
	@echo "  make flush          - Flush database"
	@echo "  make seed           - Load sample data"
	@echo ""
	@echo "$(GREEN)Django Management:$(NC)"
	@echo "  make shell          - Django shell"
	@echo "  make superuser      - Create superuser"
	@echo "  make collectstatic  - Collect static files"
	@echo "  make test           - Run tests"
	@echo "  make coverage       - Run tests with coverage"
	@echo ""
	@echo "$(GREEN)Code Quality:$(NC)"
	@echo "  make lint           - Run linting (flake8)"
	@echo "  make format         - Format code (black, isort)"
	@echo "  make type-check     - Run type checking (mypy)"
	@echo "  make quality        - Run all quality checks"
	@echo ""
	@echo "$(GREEN)Production:$(NC)"
	@echo "  make prod-build     - Build prod images"
	@echo "  make prod-up        - Start prod environment"
	@echo "  make prod-down      - Stop prod environment"
	@echo "  make prod-logs      - View prod logs"
	@echo "  make prod-migrate   - Run prod migrations"
	@echo "  make prod-collectstatic - Collect static files"
	@echo "  make prod-deploy    - Full production deployment"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  make clean          - Clean up containers and volumes"
	@echo "  make backup-db      - Backup database"
	@echo "  make restore-db     - Restore database"

# Development
.PHONY: setup
setup:
	@echo "$(YELLOW)Setting up dev environment...$(NC)"
	@cp .env.example .env || echo "$(YELLOW)Note: .env.example not found, create .env manually$(NC)"
	@$(DOCKER_COMPOSE) build
	@$(DOCKER_COMPOSE) up -d db redis
	@echo "$(YELLOW)Waiting for database to be ready...$(NC)"
	@sleep 10
	@$(DOCKER_COMPOSE) run --rm web python src/manage.py migrate
	@echo "$(GREEN)Setup complete! Run 'make dev' to start dev server$(NC)"

.PHONY: dev
dev:
	@echo "$(YELLOW)Starting dev environment...$(NC)"
	@$(DOCKER_COMPOSE) up

.PHONY: build
build:
	@echo "$(YELLOW)Building Docker images...$(NC)"
	@$(DOCKER_COMPOSE) build

.PHONY: up
up:
	@echo "$(YELLOW)Starting all services...$(NC)"
	@$(DOCKER_COMPOSE) up -d

.PHONY: down
down:
	@echo "$(YELLOW)Stopping all services...$(NC)"
	@$(DOCKER_COMPOSE) down

.PHONY: restart
restart: down up

.PHONY: logs
logs:
	@$(DOCKER_COMPOSE) logs -f

# Database
.PHONY: migrate
migrate:
	@echo "$(YELLOW)Running database migrations...$(NC)"
	@$(DOCKER_DJANGO_MANAGE) migrate

.PHONY: makemigrations
makemigrations:
	@echo "$(YELLOW)Creating new migrations...$(NC)"
	@$(DOCKER_DJANGO_MANAGE) makemigrations

.PHONY: dbshell
dbshell:
	@$(DOCKER_DJANGO_MANAGE) dbshell

.PHONY: flush
flush:
	@echo "$(RED)This will delete all data in the database. Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@$(DOCKER_DJANGO_MANAGE) flush --noinput

.PHONY: seed
seed:
	@echo "$(YELLOW)Loading sample data...$(NC)"
	@$(DOCKER_DJANGO_MANAGE) loaddata fixtures/*.json || echo "$(YELLOW)No fixtures found$(NC)"

# Django Management
.PHONY: shell
shell:
	@$(DOCKER_DJANGO_MANAGE) shell

.PHONY: superuser
superuser:
	@$(DOCKER_DJANGO_MANAGE) createsuperuser

.PHONY: collectstatic
collectstatic:
	@echo "$(YELLOW)Collecting static files...$(NC)"
	@$(DOCKER_DJANGO_MANAGE) collectstatic --noinput

.PHONY: test
test:
	@echo "$(YELLOW)Running tests...$(NC)"
	@$(DOCKER_COMPOSE) run --rm -e DJANGO_SETTINGS_MODULE=core.settings.test -e PYTHONPATH=/app/src web sh -c "cd src && python -m pytest apps/authentication/tests.py"

.PHONY: coverage
coverage:
	@echo "$(YELLOW)Running tests with coverage...$(NC)"
	@$(DOCKER_COMPOSE) run --rm -e DJANGO_SETTINGS_MODULE=core.settings.test -e PYTHONPATH=/app/src web sh -c "cd src && python -m pytest --cov=apps --cov-report=html --cov-report=term"

# Code Quality
.PHONY: lint
lint:
	@echo "$(YELLOW)Running linting...$(NC)"
	@$(DOCKER_COMPOSE) run --rm web python -m flake8 src/ --max-line-length=127 --ignore=E203,E501,W503 --exclude=migrations

.PHONY: format
format:
	@echo "$(YELLOW)Formatting code...$(NC)"
	@$(DOCKER_COMPOSE) run --rm web python -m black src/
	@$(DOCKER_COMPOSE) run --rm web python -m isort src/

.PHONY: type-check
type-check:
	@echo "$(YELLOW)Running type checking...$(NC)"
	@$(DOCKER_COMPOSE) run --rm web python -m mypy src/

.PHONY: quality
quality: 
	@echo "$(YELLOW)Running code quality checks...$(NC)"
	@$(DOCKER_COMPOSE) run --rm web python -m flake8 src/ --max-line-length=127 --ignore=E203,E501,W503 --exclude=migrations || echo "$(YELLOW)Flake8 found style issues$(NC)"
	@$(DOCKER_COMPOSE) run --rm web python -m mypy src/ || echo "$(YELLOW)MyPy found type issues$(NC)"
	@echo "$(GREEN)Quality checks completed (issues may exist)$(NC)"

# Production
.PHONY: prod-build
prod-build:
	@echo "$(YELLOW)Building prod images...$(NC)"
	@$(DOCKER_COMPOSE_PROD) build

.PHONY: prod-up
prod-up:
	@echo "$(YELLOW)Starting prod environment...$(NC)"
	@$(DOCKER_COMPOSE_PROD) up -d

.PHONY: prod-down
prod-down:
	@echo "$(YELLOW)Stopping prod environment...$(NC)"
	@$(DOCKER_COMPOSE_PROD) down

.PHONY: prod-logs
prod-logs:
	@$(DOCKER_COMPOSE_PROD) logs -f

.PHONY: prod-migrate
prod-migrate:
	@echo "$(YELLOW)Running production migrations...$(NC)"
	@$(DOCKER_COMPOSE_PROD) exec -T web python src/manage.py migrate

.PHONY: prod-collectstatic
prod-collectstatic:
	@echo "$(YELLOW)Collecting static files for production...$(NC)"
	@$(DOCKER_COMPOSE_PROD) exec -T web python src/manage.py collectstatic --noinput

.PHONY: prod-deploy
prod-deploy:
	@echo "$(YELLOW)Deploying to production...$(NC)"
	@$(DOCKER_COMPOSE_PROD) down || true
	@$(DOCKER_COMPOSE_PROD) build
	@$(DOCKER_COMPOSE_PROD) up -d
	@sleep 10
	@make prod-migrate
	@make prod-collectstatic
	@echo "$(GREEN)Production deployment completed$(NC)"

# Utilities
.PHONY: clean
clean:
	@echo "$(RED)This will remove all containers, networks, and volumes. Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@$(DOCKER_COMPOSE) down -v --remove-orphans
	@$(DOCKER_COMPOSE_PROD) down -v --remove-orphans
	@docker system prune -f

.PHONY: backup-db
backup-db:
	@echo "$(YELLOW)Creating database backup...$(NC)"
	@mkdir -p backups
	@$(DOCKER_COMPOSE) exec db pg_dump -U postgres infiora > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Database backup created$(NC)"

.PHONY: restore-db
restore-db:
	@echo "$(RED)This will restore the database. Current data will be lost. Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "Enter backup file path:"
	@read backup_file && $(DOCKER_COMPOSE) exec -T db psql -U postgres -d infiora < $$backup_file

# Local dev without Docker
.PHONY: local-setup
local-setup:
	@echo "$(YELLOW)Setting up local dev environment...$(NC)"
	@python -m venv venv
	@. venv/bin/activate && pip install -r requirements/dev.txt
	@. venv/bin/activate && python src/manage.py migrate
	@echo "$(GREEN)Local setup complete! Activate venv and run 'python src/manage.py runserver'$(NC)"

.PHONY: local-test
local-test:
	@echo "$(YELLOW)Running tests locally...$(NC)"
	@. venv/bin/activate && pytest

.PHONY: local-quality
local-quality:
	@echo "$(YELLOW)Running quality checks locally...$(NC)"
	@. venv/bin/activate && flake8 src/
	@. venv/bin/activate && black --check src/
	@. venv/bin/activate && isort --check-only src/
	@. venv/bin/activate && mypy src/