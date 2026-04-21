# Authentication

This document explains how JWT (JSON Web Token) authentication works in this project.

## Overview

The project uses **JWT Bearer Authentication** with **Refresh Tokens**:

- **Access Token**: Short-lived (60 min default), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Login/Register                                              │
│     ┌────────┐  email/password   ┌─────────┐                   │
│     │ Client │ ───────────────►  │   API   │                   │
│     └────────┘                   └─────────┘                   │
│         ▲                             │                         │
│         │    access_token +           │                         │
│         └─── refresh_token ───────────┘                         │
│                                                                 │
│  2. Use Access Token                                            │
│     ┌────────┐  Authorization:    ┌─────────┐                  │
│     │ Client │  Bearer <token>    │   API   │                  │
│     └────────┘ ──────────────────►└─────────┘                  │
│         ▲                             │                         │
│         │        Response             │                         │
│         └─────────────────────────────┘                         │
│                                                                 │
│  3. Token Expired? Refresh                                      │
│     ┌────────┐  access_token +    ┌─────────┐                  │
│     │ Client │  refresh_token     │   API   │                  │
│     └────────┘ ──────────────────►└─────────┘                  │
│         ▲                             │                         │
│         │    NEW access_token +       │                         │
│         └─── NEW refresh_token ───────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## What is a JWT?

A JWT consists of three parts separated by dots: `header.payload.signature`

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Header (Algorithm & Token Type)
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload (Claims)
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User ID
  "email": "john@example.com",
  "name": "John Doe",
  "jti": "unique-token-id",                       // Token ID
  "exp": 1516242622,                              // Expiration
  "iat": 1516239022                               // Issued at
}
```

### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret_key
)
```

---

## How It Works in This Project

### 1. Registration (`POST /api/auth/register`)

```csharp
public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
{
    // 1. Check if user exists
    var existingUser = await _unitOfWork.Users.GetByEmailAsync(request.Email);
    if (existingUser != null)
        throw new ConflictException("Email already exists");

    // 2. Create user with hashed password
    var user = new User
    {
        Email = request.Email,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
        FirstName = request.FirstName,
        LastName = request.LastName
    };

    // 3. Generate tokens
    var accessToken = _jwtService.GenerateAccessToken(user);
    var refreshToken = _jwtService.GenerateRefreshToken();

    // 4. Save refresh token to database
    user.RefreshToken = refreshToken;
    user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

    await _unitOfWork.Users.AddAsync(user);
    await _unitOfWork.SaveChangesAsync();

    // 5. Return tokens
    return new AuthResponse { AccessToken = accessToken, RefreshToken = refreshToken };
}
```

### 2. Login (`POST /api/auth/login`)

```csharp
public async Task<AuthResponse> LoginAsync(LoginRequest request)
{
    // 1. Find user
    var user = await _unitOfWork.Users.GetByEmailAsync(request.Email);
    if (user == null)
        throw new UnauthorizedException("Invalid credentials");

    // 2. Verify password
    if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        throw new UnauthorizedException("Invalid credentials");

    // 3. Check if active
    if (!user.IsActive)
        throw new ForbiddenException("Account deactivated");

    // 4. Generate new tokens
    var accessToken = _jwtService.GenerateAccessToken(user);
    var refreshToken = _jwtService.GenerateRefreshToken();

    // 5. Update refresh token in database
    user.RefreshToken = refreshToken;
    user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
    await _unitOfWork.SaveChangesAsync();

    return new AuthResponse { AccessToken = accessToken, RefreshToken = refreshToken };
}
```

### 3. Token Generation

```csharp
public string GenerateAccessToken(User user)
{
    var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        new Claim("name", user.FullName)
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
    var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: _issuer,
        audience: _audience,
        claims: claims,
        expires: DateTime.UtcNow.AddMinutes(_expirationMinutes),
        signingCredentials: credentials
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

### 4. Token Refresh (`POST /api/auth/refresh-token`)

```csharp
public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request)
{
    // 1. Validate expired access token (get claims without validating expiration)
    var principal = _jwtService.GetPrincipalFromExpiredToken(request.AccessToken);

    // 2. Get user from claims
    var userId = principal.FindFirst("sub")?.Value;
    var user = await _unitOfWork.Users.GetByIdAsync(Guid.Parse(userId));

    // 3. Validate refresh token
    if (user.RefreshToken != request.RefreshToken)
        throw new UnauthorizedException("Invalid refresh token");

    if (user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        throw new UnauthorizedException("Refresh token expired");

    // 4. Generate new tokens
    var newAccessToken = _jwtService.GenerateAccessToken(user);
    var newRefreshToken = _jwtService.GenerateRefreshToken();

    // 5. Update refresh token
    user.RefreshToken = newRefreshToken;
    user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
    await _unitOfWork.SaveChangesAsync();

    return new AuthResponse { AccessToken = newAccessToken, RefreshToken = newRefreshToken };
}
```

---

## Using Protected Endpoints

### Controller Setup

```csharp
[Authorize]  // Requires authentication
[HttpGet("me")]
public ActionResult GetCurrentUser()
{
    // User is authenticated here
    var userId = _currentUserService.UserId;
    var email = _currentUserService.Email;
    // ...
}
```

### Making Authenticated Requests

**Using cURL:**
```bash
curl http://localhost:5108/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Using JavaScript:**
```javascript
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

**Using C#:**
```csharp
client.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", accessToken);
```

---

## Password Security

Passwords are **never stored in plain text**. We use BCrypt:

```csharp
// Hashing (during registration)
var hash = BCrypt.Net.BCrypt.HashPassword(password);
// Stored: "$2a$11$K3g5...long hash..."

// Verification (during login)
var isValid = BCrypt.Net.BCrypt.Verify(password, storedHash);
```

**Why BCrypt?**
- Automatically generates unique salt per password
- Intentionally slow (prevents brute force)
- Industry standard for password hashing

---

## JWT Validation Configuration

In `ServiceCollectionExtensions.cs`:

```csharp
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,           // Check issuer matches
            ValidateAudience = true,         // Check audience matches
            ValidateLifetime = true,         // Check token not expired
            ValidateIssuerSigningKey = true, // Verify signature
            ValidIssuer = "InfioraApi",
            ValidAudience = "InfioraApi",
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero        // No tolerance for expiration
        };
    });
```

---

## CurrentUserService

Access the authenticated user anywhere via DI:

```csharp
public interface ICurrentUserService
{
    Guid? UserId { get; }      // Current user's ID
    string? Email { get; }     // Current user's email
    bool IsAuthenticated { get; }
}
```

**Usage:**
```csharp
public class SomeService
{
    private readonly ICurrentUserService _currentUser;

    public void DoSomething()
    {
        if (!_currentUser.IsAuthenticated)
            throw new UnauthorizedException();

        var userId = _currentUser.UserId;
        // Use userId for data access
    }
}
```

---

## Security Considerations

### 1. Secret Key Security
- Use at least 32 characters
- Different keys per environment
- Never commit to source control
- Rotate periodically

### 2. Token Lifetimes
- Access tokens: Short (15-60 minutes)
- Refresh tokens: Longer (7-30 days)
- Balance security vs. user experience

### 3. HTTPS Required
- Never transmit tokens over HTTP
- Configure HTTPS redirection in production

### 4. Token Storage (Client-Side)
| Storage | Pros | Cons |
|---------|------|------|
| Memory | Safest | Lost on refresh |
| HttpOnly Cookie | Safe from XSS | Vulnerable to CSRF |
| localStorage | Persistent | Vulnerable to XSS |

**Recommendation:** Store in memory, use refresh token from HttpOnly cookie.

### 5. Logout Best Practices
- Revoke refresh token on logout
- Client should delete stored access token
- Consider token blacklist for critical applications

---

## Common Issues

### "401 Unauthorized"
- Token expired → refresh it
- Token malformed → check Authorization header format
- Invalid signature → check secret key matches

### "Token validation failed"
- Issuer/Audience mismatch
- Clock skew between servers
- Secret key mismatch

### Testing in Swagger
1. Login to get token
2. Click "Authorize" button
3. Enter: `Bearer <your-token>` (include "Bearer " prefix)
4. Now protected endpoints work
