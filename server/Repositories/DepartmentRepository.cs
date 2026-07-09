using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Services;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IDepartmentRepository. Tenant scoping and soft-delete
// filtering are handled by the global query filter, so this focuses on
// query shaping (search/sort/paging), validation lookups and persistence.
public class DepartmentRepository : IDepartmentRepository
{
    private readonly AppDbContext _db;
    private readonly ICodeGenerator _codes;

    public DepartmentRepository(AppDbContext db, ICodeGenerator codes)
    {
        _db = db;
        _codes = codes;
    }

    public Task<PagedResult<DepartmentListItem>> GetAll(
        DataTableRequest request, bool? isActive, int? parentDepartmentId)
    {
        var query = _db.Departments.AsQueryable();

        if (isActive is bool active)
            query = query.Where(d => d.IsActive == active);
        if (parentDepartmentId is int parentId)
            query = query.Where(d => d.ParentDepartmentId == parentId);

        return query
            .ToDataTable(request)
            .Searchable(term => d =>
                EF.Functions.ILike(d.Name, $"%{term}%") ||
                EF.Functions.ILike(d.Code, $"%{term}%") ||
                (d.Description != null && EF.Functions.ILike(d.Description, $"%{term}%")))
            .Sortable("name", (q, desc) => desc ? q.OrderByDescending(d => d.Name) : q.OrderBy(d => d.Name))
            .Sortable("code", (q, desc) => desc ? q.OrderByDescending(d => d.Code) : q.OrderBy(d => d.Code))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(d => d.IsActive) : q.OrderBy(d => d.IsActive))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(d => d.CreatedAt) : q.OrderBy(d => d.CreatedAt))
            .DefaultSort(q => q.OrderBy(d => d.Name))
            .ToPagedResultAsync(d => new DepartmentListItem(
                d.Id,
                d.Name,
                d.Code,
                d.Description,
                d.ParentDepartmentId,
                d.ParentDepartment != null ? d.ParentDepartment.Name : null,
                d.ManagerEmployeeId,
                d.Manager != null ? d.Manager.User.FirstName + " " + d.Manager.User.LastName : null,
                d.IsActive,
                d.CreatedAt,
                d.UpdatedAt));
    }

    public async Task<IReadOnlyList<DepartmentLookupItem>> SearchAsync(string? search, int? excludeId = null)
    {
        var query = _db.Departments.Where(d => d.IsActive);

        if (excludeId is int id)
            query = query.Where(d => d.Id != id);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = $"%{search.Trim()}%";
            query = query.Where(d => EF.Functions.ILike(d.Name, like) || EF.Functions.ILike(d.Code, like));
        }

        return await query
            .OrderBy(d => d.Name)
            .Take(20)
            .Select(d => new DepartmentLookupItem(d.Id, d.Name, d.Code))
            .ToListAsync();
    }

    public Task<Department?> GetByIdAsync(int id) =>
        _db.Departments.FirstOrDefaultAsync(d => d.Id == id);

    public Task<DepartmentListItem?> GetRowAsync(int id) =>
        _db.Departments
            .Where(d => d.Id == id)
            .Select(d => new DepartmentListItem(
                d.Id,
                d.Name,
                d.Code,
                d.Description,
                d.ParentDepartmentId,
                d.ParentDepartment != null ? d.ParentDepartment.Name : null,
                d.ManagerEmployeeId,
                d.Manager != null ? d.Manager.User.FirstName + " " + d.Manager.User.LastName : null,
                d.IsActive,
                d.CreatedAt,
                d.UpdatedAt))
            .FirstOrDefaultAsync();

    public Task<bool> ExistsAsync(int id) =>
        _db.Departments.AnyAsync(d => d.Id == id);

    public async Task<bool> WouldCreateCycleAsync(int departmentId, int parentId)
    {
        // Walk up the proposed parent chain; a cycle exists if we reach the node
        // we're trying to reparent. Guard the loop with a hop cap for safety.
        var current = (int?)parentId;
        var hops = 0;
        while (current is int id && hops++ < 100)
        {
            if (id == departmentId)
                return true;
            current = await _db.Departments
                .Where(d => d.Id == id)
                .Select(d => d.ParentDepartmentId)
                .FirstOrDefaultAsync();
        }
        return false;
    }

    public async Task<Department> Create(SaveDepartmentRequest request)
    {
        var department = new Department { Code = await _codes.NextDepartmentCodeAsync() };
        ApplyRequest(department, request);
        _db.Departments.Add(department);
        await _db.SaveChangesAsync();
        return department;
    }

    public async Task Update(Department department, SaveDepartmentRequest request)
    {
        ApplyRequest(department, request);
        await _db.SaveChangesAsync();
    }

    public async Task SoftDelete(Department department)
    {
        department.IsDeleted = true;
        department.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // Code is generated once on create and is immutable thereafter.
    private static void ApplyRequest(Department department, SaveDepartmentRequest request)
    {
        department.Name = request.Name.Trim();
        department.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        department.ParentDepartmentId = request.ParentDepartmentId;
        department.ManagerEmployeeId = request.ManagerEmployeeId;
        department.IsActive = request.IsActive;
    }
}
