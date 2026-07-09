using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Services;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IJobTitleRepository. Tenant scoping and soft-delete
// filtering are handled by the global query filter.
public class JobTitleRepository : IJobTitleRepository
{
    private readonly AppDbContext _db;
    private readonly ICodeGenerator _codes;

    public JobTitleRepository(AppDbContext db, ICodeGenerator codes)
    {
        _db = db;
        _codes = codes;
    }

    public Task<PagedResult<JobTitleListItem>> GetAll(DataTableRequest request, bool? isActive)
    {
        var query = _db.JobTitles.AsQueryable();

        if (isActive is bool active)
            query = query.Where(j => j.IsActive == active);

        return query
            .ToDataTable(request)
            .Searchable(term => j =>
                EF.Functions.ILike(j.Name, $"%{term}%") ||
                EF.Functions.ILike(j.Code, $"%{term}%") ||
                (j.Description != null && EF.Functions.ILike(j.Description, $"%{term}%")))
            .Sortable("name", (q, desc) => desc ? q.OrderByDescending(j => j.Name) : q.OrderBy(j => j.Name))
            .Sortable("code", (q, desc) => desc ? q.OrderByDescending(j => j.Code) : q.OrderBy(j => j.Code))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(j => j.IsActive) : q.OrderBy(j => j.IsActive))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(j => j.CreatedAt) : q.OrderBy(j => j.CreatedAt))
            .DefaultSort(q => q.OrderBy(j => j.Name))
            .ToPagedResultAsync(j => new JobTitleListItem(
                j.Id, j.Name, j.Code, j.Description, j.IsActive, j.CreatedAt, j.UpdatedAt));
    }

    public async Task<IReadOnlyList<JobTitleLookupItem>> SearchAsync(string? search)
    {
        var query = _db.JobTitles.Where(j => j.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = $"%{search.Trim()}%";
            query = query.Where(j => EF.Functions.ILike(j.Name, like) || EF.Functions.ILike(j.Code, like));
        }

        return await query
            .OrderBy(j => j.Name)
            .Take(20)
            .Select(j => new JobTitleLookupItem(j.Id, j.Name, j.Code))
            .ToListAsync();
    }

    public Task<JobTitle?> GetByIdAsync(int id) =>
        _db.JobTitles.FirstOrDefaultAsync(j => j.Id == id);

    public Task<JobTitleListItem?> GetRowAsync(int id) =>
        _db.JobTitles
            .Where(j => j.Id == id)
            .Select(j => new JobTitleListItem(
                j.Id, j.Name, j.Code, j.Description, j.IsActive, j.CreatedAt, j.UpdatedAt))
            .FirstOrDefaultAsync();

    public Task<bool> ExistsAsync(int id) =>
        _db.JobTitles.AnyAsync(j => j.Id == id);

    public async Task<JobTitle> Create(SaveJobTitleRequest request)
    {
        var jobTitle = new JobTitle { Code = await _codes.NextJobTitleCodeAsync() };
        ApplyRequest(jobTitle, request);
        _db.JobTitles.Add(jobTitle);
        await _db.SaveChangesAsync();
        return jobTitle;
    }

    public async Task Update(JobTitle jobTitle, SaveJobTitleRequest request)
    {
        ApplyRequest(jobTitle, request);
        await _db.SaveChangesAsync();
    }

    public async Task SoftDelete(JobTitle jobTitle)
    {
        jobTitle.IsDeleted = true;
        jobTitle.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // Code is generated once on create and is immutable thereafter.
    private static void ApplyRequest(JobTitle jobTitle, SaveJobTitleRequest request)
    {
        jobTitle.Name = request.Name.Trim();
        jobTitle.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        jobTitle.IsActive = request.IsActive;
    }
}
