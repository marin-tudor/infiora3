# Infiora Backend

A prod-grade Django REST API built for containerized deployment with comprehensive CI/CD pipeline.

## 🚀 Features

- **Django 4.2** with REST Framework
- **Custom User Model** with JWT authentication
- **AWS S3** integration for media files
- **PostgreSQL** database with Redis caching
- **Celery** for background tasks
- **Docker** containerized deployment
- **Separate CI/CD pipelines** for better control
- **Production-ready** configuration with security best practices
- **Comprehensive testing** setup with pytest
- **API documentation** with Swagger/ReDoc

## 📁 Project Structure

```
infiora-backend/
├── docs/
│   ├── dev/                   # Dev docs & guides
│   └── prod/                  # Prod deployment guides
├── scripts/                   # Deployment and utility scripts
├── src/                       # Main application code
│   ├── apps/
│   │   ├── authentication/    # JWT auth endpoints
│   │   ├── users/            # User management
│   │   └── common/           # Shared utilities
│   ├── core/
│   │   ├── settings/         # Environment-specific settings
│   │   │   ├── base.py       # Common settings
│   │   │   ├── dev.py # Development settings
│   │   │   ├── staging.py    # Staging settings
│   │   │   └── prod.py # Production settings
│   │   ├── urls.py           # URL configuration
│   │   ├── wsgi.py           # WSGI application
│   │   └── asgi.py           # ASGI application
│   ├── tests/                # Test files
│   │   ├── integration/      # Integration tests
│   │   ├── unit/            # Unit tests
│   │   └── conftest.py      # Pytest configuration
│   ├── fixtures/            # Sample data
│   └── manage.py            # Django management script
├── deploy/
│   └── nginx/               # Nginx configuration
├── .github/workflows/       # Separate CI/CD pipelines
├── requirements/            # Python dependencies
│   ├── base.txt             # Core dependencies
│   ├── dev.txt              # Dev tools + base
│   └── prod.txt             # Prod optimizations + base
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Development environment
├── docker-compose.prod.yml # Production environment
└── Makefile                # Developer commands
```

## 🛠 Quick Start

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/infiora-backend.git
   cd infiora-backend
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start dev environment**:
   ```bash
   make setup    # Initial setup
   make dev      # Start dev server
   ```

4. **Create superuser**:
   ```bash
   make superuser
   ```

**🔗 Quick Links:**
- **Dev Guide**: [docs/dev/README.md](docs/dev/README.md)
- **Setup Guide**: [docs/dev/setup.md](docs/dev/setup.md)
- **Testing Guide**: [docs/dev/testing.md](docs/dev/testing.md)
- **Prod Guide**: [docs/prod/README.md](docs/prod/README.md)
- **Server Setup**: [docs/prod/server.md](docs/prod/server.md)
- **Deployment Guide**: [docs/prod/deploy.md](docs/prod/deploy.md)

## 🐳 Docker Commands

### Development
```bash
make build          # Build images
make up             # Start services
make down           # Stop services
make logs           # View logs
make shell          # Django shell
make migrate        # Run migrations
make test           # Run tests
```

### Production
```bash
make prod-build     # Build prod images
make prod-up        # Start prod environment
make prod-down      # Stop prod environment
```

## 📋 Available Make Commands

```bash
make help           # Show all available commands
make setup          # Initial project setup
make dev            # Start dev environment
make test           # Run tests
make coverage       # Run tests with coverage
make lint           # Run code linting
make format         # Format code (black, isort)
make quality        # Run all quality checks
make clean          # Clean up containers and volumes
```

## 🚀 API Endpoints

### Authentication
- `POST /api/v1/auth/register/` - User registration (email + password only)
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/auth/logout/` - User logout
- `POST /api/v1/auth/token/refresh/` - Refresh JWT token
- `GET /api/v1/auth/profile/` - Get user profile

### Users
- `GET /api/v1/users/` - List users
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/{id}/` - Get user details
- `PUT /api/v1/users/{id}/` - Update user
- `DELETE /api/v1/users/{id}/` - Delete user
- `GET /api/v1/users/me/` - Get current user
- `PATCH /api/v1/users/me/` - Update current user

### Documentation
- `/api/docs/` - Swagger UI
- `/api/redoc/` - ReDoc
- `/api/schema/` - OpenAPI schema

### Health & Monitoring
- `/health/` - Health check endpoint
- `/admin/` - Django admin panel

## 🔐 Environment Variables

### Required for Production

```bash
# Django
SECRET_KEY=your-super-secret-key
DJANGO_ENVIRONMENT=prod
ALLOWED_HOSTS=prod.fulfillx.app

# Database
DB_NAME=infiora
DB_USER=postgres
DB_PASSWORD=secure-password
DB_HOST=db
DB_PORT=5432

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=infiora-prod
AWS_S3_REGION_NAME=eu-central-1

# Security
CORS_ALLOWED_ORIGINS=https://prod.fulfillx.app
```

## 🚀 Deployment

### Production Environment

The application is deployed to: **https://prod.fulfillx.app**

**Deployment Process:**
1. Push to `main` branch triggers CI pipeline
2. After CI passes, CD pipeline builds and deploys
3. Zero-downtime deployment with health checks
4. Automatic rollback on failure

**Documentation:**
- **Prod Setup**: [docs/prod/README.md](docs/prod/README.md)
- **Server Setup**: [docs/prod/server.md](docs/prod/server.md)
- **Deployment Guide**: [docs/prod/deploy.md](docs/prod/deploy.md)

### CI/CD Pipelines

**Separate Workflows:**
- **CI Pipeline** (`.github/workflows/ci.yml`): Tests, linting, security scans
- **CD Pipeline** (`.github/workflows/cd.yml`): Build, deploy, health checks

**Required GitHub Secrets:**
```bash
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
EC2_HOST
EC2_USER
EC2_SSH_KEY
SECRET_KEY
DB_PASSWORD
# ... see prod docs for complete list
```

## 🧪 Testing

The project includes comprehensive testing:

```bash
# Run all tests
make test

# Run with coverage
make coverage

# Run specific test types
pytest src/tests/unit/           # Unit tests
pytest src/tests/integration/    # Integration tests

# Run with verbose output
pytest -v src/tests/
```

**Test Structure:**
- **Unit Tests**: `src/tests/unit/` - Test individual components
- **Integration Tests**: `src/tests/integration/` - Test API endpoints
- **Fixtures**: `src/fixtures/` - Sample data for testing
- **Configuration**: `src/tests/conftest.py` - Shared test configuration

## 📊 Monitoring & Logging

- **Application logs**: `/var/log/infiora/django.log`
- **Health check**: `GET /health/`
- **Sentry integration** for error tracking
- **CloudWatch** integration for metrics
- **Real-time monitoring** during deployment

## 🔒 Security Features

- JWT token authentication
- CORS configuration for prod domain
- Rate limiting on API endpoints
- Security headers via Nginx
- SSL/TLS termination
- Input validation and sanitization
- SQL injection protection
- XSS protection

## 🛡 Production Considerations

1. **SSL Certificates**: Configured for `prod.fulfillx.app`
2. **Database Backups**: Automated daily backups to S3
3. **Monitoring**: CloudWatch metrics and Sentry alerts
4. **Security Groups**: Properly configured AWS Security Groups
5. **S3 Integration**: Static and media files served from S3
6. **Zero-Downtime Deployment**: Blue-green deployment strategy

## 📚 Documentation

### Dev Documentation
- [Dev Guide](docs/dev/README.md) - Main dev guide
- [Setup Guide](docs/dev/setup.md) - Get started in 5 minutes
- [Testing Guide](docs/dev/testing.md) - Run tests with Docker
- [API Guide](docs/dev/api.md) - Test API endpoints

### Prod Documentation
- [Prod Guide](docs/prod/README.md) - Production overview
- [Server Setup](docs/prod/server.md) - Prepare your server
- [Deployment Guide](docs/prod/deploy.md) - Deploy step by step

### Code Quality
- **Black** for code formatting
- **isort** for import sorting
- **flake8** for linting
- **mypy** for type checking
- **pytest** for testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and quality checks (`make quality && make test`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

**Development Workflow:**
1. All PRs must pass CI pipeline
2. Code review required
3. Tests must maintain coverage
4. Documentation must be updated

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

**Dev Issues:**
- Email: dev@infiora.hr
- Documentation: [docs/dev/](docs/dev/)

**Prod Issues:**
- Email: ops@infiora.hr
- Documentation: [docs/prod/](docs/prod/)
- Monitoring: https://prod.fulfillx.app/health/

## 🔄 Changelog

### v1.0.0 (2024-01-01)
- Initial prod release
- User authentication system with JWT
- S3 integration for file storage
- Comprehensive CI/CD pipeline
- Production deployment to `prod.fulfillx.app`