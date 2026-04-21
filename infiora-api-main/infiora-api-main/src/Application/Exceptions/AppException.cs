using System.Net;

namespace InfioraApi.Application.Exceptions;

public class AppException : Exception
{
    public HttpStatusCode StatusCode { get; }
    public IEnumerable<string>? Errors { get; }

    public AppException(string message, HttpStatusCode statusCode = HttpStatusCode.BadRequest, IEnumerable<string>? errors = null)
        : base(message)
    {
        StatusCode = statusCode;
        Errors = errors;
    }
}

public class NotFoundException : AppException
{
    public NotFoundException(string message)
        : base(message, HttpStatusCode.NotFound)
    {
    }

    public NotFoundException(string entityName, object key)
        : base($"{entityName} with key '{key}' was not found.", HttpStatusCode.NotFound)
    {
    }
}

public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message = "Unauthorized access.")
        : base(message, HttpStatusCode.Unauthorized)
    {
    }
}

public class ForbiddenException : AppException
{
    public ForbiddenException(string message = "Access denied.")
        : base(message, HttpStatusCode.Forbidden)
    {
    }
}

public class ConflictException : AppException
{
    public ConflictException(string message)
        : base(message, HttpStatusCode.Conflict)
    {
    }
}

public class ValidationException : AppException
{
    public ValidationException(string message, IEnumerable<string>? errors = null)
        : base(message, HttpStatusCode.BadRequest, errors)
    {
    }
}
