using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Onboardly.Server.Data;

namespace Onboardly.Server.Authorization;

public interface IUserAccessService
{
    Task<IReadOnlyCollection<string>> GetPermissionsAsync(int userId);
    Task<IReadOnlyCollection<string>> GetRolesAsync(int userId);
    void Invalidate(int userId);
}

// Resolves a user's effective roles/permissions from their assigned roles, with
// a short per-user cache so we don't hit the DB on every authorized request.
public class UserAccessService : IUserAccessService
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public UserAccessService(AppDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public Task<IReadOnlyCollection<string>> GetRolesAsync(int userId) =>
        _cache.GetOrCreateAsync($"roles:{userId}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheFor;
            var roles = await _db.Users
                .Where(u => u.Id == userId)
                .SelectMany(u => u.Roles.Select(r => r.Name))
                .ToListAsync();
            return (IReadOnlyCollection<string>)roles;
        })!;

    public Task<IReadOnlyCollection<string>> GetPermissionsAsync(int userId) =>
        _cache.GetOrCreateAsync($"perms:{userId}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheFor;
            var perms = await _db.Users
                .Where(u => u.Id == userId)
                .SelectMany(u => u.Roles.SelectMany(r => r.Permissions.Select(p => p.Name)))
                .Distinct()
                .ToListAsync();
            return (IReadOnlyCollection<string>)perms;
        })!;

    public void Invalidate(int userId)
    {
        _cache.Remove($"roles:{userId}");
        _cache.Remove($"perms:{userId}");
    }
}
