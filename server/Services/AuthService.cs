using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _hasher;

    public AuthService(AppDbContext db, IPasswordHasher<User> hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public async Task<User?> RegisterAsync(string email, string password)
    {
        email = email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email))
            return null; // email already taken

        var user = new User { Email = email };
        user.PasswordHash = _hasher.HashPassword(user, password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task<User?> ValidateCredentialsAsync(string email, string password)
    {
        email = email.Trim().ToLowerInvariant();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
            return null;

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (result == PasswordVerificationResult.Failed)
            return null;

        // Upgrade the stored hash if the hashing parameters have changed.
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, password);
            await _db.SaveChangesAsync();
        }

        return user;
    }

    public Task<User?> GetByIdAsync(int id) =>
        _db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public async Task UpdateProfileAsync(User user, UpdateProfileRequest request)
    {
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Mobile = request.Mobile?.Trim();
        user.City = request.City?.Trim();
        user.JobTitle = request.JobTitle?.Trim();
        await _db.SaveChangesAsync();
    }
}
