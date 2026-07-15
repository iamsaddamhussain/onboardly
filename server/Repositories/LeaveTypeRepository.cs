using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Services;

namespace Onboardly.Server.Repositories;

// EF Core implementation of ILeaveTypeRepository. Tenant scoping and soft-delete
// filtering are handled by the global query filter, so this focuses on query
// shaping and persistence.
public class LeaveTypeRepository : ILeaveTypeRepository
{
    private readonly AppDbContext _db;
    private readonly ICodeGenerator _codes;

    public LeaveTypeRepository(AppDbContext db, ICodeGenerator codes)
    {
        _db = db;
        _codes = codes;
    }

    public Task<PagedResult<LeaveTypeListItem>> GetAll(DataTableRequest request, bool? isActive)
    {
        var query = _db.LeaveTypes.AsQueryable();

        if (isActive is bool active)
            query = query.Where(t => t.IsActive == active);

        return query
            .ToDataTable(request)
            .Searchable(term => t =>
                EF.Functions.ILike(t.Name, $"%{term}%") ||
                EF.Functions.ILike(t.Code, $"%{term}%"))
            .Sortable("name", (q, desc) => desc ? q.OrderByDescending(t => t.Name) : q.OrderBy(t => t.Name))
            .Sortable("code", (q, desc) => desc ? q.OrderByDescending(t => t.Code) : q.OrderBy(t => t.Code))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(t => t.IsActive) : q.OrderBy(t => t.IsActive))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(t => t.CreatedAt) : q.OrderBy(t => t.CreatedAt))
            .DefaultSort(q => q.OrderBy(t => t.Name))
            .ToPagedResultAsync(ToListItem);
    }

    public async Task<IReadOnlyList<LeaveTypeLookupItem>> SearchAsync(string? search)
    {
        var query = _db.LeaveTypes.Where(t => t.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = $"%{search.Trim()}%";
            query = query.Where(t => EF.Functions.ILike(t.Name, like) || EF.Functions.ILike(t.Code, like));
        }

        return await query
            .OrderBy(t => t.Name)
            .Take(50)
            .Select(t => new LeaveTypeLookupItem(t.Id, t.Name, t.Code, t.Color, t.AllowHalfDay))
            .ToListAsync();
    }

    public Task<LeaveType?> GetByIdAsync(int id) =>
        _db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == id);

    public Task<LeaveTypeListItem?> GetRowAsync(int id) =>
        _db.LeaveTypes.Where(t => t.Id == id).Select(ToListItem).FirstOrDefaultAsync();

    public Task<bool> ExistsAsync(int id) => _db.LeaveTypes.AnyAsync(t => t.Id == id);

    public async Task<LeaveType> Create(SaveLeaveTypeRequest request)
    {
        var leaveType = new LeaveType { Code = await _codes.NextLeaveTypeCodeAsync() };
        ApplyRequest(leaveType, request);
        _db.LeaveTypes.Add(leaveType);
        await _db.SaveChangesAsync();
        return leaveType;
    }

    public async Task Update(LeaveType leaveType, SaveLeaveTypeRequest request)
    {
        ApplyRequest(leaveType, request);
        await _db.SaveChangesAsync();
    }

    public async Task SoftDelete(LeaveType leaveType)
    {
        leaveType.IsDeleted = true;
        leaveType.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private static void ApplyRequest(LeaveType t, SaveLeaveTypeRequest r)
    {
        t.Name = r.Name.Trim();
        t.Color = r.Color.Trim();
        t.IsPaid = r.IsPaid;
        t.CountsTowardAttendance = r.CountsTowardAttendance;
        t.CountsTowardPayroll = r.CountsTowardPayroll;
        t.RequiresApproval = r.RequiresApproval;
        t.CanAttachDocument = r.CanAttachDocument;
        t.DocumentRequiredAfterDays = r.DocumentRequiredAfterDays;
        t.MinDurationDays = r.MinDurationDays;
        t.MaxDurationDays = r.MaxDurationDays;
        t.AllowHalfDay = r.AllowHalfDay;
        t.AllowHourly = r.AllowHourly;
        t.FutureOnly = r.FutureOnly;
        t.AllowPastDays = r.AllowPastDays;
        t.CanCarryForward = r.CanCarryForward;
        t.MaxCarryForwardDays = r.MaxCarryForwardDays;
        t.CarryForwardExpiryDays = r.CarryForwardExpiryDays;
        t.CanEncash = r.CanEncash;
        t.GenderRestriction = Enum.TryParse<GenderRestriction>(r.GenderRestriction, true, out var g) ? g : GenderRestriction.Any;
        t.RestrictedDuringProbation = r.RestrictedDuringProbation;
        t.IsActive = r.IsActive;
    }

    private static readonly System.Linq.Expressions.Expression<Func<LeaveType, LeaveTypeListItem>> ToListItem =
        t => new LeaveTypeListItem(
            t.Id,
            t.Name,
            t.Code,
            t.Color,
            t.IsPaid,
            t.RequiresApproval,
            t.AllowHalfDay,
            t.MinDurationDays,
            t.MaxDurationDays,
            t.GenderRestriction.ToString(),
            t.IsActive,
            t.CreatedAt,
            t.UpdatedAt);
}
