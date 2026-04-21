using InfioraApi.Application.DTOs.Auth;
using InfioraApi.Application.Exceptions;
using InfioraApi.Application.Interfaces;
using InfioraApi.Domain.Entities;
using InfioraApi.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace InfioraApi.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IDateTimeService _dateTimeService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUnitOfWork unitOfWork,
        IJwtService jwtService,
        IDateTimeService dateTimeService,
        ILogger<AuthService> logger)
    {
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _dateTimeService = dateTimeService;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var existingUser = await _unitOfWork.Users.GetByEmailAsync(request.Email.ToLowerInvariant(), cancellationToken);
        if (existingUser is not null)
        {
            throw new ConflictException("A user with this email already exists.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            IsActive = true,
            CreatedAt = _dateTimeService.UtcNow
        };

        var refreshToken = _jwtService.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = _dateTimeService.UtcNow.AddDays(7);

        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("User {Email} registered successfully", user.Email);

        return CreateAuthResponse(user, refreshToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(request.Email.ToLowerInvariant(), cancellationToken);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new ForbiddenException("This account has been deactivated.");
        }

        var refreshToken = _jwtService.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = _dateTimeService.UtcNow.AddDays(7);
        user.UpdatedAt = _dateTimeService.UtcNow;

        await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("User {Email} logged in successfully", user.Email);

        return CreateAuthResponse(user, refreshToken);
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var principal = _jwtService.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal is null)
        {
            throw new UnauthorizedException("Invalid access token.");
        }

        var userIdClaim = principal.FindFirst("sub")?.Value ?? principal.FindFirst("nameid")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedException("Invalid token claims.");
        }

        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user is null || user.RefreshToken != request.RefreshToken || user.RefreshTokenExpiryTime <= _dateTimeService.UtcNow)
        {
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }

        var newRefreshToken = _jwtService.GenerateRefreshToken();
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = _dateTimeService.UtcNow.AddDays(7);
        user.UpdatedAt = _dateTimeService.UtcNow;

        await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Token refreshed for user {Email}", user.Email);

        return CreateAuthResponse(user, newRefreshToken);
    }

    public async Task RevokeRefreshTokenAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            throw new NotFoundException("User", userId);
        }

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        user.UpdatedAt = _dateTimeService.UtcNow;

        await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Refresh token revoked for user {Email}", user.Email);
    }

    private AuthResponse CreateAuthResponse(User user, string refreshToken)
    {
        return new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            AccessToken = _jwtService.GenerateAccessToken(user),
            RefreshToken = refreshToken,
            ExpiresAt = _jwtService.GetAccessTokenExpiration()
        };
    }
}
