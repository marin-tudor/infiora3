# Architecture Overview

This project follows **Clean Architecture** (also known as Onion Architecture or Hexagonal Architecture). The goal is to create a system where business logic is independent of frameworks, databases, and external services.

## The Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
│            (Controllers, Middleware, Extensions)            │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                        │
│              (Services, DTOs, Interfaces)                   │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│        (Database, External Services, Repositories)          │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                           │
│              (Entities, Core Interfaces)                    │
└─────────────────────────────────────────────────────────────┘
```

## Layer Dependencies (Important!)

```
API → Application → Domain
API → Infrastructure → Domain
```

- **Domain** has NO dependencies (it's the core)
- **Application** depends only on Domain
- **Infrastructure** depends on Domain (implements its interfaces)
- **API** depends on Application and Infrastructure

## 1. Domain Layer (`src/Domain/`)

The **innermost layer** - contains enterprise business logic and entities.

### What belongs here:
- **Entities**: Core business objects (User, Order, Product, etc.)
- **Interfaces**: Contracts that other layers must implement
- **Value Objects**: Immutable objects defined by their properties
- **Domain Events**: Events that occur in the domain

### Example: User Entity
```csharp
public class User : BaseEntity
{
    public string Email { get; set; }
    public string PasswordHash { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public bool IsActive { get; set; }

    // Business logic can live here
    public string FullName => $"{FirstName} {LastName}".Trim();
}
```

### Why it matters:
- Domain never changes when you switch databases or frameworks
- It represents your business rules in pure C#
- Easy to test without mocking anything

---

## 2. Application Layer (`src/Application/`)

Contains **application-specific business logic** and orchestrates the flow of data.

### What belongs here:
- **Services**: Business logic that orchestrates domain entities
- **DTOs**: Data Transfer Objects for input/output
- **Interfaces**: Contracts for services
- **Exceptions**: Application-specific exceptions
- **Validators**: Input validation rules

### Example: AuthService
```csharp
public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        // 1. Get user from repository
        var user = await _unitOfWork.Users.GetByEmailAsync(request.Email);

        // 2. Verify password
        if (!BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid credentials");

        // 3. Generate tokens
        var token = _jwtService.GenerateAccessToken(user);

        // 4. Return response
        return new AuthResponse { AccessToken = token, ... };
    }
}
```

### Why it matters:
- Defines the "use cases" of your application
- Independent of how data is stored or presented
- DTOs ensure you only expose what's needed

---

## 3. Infrastructure Layer (`src/Infrastructure/`)

Contains implementations for external concerns - **databases, external APIs, file systems**.

### What belongs here:
- **DbContext**: EF Core database context
- **Repositories**: Data access implementations
- **External Services**: JWT service, Email service, etc.
- **Migrations**: Database schema changes

### Example: Repository Pattern
```csharp
public class UserRepository : Repository<User>, IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email)
    {
        return await DbSet.FirstOrDefaultAsync(u => u.Email == email);
    }
}
```

### Example: Unit of Work
```csharp
public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;

    public IUserRepository Users { get; }

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }
}
```

### Why it matters:
- Easy to swap PostgreSQL for SQL Server - just change the registration
- External services can be mocked for testing
- All "dirty" I/O operations are isolated here

---

## 4. API Layer (`src/Api/` + root files)

The **outermost layer** - handles HTTP requests and responses.

### What belongs here:
- **Controllers**: HTTP endpoints
- **Middleware**: Request/response pipeline (exception handling, logging)
- **Extensions**: Service registration helpers
- **Filters**: Action filters for cross-cutting concerns

### Example: Controller
```csharp
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(result));
    }
}
```

### Why it matters:
- Controllers are thin - they just delegate to services
- Easy to swap out for gRPC, GraphQL, or another transport
- Middleware handles cross-cutting concerns once

---

## Dependency Injection Flow

In `Program.cs`, services are registered in order:

```csharp
// 1. Application services (business logic)
builder.Services.AddApplicationServices();

// 2. Infrastructure services (database, external services)
builder.Services.AddInfrastructureServices(builder.Configuration);

// 3. Authentication
builder.Services.AddJwtAuthentication(builder.Configuration);
```

This ensures:
- Interfaces are registered before implementations
- Configuration is available when needed
- Services can depend on each other correctly

---

## Key Design Patterns Used

### 1. Repository Pattern
Abstracts data access behind interfaces.
```csharp
// Interface in Domain
public interface IUserRepository : IRepository<User> { }

// Implementation in Infrastructure
public class UserRepository : Repository<User>, IUserRepository { }
```

### 2. Unit of Work Pattern
Groups multiple repository operations into a single transaction.
```csharp
await _unitOfWork.Users.AddAsync(user);
await _unitOfWork.SaveChangesAsync(); // Single commit
```

### 3. Dependency Inversion
High-level modules don't depend on low-level modules. Both depend on abstractions.
```csharp
// AuthService depends on IUserRepository, not UserRepository
public AuthService(IUnitOfWork unitOfWork) { }
```

### 4. DTO Pattern
Never expose domain entities directly to the API.
```csharp
// Input DTO
public record LoginRequest { string Email; string Password; }

// Output DTO
public record AuthResponse { string AccessToken; string RefreshToken; }
```

---

## Benefits of This Architecture

1. **Testability**: Each layer can be tested in isolation
2. **Maintainability**: Changes in one layer rarely affect others
3. **Flexibility**: Easy to swap implementations (databases, services)
4. **Scalability**: Can split into microservices if needed
5. **Onboarding**: Clear structure helps new developers understand the codebase
