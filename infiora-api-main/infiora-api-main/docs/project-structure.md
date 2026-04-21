# Project Structure

This document explains every folder and file in the project.

## Overview

```
InfioraApi/
├── src/                          # Source code (organized by layer)
│   ├── Domain/                   # Core business entities & interfaces
│   ├── Application/              # Business logic & use cases
│   ├── Infrastructure/           # External concerns (DB, services)
│   └── Api/                      # HTTP layer (controllers, middleware)
├── docs/                         # Documentation (you are here!)
├── Properties/                   # Launch settings
├── Program.cs                    # Application entry point
├── appsettings.json             # Configuration
├── appsettings.Development.json # Dev-specific config
├── InfioraApi.csproj            # Project file
├── Dockerfile                   # Container definition
├── docker-compose.yml           # Multi-container orchestration
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Template for .env
├── .gitignore                   # Git ignore rules
└── InfioraApi.http              # HTTP test file
```

---

## Detailed Breakdown

### `/src/Domain/` - The Core

```
Domain/
├── Entities/
│   ├── BaseEntity.cs      # Base class for all entities
│   └── User.cs            # User entity
└── Interfaces/
    ├── IRepository.cs     # Generic repository interface
    ├── IUserRepository.cs # User-specific repository
    └── IUnitOfWork.cs     # Unit of work pattern
```

#### `Entities/BaseEntity.cs`
```csharp
public abstract class BaseEntity
{
    public Guid Id { get; set; }           // Primary key
    public DateTime CreatedAt { get; set; } // Audit field
    public DateTime? UpdatedAt { get; set; } // Audit field
}
```
**Why?** All entities inherit this, ensuring consistent ID and audit fields.

#### `Entities/User.cs`
```csharp
public class User : BaseEntity
{
    public string Email { get; set; }
    public string PasswordHash { get; set; }  // Never store plain passwords!
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public bool IsActive { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
}
```
**Why?** The User entity represents a user in your system. RefreshToken fields support JWT refresh flow.

#### `Interfaces/IRepository.cs`
```csharp
public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    // ... more methods
}
```
**Why?** Generic interface for data access. Any entity can use these methods.

#### `Interfaces/IUnitOfWork.cs`
```csharp
public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    Task<int> SaveChangesAsync();
}
```
**Why?** Groups multiple operations into a single database transaction.

---

### `/src/Application/` - Business Logic

```
Application/
├── DTOs/
│   ├── Auth/
│   │   ├── RegisterRequest.cs
│   │   ├── LoginRequest.cs
│   │   ├── AuthResponse.cs
│   │   └── RefreshTokenRequest.cs
│   ├── Common/
│   │   └── ApiResponse.cs
│   └── User/
│       └── UserDto.cs
├── Exceptions/
│   └── AppException.cs
├── Interfaces/
│   ├── IAuthService.cs
│   ├── IJwtService.cs
│   ├── ICurrentUserService.cs
│   └── IDateTimeService.cs
└── Services/
    └── AuthService.cs
```

#### `DTOs/Auth/LoginRequest.cs`
```csharp
public record LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; init; }

    [Required]
    public string Password { get; init; }
}
```
**Why?** DTOs define what data comes IN to the API. Validation attributes ensure correct format.

#### `DTOs/Common/ApiResponse.cs`
```csharp
public record ApiResponse<T>
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public T? Data { get; init; }
    public IEnumerable<string>? Errors { get; init; }
}
```
**Why?** Consistent response format for all API endpoints. Frontend knows what to expect.

#### `Exceptions/AppException.cs`
```csharp
public class AppException : Exception
{
    public HttpStatusCode StatusCode { get; }
}

public class NotFoundException : AppException { }      // 404
public class UnauthorizedException : AppException { }  // 401
public class ConflictException : AppException { }      // 409
```
**Why?** Typed exceptions that the middleware converts to proper HTTP responses.

#### `Services/AuthService.cs`
```csharp
public class AuthService : IAuthService
{
    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        // 1. Find user
        // 2. Verify password
        // 3. Generate tokens
        // 4. Return response
    }
}
```
**Why?** Contains the business logic for authentication. Controllers just call this.

---

### `/src/Infrastructure/` - External Concerns

```
Infrastructure/
├── Persistence/
│   ├── ApplicationDbContext.cs
│   ├── Repository.cs
│   ├── UserRepository.cs
│   └── UnitOfWork.cs
└── Services/
    ├── JwtService.cs
    ├── DateTimeService.cs
    └── CurrentUserService.cs
```

#### `Persistence/ApplicationDbContext.cs`
```csharp
public class ApplicationDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure entity mappings
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            // ...
        });
    }
}
```
**Why?** EF Core's gateway to the database. Defines tables and relationships.

#### `Services/JwtService.cs`
```csharp
public class JwtService : IJwtService
{
    public string GenerateAccessToken(User user)
    {
        var claims = new[] { /* user claims */ };
        var token = new JwtSecurityToken(/* configuration */);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```
**Why?** Handles JWT token creation and validation. Encapsulates all JWT logic.

---

### `/src/Api/` - HTTP Layer

```
Api/
├── Controllers/
│   ├── BaseApiController.cs
│   ├── AuthController.cs
│   └── HealthController.cs
├── Middleware/
│   └── ExceptionHandlingMiddleware.cs
└── Extensions/
    ├── ServiceCollectionExtensions.cs
    └── ApplicationBuilderExtensions.cs
```

#### `Controllers/BaseApiController.cs`
```csharp
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class BaseApiController : ControllerBase { }
```
**Why?** All controllers inherit this. Sets common attributes once.

#### `Controllers/AuthController.cs`
```csharp
public class AuthController : BaseApiController
{
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(result));
    }
}
```
**Why?** Thin controller - just receives HTTP request and delegates to service.

#### `Middleware/ExceptionHandlingMiddleware.cs`
```csharp
public async Task InvokeAsync(HttpContext context)
{
    try
    {
        await _next(context);
    }
    catch (AppException ex)
    {
        // Convert to proper HTTP response
        context.Response.StatusCode = (int)ex.StatusCode;
        await context.Response.WriteAsJsonAsync(ApiResponse.FailureResponse(ex.Message));
    }
}
```
**Why?** Global exception handler. No try/catch needed in controllers.

#### `Extensions/ServiceCollectionExtensions.cs`
```csharp
public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
{
    services.AddDbContext<ApplicationDbContext>(...);
    services.AddScoped<IUnitOfWork, UnitOfWork>();
    // ...
}
```
**Why?** Organizes DI registration by concern. Keeps Program.cs clean.

---

### Root Files

#### `Program.cs`
```csharp
var builder = WebApplication.CreateBuilder(args);

// Register services
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddSwaggerDocumentation();

var app = builder.Build();

// Configure middleware pipeline
app.UseExceptionHandling();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```
**Why?** Entry point. Minimal code - just wires things together.

#### `appsettings.json`
```json
{
  "DatabaseProvider": "InMemory",
  "ConnectionStrings": {
    "DefaultConnection": "Host=...;Database=..."
  },
  "Jwt": {
    "SecretKey": "...",
    "Issuer": "InfioraApi",
    "Audience": "InfioraApi",
    "ExpirationMinutes": 60
  }
}
```
**Why?** Configuration that can change per environment.

#### `InfioraApi.http`
```http
### Login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```
**Why?** Test API endpoints directly from VS Code / Rider.

---

## Adding New Features

### Example: Adding a "Products" Module

1. **Domain**: Add `Product.cs` entity and `IProductRepository.cs`
2. **Application**: Add `ProductDto.cs`, `IProductService.cs`, `ProductService.cs`
3. **Infrastructure**: Add `ProductRepository.cs`, update `UnitOfWork.cs`
4. **API**: Add `ProductsController.cs`
5. **DI**: Register new services in `ServiceCollectionExtensions.cs`

The structure scales naturally!
