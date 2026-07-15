using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Services;

namespace Onboardly.Server.Repositories;

// EF Core implementation of ILeavePolicyRepository. Manages the policy aggregate
// and its LeavePolicyLeaveType lines. Single-default invariant is coordinated by
// the controller via ClearOtherDefaultsAsync.
public class LeavePolicyRepository : ILeavePolicyRepository
{
    private readonly AppDbContext _db;
    private readonly ICodeGenerator _codes;

    public LeavePolicyRepository(AppDbContext db, ICodeGenerator codes)
    {
        _db = db;
        _codes = codes;
    }

    public Task<PagedResult<LeavePolicyListItem>> GetAll(DataTableRequest request, bool? isActive)
    {
        var query = _db.LeavePolicies.AsQueryable();

        if (isActive is bool active)
            query = query.Where(p => p.IsActive == active);

        return query
            .ToDataTable(request)
            .Searchable(term => p =>
                EF.Functions.ILike(p.Name, $"%{term}%") ||
                EF.Functions.ILike(p.Code, $"%{term}%"))
            .Sortable("name", (q, desc) => desc ? q.OrderByDescending(p => p.Name) : q.OrderBy(p => p.Name))
            .Sortable("code", (q, desc) => desc ? q.OrderByDescending(p => p.Code) : q.OrderBy(p => p.Code))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(p => p.IsActive) : q.OrderBy(p => p.IsActive))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(p => p.CreatedAt) : q.OrderBy(p => p.CreatedAt))
            .DefaultSort(q => q.OrderBy(p => p.Name))
            .ToPagedResultAsync(p => new LeavePolicyListItem(
                p.Id,
                p.Name,
                p.Code,
                p.Description,
                p.IsDefault,
                p.IsActive,
                p.LeaveTypes.Count,
                p.CreatedAt,
                p.UpdatedAt));
    }

    public async Task<IReadOnlyList<LeavePolicyLookupItem>> SearchAsync(string? search)
    {
        var query = _db.LeavePolicies.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var like = $"%{search.Trim()}%";
            query = query.Where(p => EF.Functions.ILike(p.Name, like) || EF.Functions.ILike(p.Code, like));
        }

        return await query
            .OrderBy(p => p.Name)
            .Take(50)
            .Select(p => new LeavePolicyLookupItem(p.Id, p.Name, p.Code, p.IsDefault))
            .ToListAsync();
    }

    public Task<LeavePolicy?> GetByIdAsync(int id) =>
        _db.LeavePolicies.Include(p => p.LeaveTypes).FirstOrDefaultAsync(p => p.Id == id);

    public Task<LeavePolicyDetail?> GetDetailAsync(int id) =>
        _db.LeavePolicies
            .Where(p => p.Id == id)
            .Select(p => new LeavePolicyDetail(
                p.Id,
                p.Name,
                p.Code,
                p.Description,
                p.IsDefault,
                p.IsActive,
                p.LeaveTypes.Select(l => new LeavePolicyLineItem(
                    l.LeaveTypeId,
                    l.LeaveType.Name,
                    l.AnnualEntitlementDays,
                    l.AccrualMethod.ToString())).ToList()))
            .FirstOrDefaultAsync();

    public Task<bool> ExistsAsync(int id) => _db.LeavePolicies.AnyAsync(p => p.Id == id);

    public Task<int?> GetDefaultIdAsync() =>
        _db.LeavePolicies.Where(p => p.IsDefault).Select(p => (int?)p.Id).FirstOrDefaultAsync();

    public async Task<LeavePolicy> Create(SaveLeavePolicyRequest request)
    {
        var policy = new LeavePolicy { Code = await _codes.NextLeavePolicyCodeAsync() };
        ApplyScalars(policy, request);
        SyncLines(policy, request);
        _db.LeavePolicies.Add(policy);
        await _db.SaveChangesAsync();
        return policy;
    }

    public async Task Update(LeavePolicy policy, SaveLeavePolicyRequest request)
    {
        ApplyScalars(policy, request);
        SyncLines(policy, request);
        await _db.SaveChangesAsync();
    }

    public async Task SoftDelete(LeavePolicy policy)
    {
        policy.IsDeleted = true;
        policy.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task ClearOtherDefaultsAsync(int keepPolicyId)
    {
        var others = await _db.LeavePolicies.Where(p => p.IsDefault && p.Id != keepPolicyId).ToListAsync();
        foreach (var p in others)
            p.IsDefault = false;
        if (others.Count > 0)
            await _db.SaveChangesAsync();
    }

    private static void ApplyScalars(LeavePolicy p, SaveLeavePolicyRequest r)
    {
        p.Name = r.Name.Trim();
        p.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        p.IsDefault = r.IsDefault;
        p.IsActive = r.IsActive;
    }

    // Reconciles the policy's lines with the request: updates existing, adds new,
    // removes those no longer present.
    private void SyncLines(LeavePolicy policy, SaveLeavePolicyRequest request)
    {
        var incoming = request.Lines ?? Array.Empty<SaveLeavePolicyLine>();
        var keepTypeIds = incoming.Select(l => l.LeaveTypeId).ToHashSet();

        var toRemove = policy.LeaveTypes.Where(l => !keepTypeIds.Contains(l.LeaveTypeId)).ToList();
        foreach (var line in toRemove)
        {
            policy.LeaveTypes.Remove(line);
            _db.LeavePolicyLeaveTypes.Remove(line);
        }

        foreach (var line in incoming)
        {
            var accrual = Enum.TryParse<AccrualMethod>(line.AccrualMethod, true, out var a) ? a : AccrualMethod.Immediate;
            var existing = policy.LeaveTypes.FirstOrDefault(l => l.LeaveTypeId == line.LeaveTypeId);
            if (existing is null)
            {
                policy.LeaveTypes.Add(new LeavePolicyLeaveType
                {
                    LeaveTypeId = line.LeaveTypeId,
                    AnnualEntitlementDays = line.AnnualEntitlementDays,
                    AccrualMethod = accrual,
                });
            }
            else
            {
                existing.AnnualEntitlementDays = line.AnnualEntitlementDays;
                existing.AccrualMethod = accrual;
            }
        }
    }
}
