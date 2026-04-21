using InfioraApi.Application.Interfaces;

namespace InfioraApi.Infrastructure.Services;

public class DateTimeService : IDateTimeService
{
    public DateTime UtcNow => DateTime.UtcNow;
}
