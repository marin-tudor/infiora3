using Microsoft.AspNetCore.Mvc;

namespace InfioraApi.Api.Controllers;

public class HealthController : BaseApiController
{
    /// <summary>
    /// Health check endpoint.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        return Ok(new
        {
            Status = "Healthy",
            Timestamp = DateTime.UtcNow,
            Version = "1.0.0"
        });
    }
}
