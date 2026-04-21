using Microsoft.AspNetCore.Mvc;

namespace InfioraApi.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class BaseApiController : ControllerBase
{
}
