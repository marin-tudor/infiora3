# Multi-stage build for prod optimization
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Create and set work directory
WORKDIR /app

# Create non-root user
RUN groupadd -r django && useradd -r -g django django

# Copy requirements and install Python dependencies
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/base.txt

# Dev stage
FROM base as dev
RUN pip install --no-cache-dir -r requirements/dev.txt
COPY . .
RUN chown -R django:django /app
USER django
EXPOSE 8000
CMD ["python", "src/manage.py", "runserver", "0.0.0.0:8000"]

# Prod stage
FROM base as prod

# Install prod requirements only
RUN pip install --no-cache-dir -r requirements/prod.txt

# Copy application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/staticfiles /app/logs \
    && chown -R django:django /app

# Collect static files
RUN python src/manage.py collectstatic --noinput --settings=core.settings.prod || true

USER django

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

EXPOSE 8000

CMD ["gunicorn", "--chdir", "src", "--bind", "0.0.0.0:8000", "--workers", "3", "--worker-class", "gevent", "core.wsgi:application"]