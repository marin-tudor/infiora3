# Configuration

This document explains all configuration options and how ASP.NET Core handles configuration.

## Configuration Sources (Priority Order)

ASP.NET Core loads configuration from multiple sources. **Later sources override earlier ones:**

1. `appsettings.json` (base settings)
2. `appsettings.{Environment}.json` (environment-specific)
3. Environment variables
4. Command-line arguments

### Example Override Flow

```
appsettings.json:           Jwt:SecretKey = "base-secret"
appsettings.Development.json: Jwt:SecretKey = "dev-secret"     ← overrides
Environment variable:        Jwt__SecretKey = "env-secret"     ← overrides
Command line:               --Jwt:SecretKey="cli-secret"       ← final value
```

---

## Configuration Files

### `appsettings.json`

Base configuration for all environments:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "DatabaseProvider": "InMemory",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=infioradb;Username=infiora;Password=your_password"
  },
  "Jwt": {
    "SecretKey": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!",
    "Issuer": "InfioraApi",
    "Audience": "InfioraApi",
    "ExpirationMinutes": 60
  }
}
```

### `appsettings.Development.json`

Overrides for local development:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information",
      "Microsoft.EntityFrameworkCore": "Information"
    }
  },
  "DatabaseProvider": "InMemory",
  "Jwt": {
    "SecretKey": "DevSecretKeyThatIsAtLeast32CharactersLongForTesting!"
  }
}
```

---

## Environment Variables

For production/Docker, use environment variables instead of files.

### Naming Convention

JSON paths become double-underscore separated:

| JSON Path | Environment Variable |
|-----------|---------------------|
| `Jwt:SecretKey` | `Jwt__SecretKey` |
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` |
| `DatabaseProvider` | `DatabaseProvider` |

### All Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ASPNETCORE_ENVIRONMENT` | Environment name | `Production` |
| `DatabaseProvider` | `InMemory` or `PostgreSQL` | `InMemory` |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string | - |
| `Jwt__SecretKey` | JWT signing key (min 32 chars) | - |
| `Jwt__Issuer` | Token issuer | `InfioraApi` |
| `Jwt__Audience` | Token audience | `InfioraApi` |
| `Jwt__ExpirationMinutes` | Token lifetime | `60` |

### Setting Environment Variables

**Linux/macOS:**
```bash
export Jwt__SecretKey="your-production-secret-key-here"
export DatabaseProvider="PostgreSQL"
dotnet run
```

**Windows (PowerShell):**
```powershell
$env:Jwt__SecretKey="your-production-secret-key-here"
$env:DatabaseProvider="PostgreSQL"
dotnet run
```

**Windows (CMD):**
```cmd
set Jwt__SecretKey=your-production-secret-key-here
set DatabaseProvider=PostgreSQL
dotnet run
```

---

## Configuration Sections Explained

### Logging

```json
"Logging": {
  "LogLevel": {
    "Default": "Information",           // All loggers
    "Microsoft.AspNetCore": "Warning",  // Framework logs
    "Microsoft.EntityFrameworkCore": "Warning"  // EF Core logs
  }
}
```

**Log Levels (from most to least verbose):**
1. `Trace` - Most detailed
2. `Debug` - Debugging info
3. `Information` - General flow
4. `Warning` - Unexpected behavior
5. `Error` - Errors that don't crash
6. `Critical` - Crashes
7. `None` - Disabled

### DatabaseProvider

```json
"DatabaseProvider": "InMemory"
```

| Value | Description |
|-------|-------------|
| `InMemory` | In-memory database (data lost on restart) |
| `PostgreSQL` or `Postgres` | PostgreSQL database |

### ConnectionStrings

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=infioradb;Username=infiora;Password=your_password"
}
```

**PostgreSQL Connection String Format:**
```
Host=<hostname>;Port=<port>;Database=<dbname>;Username=<user>;Password=<password>
```

| Parameter | Description |
|-----------|-------------|
| Host | Database server hostname |
| Port | PostgreSQL port (default: 5432) |
| Database | Database name |
| Username | PostgreSQL user |
| Password | User password |

### JWT Configuration

```json
"Jwt": {
  "SecretKey": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!",
  "Issuer": "InfioraApi",
  "Audience": "InfioraApi",
  "ExpirationMinutes": 60
}
```

| Setting | Description | Requirements |
|---------|-------------|--------------|
| SecretKey | Signing key | Min 32 characters, keep secret! |
| Issuer | Token issuer claim | Usually your app name |
| Audience | Token audience claim | Usually your app name |
| ExpirationMinutes | Access token lifetime | In minutes |

---

## `.env` File (Docker)

For Docker Compose, create a `.env` file:

```env
# Application
ASPNETCORE_ENVIRONMENT=Development

# Database
DATABASE_PROVIDER=PostgreSQL
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=infioradb
POSTGRES_USER=infiora
POSTGRES_PASSWORD=YourSecurePassword123!

# JWT Configuration
JWT_SECRET_KEY=YourProductionSecretKeyThatIsAtLeast32Characters!
JWT_ISSUER=InfioraApi
JWT_AUDIENCE=InfioraApi
JWT_EXPIRATION_MINUTES=60
```

**Important:** Never commit `.env` to git! Use `.env.example` as a template.

---

## Accessing Configuration in Code

### In Services (via DI)

```csharp
public class JwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public void SomeMethod()
    {
        // Single value
        var secretKey = _configuration["Jwt:SecretKey"];

        // With default
        var expiration = _configuration.GetValue<int>("Jwt:ExpirationMinutes", 60);

        // Connection string
        var connString = _configuration.GetConnectionString("DefaultConnection");
    }
}
```

### Using Options Pattern (Recommended for complex config)

1. Create options class:
```csharp
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string SecretKey { get; set; }
    public string Issuer { get; set; }
    public string Audience { get; set; }
    public int ExpirationMinutes { get; set; }
}
```

2. Register in Program.cs:
```csharp
builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection(JwtOptions.SectionName));
```

3. Inject and use:
```csharp
public class JwtService
{
    private readonly JwtOptions _options;

    public JwtService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public void SomeMethod()
    {
        var key = _options.SecretKey;
    }
}
```

---

## Environment-Specific Behavior

### Development (`ASPNETCORE_ENVIRONMENT=Development`)
- Swagger UI enabled
- Detailed error pages
- More verbose logging

### Production (`ASPNETCORE_ENVIRONMENT=Production`)
- Swagger UI disabled
- Generic error messages
- Less verbose logging
- HTTPS enforced

### How to Set Environment

**Local:**
```bash
ASPNETCORE_ENVIRONMENT=Development dotnet run
```

**launchSettings.json:**
```json
"environmentVariables": {
  "ASPNETCORE_ENVIRONMENT": "Development"
}
```

**Docker:**
```yaml
environment:
  - ASPNETCORE_ENVIRONMENT=Production
```

---

## Security Best Practices

1. **Never commit secrets** - Use environment variables or secret managers
2. **Different keys per environment** - Dev, staging, prod should have different JWT keys
3. **Use strong passwords** - Database passwords should be complex
4. **Rotate secrets regularly** - Especially JWT keys
5. **Use HTTPS in production** - Required for secure cookie/header transmission

### Secret Management Options

| Option | Use Case |
|--------|----------|
| Environment variables | Docker, simple deployments |
| Azure Key Vault | Azure deployments |
| AWS Secrets Manager | AWS deployments |
| HashiCorp Vault | Multi-cloud or on-prem |
| dotnet user-secrets | Local development only |

### Using User Secrets (Local Dev)

```bash
# Initialize
dotnet user-secrets init

# Set a secret
dotnet user-secrets set "Jwt:SecretKey" "my-local-secret-key"

# List secrets
dotnet user-secrets list
```

Secrets are stored outside the project and never committed.
