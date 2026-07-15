using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IOrganizationRepository — all organization
// query/persist logic lives here so controllers stay focused on HTTP concerns.
public class OrganizationRepository : IOrganizationRepository
{
    private readonly AppDbContext _db;

    public OrganizationRepository(AppDbContext db) => _db = db;

    public Task<PagedResult<OrganizationRow>> GetAll(DataTableRequest request) =>
        _db.Organizations
            .ToDataTable(request)
            .Searchable(term => o =>
                EF.Functions.ILike(o.Name, $"%{term}%") ||
                EF.Functions.ILike(o.Slug, $"%{term}%"))
            .Sortable("name", (q, desc) => desc ? q.OrderByDescending(o => o.Name) : q.OrderBy(o => o.Name))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(o => o.IsActive) : q.OrderBy(o => o.IsActive))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(o => o.CreatedAt) : q.OrderBy(o => o.CreatedAt))
            .DefaultSort(q => q.OrderBy(o => o.Name))
            .ToPagedResultAsync(o => new OrganizationRow(
                o.Id,
                o.Name,
                o.Slug,
                o.IsActive,
                o.SubscriptionTier,
                o.CreatedAt,
                o.Users.Count));

    public async Task<IReadOnlyList<OrganizationListItem>> SearchAsync(string? search)
    {
        var query = _db.Organizations.AsQueryable();

        // Optional server-side filter so the client can drive a typeahead lookup.
        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = $"%{search.Trim()}%";
            query = query.Where(o =>
                EF.Functions.ILike(o.Name, like) || EF.Functions.ILike(o.Slug, like));
        }

        return await query
            .OrderBy(o => o.Name)
            .Select(o => new OrganizationListItem(o.Id, o.Name, o.Slug, o.IsActive))
            .ToListAsync();
    }

    public Task<Organization?> GetByIdAsync(int id) =>
        _db.Organizations.FirstOrDefaultAsync(o => o.Id == id);

    public Task<OrganizationRow?> GetRowAsync(int id) =>
        _db.Organizations
            .Where(o => o.Id == id)
            .Select(o => new OrganizationRow(
                o.Id,
                o.Name,
                o.Slug,
                o.IsActive,
                o.SubscriptionTier,
                o.CreatedAt,
                o.Users.Count))
            .FirstOrDefaultAsync();

    public Task<bool> SlugExistsAsync(string slug) =>
        _db.Organizations.AnyAsync(o => o.Slug == slug);

    public async Task<Organization> Create(string name, string slug, string? subscriptionTier)
    {
        var organization = new Organization
        {
            Name = name,
            Slug = slug,
            SubscriptionTier = subscriptionTier,
            IsActive = true,
        };
        _db.Organizations.Add(organization);
        await _db.SaveChangesAsync();
        return organization;
    }

    public async Task Update(Organization organization, UpdateOrganizationRequest request)
    {
        organization.Name = request.Name.Trim();
        organization.IsActive = request.IsActive;
        organization.SubscriptionTier = string.IsNullOrWhiteSpace(request.SubscriptionTier)
            ? null
            : request.SubscriptionTier.Trim();
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAttendanceSettings(Organization organization, UpdateAttendanceSettingsRequest request)
    {
        organization.TimeZone = request.TimeZone.Trim();
        organization.WorkDays = WorkDaysExtensions.FromNames(request.WorkDays);
        organization.WorkdayStart = request.WorkdayStart;
        organization.WorkdayEnd = request.WorkdayEnd;
        organization.BreakMinutes = request.BreakMinutes;
        organization.FlagMissingPunches = request.FlagMissingPunches;
        await _db.SaveChangesAsync();
    }
}
