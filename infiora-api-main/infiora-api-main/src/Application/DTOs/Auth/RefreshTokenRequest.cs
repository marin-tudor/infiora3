using System.ComponentModel.DataAnnotations;

namespace InfioraApi.Application.DTOs.Auth;

public record RefreshTokenRequest
{
    [Required]
    public string AccessToken { get; init; } = string.Empty;

    [Required]
    public string RefreshToken { get; init; } = string.Empty;
}
