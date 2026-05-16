using System.Text;
using InfioraApi.Application.Interfaces;
using InfioraApi.Application.Services;
using InfioraApi.Domain.Interfaces;
using InfioraApi.Infrastructure.Persistence;
using InfioraApi.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace InfioraApi.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }

    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var databaseProvider = configuration["DatabaseProvider"] ?? "InMemory";
        var environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? Environments.Production;

        if (!environment.Equals(Environments.Development, StringComparison.OrdinalIgnoreCase)
            && databaseProvider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("InMemory database is only allowed in development.");
        }

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            switch (databaseProvider.ToLowerInvariant())
            {
                case "postgresql":
                case "postgres":
                    var connectionString = configuration.GetConnectionString("DefaultConnection")
                        ?? throw new InvalidOperationException("PostgreSQL connection string is not configured.");
                    options.UseNpgsql(connectionString);
                    break;
                default:
                    options.UseInMemoryDatabase("InfioraDb");
                    break;
            }
        });

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IDateTimeService, DateTimeService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var secretKey = configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey is not configured.");
        var environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? Environments.Production;

        if (!environment.Equals(Environments.Development, StringComparison.OrdinalIgnoreCase)
            && (secretKey.Length < 32 || secretKey.Contains("ChangeMe", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("A strong JWT SecretKey is required outside development.");
        }

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = configuration["Jwt:Issuer"],
                ValidAudience = configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ClockSkew = TimeSpan.Zero
            };
        });

        services.AddAuthorization();
        return services;
    }

    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Infiora API",
                Version = "v1",
                Description = "A professional ASP.NET Core Web API with JWT Authentication",
                Contact = new OpenApiContact
                {
                    Name = "Infiora Team"
                }
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter your JWT token in the format: {your token}"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }
}
