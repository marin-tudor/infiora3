# Database

This document covers Entity Framework Core setup and database operations.

## Overview

The project supports two database providers:

| Provider | Use Case | Data Persistence |
|----------|----------|------------------|
| InMemory | Local development, testing | Lost on restart |
| PostgreSQL | Docker, production | Persisted |

---

## Entity Framework Core Basics

EF Core is an **ORM (Object-Relational Mapper)** that lets you work with databases using C# objects instead of SQL.

### Key Concepts

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   C# Entity     │     │   DbContext     │     │   Database      │
│                 │ ──► │                 │ ──► │                 │
│   User.cs       │     │ ApplicationDb   │     │   users table   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

- **Entity**: C# class representing a database table
- **DbContext**: Gateway to the database
- **DbSet**: Represents a table you can query

---

## ApplicationDbContext

Located at `src/Infrastructure/Persistence/ApplicationDbContext.cs`:

```csharp
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Each DbSet = one table
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);                    // Primary key
            entity.HasIndex(e => e.Email).IsUnique();    // Unique index
            entity.Property(e => e.Email)
                .IsRequired()
                .HasMaxLength(256);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.FirstName)
                .IsRequired()
                .HasMaxLength(100);
        });
    }
}
```

### Configuration Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `HasKey()` | Set primary key | `entity.HasKey(e => e.Id)` |
| `HasIndex()` | Create index | `entity.HasIndex(e => e.Email)` |
| `IsUnique()` | Unique constraint | `.IsUnique()` |
| `IsRequired()` | NOT NULL | `entity.Property(e => e.Name).IsRequired()` |
| `HasMaxLength()` | Max string length | `.HasMaxLength(100)` |
| `HasDefaultValue()` | Default value | `.HasDefaultValue(true)` |

---

## Database Provider Selection

In `ServiceCollectionExtensions.cs`:

```csharp
public static IServiceCollection AddInfrastructureServices(
    this IServiceCollection services,
    IConfiguration configuration)
{
    var databaseProvider = configuration["DatabaseProvider"] ?? "InMemory";

    services.AddDbContext<ApplicationDbContext>(options =>
    {
        switch (databaseProvider.ToLowerInvariant())
        {
            case "postgresql":
            case "postgres":
                var connectionString = configuration
                    .GetConnectionString("DefaultConnection");
                options.UseNpgsql(connectionString);
                break;
            default:
                options.UseInMemoryDatabase("InfioraDb");
                break;
        }
    });

    return services;
}
```

---

## Migrations

Migrations track database schema changes over time.

### Create a Migration
```bash
dotnet ef migrations add InitialCreate
```

This creates files in a `Migrations/` folder.

### Apply Migrations
```bash
dotnet ef database update
```

### Auto-Migration (in Program.cs)
```csharp
if (!databaseProvider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();  // Apply pending migrations
}
```

### Common Migration Commands

```bash
# Add migration
dotnet ef migrations add <MigrationName>

# Apply migrations
dotnet ef database update

# Revert last migration
dotnet ef migrations remove

# Generate SQL script
dotnet ef migrations script

# List migrations
dotnet ef migrations list
```

---

## Repository Pattern

Abstracts data access behind interfaces.

### Generic Repository (`src/Infrastructure/Persistence/Repository.cs`)

```csharp
public class Repository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly ApplicationDbContext Context;
    protected readonly DbSet<T> DbSet;

    public Repository(ApplicationDbContext context)
    {
        Context = context;
        DbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(Guid id)
    {
        return await DbSet.FindAsync(id);
    }

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        return await DbSet.ToListAsync();
    }

    public async Task<T> AddAsync(T entity)
    {
        await DbSet.AddAsync(entity);
        return entity;
    }

    public Task UpdateAsync(T entity)
    {
        DbSet.Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity)
    {
        DbSet.Remove(entity);
        return Task.CompletedTask;
    }
}
```

### Specialized Repository (`UserRepository.cs`)

```csharp
public class UserRepository : Repository<User>, IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email)
    {
        return await DbSet.FirstOrDefaultAsync(u => u.Email == email);
    }
}
```

---

## Unit of Work Pattern

Groups multiple operations into a single transaction.

```csharp
public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private IUserRepository? _users;

    public IUserRepository Users => _users ??= new UserRepository(_context);

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }
}
```

### Usage in Services

```csharp
public class AuthService
{
    private readonly IUnitOfWork _unitOfWork;

    public async Task RegisterAsync(RegisterRequest request)
    {
        var user = new User { /* ... */ };

        // Add user (not saved yet)
        await _unitOfWork.Users.AddAsync(user);

        // Save all changes in one transaction
        await _unitOfWork.SaveChangesAsync();
    }
}
```

---

## Common EF Core Operations

### Query Data

```csharp
// Get by ID
var user = await _context.Users.FindAsync(id);

// Get all
var users = await _context.Users.ToListAsync();

// Filter
var activeUsers = await _context.Users
    .Where(u => u.IsActive)
    .ToListAsync();

// First or default
var user = await _context.Users
    .FirstOrDefaultAsync(u => u.Email == email);

// Check existence
var exists = await _context.Users
    .AnyAsync(u => u.Email == email);

// Count
var count = await _context.Users.CountAsync();

// Order
var users = await _context.Users
    .OrderBy(u => u.LastName)
    .ThenBy(u => u.FirstName)
    .ToListAsync();

// Pagination
var users = await _context.Users
    .Skip(pageIndex * pageSize)
    .Take(pageSize)
    .ToListAsync();
```

### Modify Data

```csharp
// Add
var user = new User { Name = "John" };
await _context.Users.AddAsync(user);
await _context.SaveChangesAsync();

// Update
user.Name = "Jane";
_context.Users.Update(user);
await _context.SaveChangesAsync();

// Delete
_context.Users.Remove(user);
await _context.SaveChangesAsync();
```

---

## Adding a New Entity

### 1. Create Entity (`src/Domain/Entities/Product.cs`)

```csharp
public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Description { get; set; }
}
```

### 2. Add DbSet to Context

```csharp
public class ApplicationDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();  // Add this

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure Product
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Price).HasPrecision(18, 2);
        });
    }
}
```

### 3. Create Repository Interface (`src/Domain/Interfaces/`)

```csharp
public interface IProductRepository : IRepository<Product>
{
    Task<IEnumerable<Product>> GetByPriceRangeAsync(decimal min, decimal max);
}
```

### 4. Implement Repository (`src/Infrastructure/Persistence/`)

```csharp
public class ProductRepository : Repository<Product>, IProductRepository
{
    public async Task<IEnumerable<Product>> GetByPriceRangeAsync(decimal min, decimal max)
    {
        return await DbSet
            .Where(p => p.Price >= min && p.Price <= max)
            .ToListAsync();
    }
}
```

### 5. Update Unit of Work

```csharp
public interface IUnitOfWork
{
    IUserRepository Users { get; }
    IProductRepository Products { get; }  // Add this
}
```

### 6. Create Migration

```bash
dotnet ef migrations add AddProduct
dotnet ef database update
```

---

## Connection Strings

### PostgreSQL
```
Host=localhost;Port=5432;Database=infioradb;Username=infiora;Password=secret
```

### SQL Server (if you add support)
```
Server=localhost;Database=InfioraDb;User Id=sa;Password=secret;TrustServerCertificate=True
```

### SQLite (if you add support)
```
Data Source=infiora.db
```

---

## Troubleshooting

### "No migrations found"
```bash
dotnet ef migrations add InitialCreate
```

### "Database already exists"
```bash
dotnet ef database drop
dotnet ef database update
```

### "Connection refused"
- Check database is running
- Verify connection string
- Check firewall/ports

### View Generated SQL
```csharp
services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(connectionString)
           .LogTo(Console.WriteLine, LogLevel.Information);  // Add this
});
```
