using InfioraApi.Domain.Entities;
using InfioraApi.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InfioraApi.Infrastructure.Persistence;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await DbSet.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public async Task<User?> GetByRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        return await DbSet.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken, cancellationToken);
    }
}
