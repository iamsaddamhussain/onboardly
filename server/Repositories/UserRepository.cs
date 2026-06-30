using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IUserRepository — all query/sort/persist logic for
// users lives here so controllers stay focused on HTTP concerns.
public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _hasher;

    public UserRepository(AppDbContext db, IPasswordHasher<User> hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public Task<PagedResult<UserListItem>> GetAll(DataTableRequest request) =>
        _db.Users
            .ToDataTable(request)
            .Searchable(term =>
            {
                var like = $"%{term}%";
                return u =>
                    EF.Functions.ILike(u.FirstName, like) ||
                    EF.Functions.ILike(u.LastName, like) ||
                    EF.Functions.ILike(u.Email, like) ||
                    (u.City != null && EF.Functions.ILike(u.City, like)) ||
                    (u.JobTitle != null && EF.Functions.ILike(u.JobTitle, like)) ||
                    (u.Mobile != null && EF.Functions.ILike(u.Mobile, like));
            })
            .Sortable("name", (q, desc) => desc
                ? q.OrderByDescending(u => u.FirstName).ThenByDescending(u => u.LastName)
                : q.OrderBy(u => u.FirstName).ThenBy(u => u.LastName))
            .Sortable("email", (q, desc) => desc ? q.OrderByDescending(u => u.Email) : q.OrderBy(u => u.Email))
            .Sortable("city", (q, desc) => desc ? q.OrderByDescending(u => u.City) : q.OrderBy(u => u.City))
            .Sortable("jobtitle", (q, desc) => desc ? q.OrderByDescending(u => u.JobTitle) : q.OrderBy(u => u.JobTitle))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(u => u.IsActive) : q.OrderBy(u => u.IsActive))
            .Sortable("joined", (q, desc) => desc ? q.OrderByDescending(u => u.CreatedAt) : q.OrderBy(u => u.CreatedAt))
            .DefaultSort(q => q.OrderByDescending(u => u.CreatedAt))
            .ToPagedResultAsync(u => new UserListItem(
                u.Id, u.FirstName, u.LastName, u.Email,
                u.Mobile, u.City, u.JobTitle, u.IsActive, u.CreatedAt,
                u.Roles.Select(r => r.Id).ToArray()));

    public Task<User?> GetById(int id) =>
        _db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByIdWithRoles(int id) =>
        _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id);

    public async Task SetRoles(User user, int[] roleIds)
    {
        var roles = await _db.Roles.Where(r => roleIds.Contains(r.Id)).ToListAsync();
        user.Roles.Clear();
        foreach (var role in roles)
            user.Roles.Add(role);
        await _db.SaveChangesAsync();
    }

    public async Task<User> Create(SaveUserRequest request)
    {
        var user = new User();
        ApplyRequest(user, request);
        // Password presence is validated by the controller before we get here.
        user.PasswordHash = _hasher.HashPassword(user, request.Password!);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task Update(User user, SaveUserRequest request)
    {
        ApplyRequest(user, request);

        // A password is optional on update; only change it when one is supplied
        // (its length is already validated by the attribute when present).
        if (!string.IsNullOrEmpty(request.Password))
            user.PasswordHash = _hasher.HashPassword(user, request.Password);

        await _db.SaveChangesAsync();
    }

    public async Task Delete(User user)
    {
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }

    public Task<bool> EmailExistsAsync(string email, int? excludeId = null) =>
        _db.Users.AnyAsync(u => u.Email == email && (excludeId == null || u.Id != excludeId));

    // Copy the request's editable fields onto a User entity (shared by create
    // and update).
    private static void ApplyRequest(User user, SaveUserRequest request)
    {
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Email = request.Email.Trim().ToLowerInvariant();
        user.Mobile = request.Mobile?.Trim();
        user.City = request.City?.Trim();
        user.JobTitle = request.JobTitle?.Trim();
        user.IsActive = request.IsActive;
    }
}
