using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Services;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IEmployeeRepository. Tenant scoping and soft-delete
// filtering come from the global query filter; this owns query shaping, employee
// number generation, validation lookups and persistence.
public class EmployeeRepository : IEmployeeRepository
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ICodeGenerator _codes;

    public EmployeeRepository(AppDbContext db, ITenantContext tenant, ICodeGenerator codes)
    {
        _db = db;
        _tenant = tenant;
        _codes = codes;
    }

    public Task<PagedResult<EmployeeListItem>> GetAll(DataTableRequest request, EmployeeFilter filter)
    {
        var query = _db.Employees.AsQueryable();

        if (filter.DepartmentId is int departmentId)
            query = query.Where(e => e.DepartmentId == departmentId);
        if (filter.JobTitleId is int jobTitleId)
            query = query.Where(e => e.JobTitleId == jobTitleId);
        if (!string.IsNullOrWhiteSpace(filter.EmploymentStatus)
            && Enum.TryParse<EmploymentStatus>(filter.EmploymentStatus, ignoreCase: true, out var status))
            query = query.Where(e => e.EmploymentStatus == status);
        if (filter.ReportingManagerId is int managerId)
            query = query.Where(e => e.ReportingManagerId == managerId);
        if (filter.JoiningDateFrom is DateTime from)
            query = query.Where(e => e.JoiningDate >= from);
        if (filter.JoiningDateTo is DateTime to)
            query = query.Where(e => e.JoiningDate <= to);

        return query
            .ToDataTable(request)
            .Searchable(term =>
            {
                var like = $"%{term}%";
                return e =>
                    EF.Functions.ILike(e.EmployeeNumber, like) ||
                    EF.Functions.ILike(e.User.FirstName, like) ||
                    EF.Functions.ILike(e.User.LastName, like) ||
                    EF.Functions.ILike(e.User.Email, like) ||
                    (e.WorkEmail != null && EF.Functions.ILike(e.WorkEmail, like));
            })
            .Sortable("employeeNumber", (q, desc) => desc ? q.OrderByDescending(e => e.EmployeeNumber) : q.OrderBy(e => e.EmployeeNumber))
            .Sortable("name", (q, desc) => desc
                ? q.OrderByDescending(e => e.User.FirstName).ThenByDescending(e => e.User.LastName)
                : q.OrderBy(e => e.User.FirstName).ThenBy(e => e.User.LastName))
            .Sortable("email", (q, desc) => desc ? q.OrderByDescending(e => e.User.Email) : q.OrderBy(e => e.User.Email))
            .Sortable("joiningDate", (q, desc) => desc ? q.OrderByDescending(e => e.JoiningDate) : q.OrderBy(e => e.JoiningDate))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(e => e.EmploymentStatus) : q.OrderBy(e => e.EmploymentStatus))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(e => e.CreatedAt) : q.OrderBy(e => e.CreatedAt))
            .DefaultSort(q => q.OrderByDescending(e => e.CreatedAt))
            .ToPagedResultAsync(e => new EmployeeListItem(
                e.Id,
                e.EmployeeNumber,
                e.UserId,
                e.User.FirstName + " " + e.User.LastName,
                e.User.Email,
                e.DepartmentId,
                e.Department != null ? e.Department.Name : null,
                e.JobTitleId,
                e.JobTitle != null ? e.JobTitle.Name : null,
                e.ReportingManagerId,
                e.ReportingManager != null
                    ? e.ReportingManager.User.FirstName + " " + e.ReportingManager.User.LastName
                    : null,
                e.JoiningDate,
                e.EmploymentStatus.ToString(),
                e.EmploymentType.ToString(),
                e.WorkEmail,
                e.WorkPhone,
                e.CreatedAt,
                e.UpdatedAt));
    }

    public async Task<IReadOnlyList<EmployeeLookupItem>> SearchAsync(string? search, int? excludeId = null)
    {
        var query = _db.Employees.AsQueryable();

        if (excludeId is int id)
            query = query.Where(e => e.Id != id);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = $"%{search.Trim()}%";
            query = query.Where(e =>
                EF.Functions.ILike(e.EmployeeNumber, like) ||
                EF.Functions.ILike(e.User.FirstName, like) ||
                EF.Functions.ILike(e.User.LastName, like));
        }

        return await query
            .OrderBy(e => e.User.FirstName).ThenBy(e => e.User.LastName)
            .Take(20)
            .Select(e => new EmployeeLookupItem(
                e.Id, e.EmployeeNumber, e.User.FirstName + " " + e.User.LastName))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<AssignableUserItem>> AssignableUsersAsync(string? search, int? includeUserId = null)
    {
        // Employees only exist within a tenant, so a platform-wide session with no
        // active organization has no assignable pool.
        if (_tenant.OrganizationId is not int orgId)
            return Array.Empty<AssignableUserItem>();

        // Users already linked to a (live) employee are excluded so a user maps to
        // at most one employee — except the user currently linked to this record.
        var linkedUserIds = await _db.Employees
            .Select(e => e.UserId)
            .ToListAsync();

        var query = _db.Users.Where(u =>
            u.OrganizationId == orgId &&
            (!linkedUserIds.Contains(u.Id) || (includeUserId != null && u.Id == includeUserId)));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = $"%{search.Trim()}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.FirstName, like) ||
                EF.Functions.ILike(u.LastName, like) ||
                EF.Functions.ILike(u.Email, like));
        }

        return await query
            .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
            .Take(20)
            .Select(u => new AssignableUserItem(u.Id, u.FirstName + " " + u.LastName, u.Email))
            .ToListAsync();
    }

    public Task<Employee?> GetByIdAsync(int id) =>
        _db.Employees.FirstOrDefaultAsync(e => e.Id == id);

    public Task<EmployeeDetail?> GetDetailAsync(int id) =>
        _db.Employees
            .Where(e => e.Id == id)
            .Select(e => new EmployeeDetail(
                e.Id,
                e.EmployeeNumber,
                e.UserId,
                e.User.FirstName + " " + e.User.LastName,
                e.User.Email,
                e.DepartmentId,
                e.Department != null ? e.Department.Name : null,
                e.JobTitleId,
                e.JobTitle != null ? e.JobTitle.Name : null,
                e.ReportingManagerId,
                e.ReportingManager != null
                    ? e.ReportingManager.User.FirstName + " " + e.ReportingManager.User.LastName
                    : null,
                e.JoiningDate,
                e.EmploymentStatus.ToString(),
                e.EmploymentType.ToString(),
                e.WorkEmail,
                e.WorkPhone,
                e.Notes,
                e.CreatedAt,
                e.UpdatedAt))
            .FirstOrDefaultAsync();

    public Task<bool> ExistsAsync(int id) =>
        _db.Employees.AnyAsync(e => e.Id == id);

    public Task<bool> UserLinkedAsync(int userId, int? excludeId = null) =>
        _db.Employees.AnyAsync(e => e.UserId == userId && (excludeId == null || e.Id != excludeId));

    public Task<bool> UserInTenantAsync(int userId) =>
        _db.Users.AnyAsync(u => u.Id == userId && u.OrganizationId == _tenant.OrganizationId);

    public async Task<Employee> Create(SaveEmployeeRequest request)
    {
        var employee = new Employee
        {
            UserId = request.UserId,
            EmployeeNumber = await _codes.NextEmployeeNumberAsync(),
        };
        ApplyRequest(employee, request);
        _db.Employees.Add(employee);
        await _db.SaveChangesAsync();
        return employee;
    }

    public async Task Update(Employee employee, SaveEmployeeRequest request)
    {
        // UserId and EmployeeNumber are immutable after creation.
        ApplyRequest(employee, request);
        await _db.SaveChangesAsync();
    }

    public async Task SoftDelete(Employee employee)
    {
        employee.IsDeleted = true;
        employee.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private static void ApplyRequest(Employee employee, SaveEmployeeRequest request)
    {
        employee.DepartmentId = request.DepartmentId;
        employee.JobTitleId = request.JobTitleId;
        employee.ReportingManagerId = request.ReportingManagerId;
        employee.JoiningDate = DateTime.SpecifyKind(request.JoiningDate, DateTimeKind.Utc);
        employee.EmploymentStatus = Enum.Parse<EmploymentStatus>(request.EmploymentStatus, ignoreCase: true);
        employee.EmploymentType = Enum.Parse<EmploymentType>(request.EmploymentType, ignoreCase: true);
        employee.WorkEmail = string.IsNullOrWhiteSpace(request.WorkEmail) ? null : request.WorkEmail.Trim().ToLowerInvariant();
        employee.WorkPhone = string.IsNullOrWhiteSpace(request.WorkPhone) ? null : request.WorkPhone.Trim();
        employee.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
    }
}
