# Development Guide

A practical guide for developing with this project.

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional)
- IDE: [VS Code](https://code.visualstudio.com/), [Visual Studio](https://visualstudio.microsoft.com/), or [Rider](https://www.jetbrains.com/rider/)

### VS Code Extensions
- C# Dev Kit
- REST Client (for `.http` files)
- Docker

---

## Getting Started

### 1. Clone and Run

```bash
# Navigate to project
cd InfioraApi

# Restore packages
dotnet restore

# Run (uses InMemory database by default)
dotnet run
```

### 2. Open Swagger UI

Navigate to http://localhost:5108

### 3. Test the API

Using the `.http` file or Swagger:

1. Register a user
2. Login to get tokens
3. Use token to access protected endpoints

---

## Development Workflow

### Making Changes

```bash
# 1. Make your code changes

# 2. Build to check for errors
dotnet build

# 3. Run and test
dotnet run

# 4. Run with hot reload (auto-restart on changes)
dotnet watch run
```

### Hot Reload

```bash
dotnet watch run
```

Changes to `.cs` files automatically restart the app.

---

## Adding New Features

### Example: Adding a "Products" Module

#### Step 1: Domain Layer

Create `src/Domain/Entities/Product.cs`:
```csharp
namespace InfioraApi.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public bool IsActive { get; set; } = true;
}
```

Create `src/Domain/Interfaces/IProductRepository.cs`:
```csharp
namespace InfioraApi.Domain.Interfaces;

public interface IProductRepository : IRepository<Product>
{
    Task<IEnumerable<Product>> GetActiveProductsAsync(CancellationToken ct = default);
}
```

#### Step 2: Application Layer

Create `src/Application/DTOs/Product/ProductDto.cs`:
```csharp
namespace InfioraApi.Application.DTOs.Product;

public record ProductDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public decimal Price { get; init; }
    public int StockQuantity { get; init; }
}

public record CreateProductRequest
{
    [Required, MaxLength(200)]
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    [Range(0.01, double.MaxValue)]
    public decimal Price { get; init; }
    [Range(0, int.MaxValue)]
    public int StockQuantity { get; init; }
}
```

Create `src/Application/Interfaces/IProductService.cs`:
```csharp
namespace InfioraApi.Application.Interfaces;

public interface IProductService
{
    Task<IEnumerable<ProductDto>> GetAllAsync(CancellationToken ct = default);
    Task<ProductDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default);
}
```

Create `src/Application/Services/ProductService.cs`:
```csharp
namespace InfioraApi.Application.Services;

public class ProductService : IProductService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProductService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            StockQuantity = request.StockQuantity,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Products.AddAsync(product, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return MapToDto(product);
    }

    private static ProductDto MapToDto(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Description = p.Description,
        Price = p.Price,
        StockQuantity = p.StockQuantity
    };
}
```

#### Step 3: Infrastructure Layer

Create `src/Infrastructure/Persistence/ProductRepository.cs`:
```csharp
namespace InfioraApi.Infrastructure.Persistence;

public class ProductRepository : Repository<Product>, IProductRepository
{
    public ProductRepository(ApplicationDbContext context) : base(context) { }

    public async Task<IEnumerable<Product>> GetActiveProductsAsync(CancellationToken ct)
    {
        return await DbSet.Where(p => p.IsActive).ToListAsync(ct);
    }
}
```

Update `ApplicationDbContext.cs`:
```csharp
public DbSet<Product> Products => Set<Product>();

// In OnModelCreating:
modelBuilder.Entity<Product>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
    entity.Property(e => e.Price).HasPrecision(18, 2);
});
```

Update `IUnitOfWork.cs` and `UnitOfWork.cs`:
```csharp
// Interface
IProductRepository Products { get; }

// Implementation
private IProductRepository? _products;
public IProductRepository Products => _products ??= new ProductRepository(_context);
```

#### Step 4: API Layer

Create `src/Api/Controllers/ProductsController.cs`:
```csharp
namespace InfioraApi.Api.Controllers;

public class ProductsController : BaseApiController
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<ProductDto>>>> GetAll(CancellationToken ct)
    {
        var products = await _productService.GetAllAsync(ct);
        return Ok(ApiResponse<IEnumerable<ProductDto>>.SuccessResponse(products));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create(
        CreateProductRequest request, CancellationToken ct)
    {
        var product = await _productService.CreateAsync(request, ct);
        return Ok(ApiResponse<ProductDto>.SuccessResponse(product, "Product created."));
    }
}
```

#### Step 5: Register Services

In `ServiceCollectionExtensions.cs`:
```csharp
public static IServiceCollection AddApplicationServices(this IServiceCollection services)
{
    services.AddScoped<IAuthService, AuthService>();
    services.AddScoped<IProductService, ProductService>();  // Add this
    return services;
}
```

#### Step 6: Test

```bash
dotnet build
dotnet run
```

---

## Testing with .http Files

The `InfioraApi.http` file lets you test endpoints directly from VS Code:

```http
@baseUrl = http://localhost:5108/api

### Register
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!",
  "firstName": "Test",
  "lastName": "User"
}

### Login
# @name login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!"
}

### Use token from login response
@token = {{login.response.body.data.accessToken}}

### Protected endpoint
GET {{baseUrl}}/auth/me
Authorization: Bearer {{token}}
```

Click "Send Request" above each request to execute.

---

## Debugging

### VS Code

1. Open Command Palette (`Cmd+Shift+P`)
2. Select "Debug: Start Debugging"
3. Set breakpoints by clicking left of line numbers

### Visual Studio

1. Press F5 or click "Start Debugging"
2. Set breakpoints

### Rider

1. Click the green bug icon
2. Set breakpoints

### Debug Logging

```csharp
// Inject ILogger
private readonly ILogger<AuthService> _logger;

// Use it
_logger.LogDebug("User {Email} attempting login", request.Email);
_logger.LogInformation("User {Email} logged in", user.Email);
_logger.LogWarning("Failed login attempt for {Email}", request.Email);
_logger.LogError(ex, "Error during login for {Email}", request.Email);
```

---

## Code Style Guidelines

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Class | PascalCase | `UserService` |
| Interface | IPascalCase | `IUserService` |
| Method | PascalCase | `GetUserAsync` |
| Property | PascalCase | `FirstName` |
| Private field | _camelCase | `_userRepository` |
| Parameter | camelCase | `userId` |
| Constant | PascalCase | `MaxRetries` |

### File Organization

- One class per file (usually)
- Filename matches class name
- Group related files in folders

### Async/Await

- Always use `async`/`await` for I/O operations
- Suffix async methods with `Async`
- Pass `CancellationToken` for cancellation support

```csharp
public async Task<User> GetUserAsync(Guid id, CancellationToken ct = default)
{
    return await _repository.GetByIdAsync(id, ct);
}
```

---

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :5108

# Kill it
kill -9 <PID>
```

### Package Restore Issues

```bash
dotnet nuget locals all --clear
dotnet restore
```

### Build Errors After Git Pull

```bash
dotnet clean
dotnet restore
dotnet build
```

---

## Useful Commands

```bash
# Build
dotnet build

# Run
dotnet run

# Run with hot reload
dotnet watch run

# Clean build artifacts
dotnet clean

# Restore packages
dotnet restore

# Run specific project
dotnet run --project InfioraApi.csproj

# Build for release
dotnet build -c Release

# Publish for deployment
dotnet publish -c Release -o ./publish

# Add package
dotnet add package <PackageName>

# Remove package
dotnet remove package <PackageName>

# List packages
dotnet list package

# Update packages
dotnet add package <PackageName> --version <Version>
```

---

## Next Steps

1. Read the [Architecture](./architecture.md) doc to understand the design
2. Try adding a new feature following the pattern above
3. Explore the [API Endpoints](./api-endpoints.md) documentation
4. Set up [Docker](./docker.md) for containerized development
