using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;

namespace Onboardly.Server.Repositories;

// EF Core implementation of IAuditRepository — the paged audit query and its
// tenant scoping live here so the controller stays focused on HTTP concerns.
public class AuditRepository : IAuditRepository
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public AuditRepository(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public Task<PagedResult<AuditLogListItem>> GetAll(DataTableRequest request, bool canViewAllTenants)
    {
        var query = _db.AuditLogs.AsNoTracking();

        // Only a platform viewer with no active org sees every tenant's logs;
        // otherwise (org user, or a global user switched into a tenant) restrict
        // to the active organization — mirroring roles and the rest of the app.
        if (!(canViewAllTenants && _tenant.IgnoreTenantBoundary))
            query = query.Where(a => a.OrganizationId == _tenant.OrganizationId);

        return query
            .ToDataTable(request)
            .Searchable(term => a =>
                EF.Functions.ILike(a.Action, $"%{term}%") ||
                EF.Functions.ILike(a.EntityType, $"%{term}%") ||
                EF.Functions.ILike(a.EntityId, $"%{term}%"))
            .Sortable("timestamp", (q, desc) => desc ? q.OrderByDescending(a => a.Timestamp) : q.OrderBy(a => a.Timestamp))
            .Sortable("action", (q, desc) => desc ? q.OrderByDescending(a => a.Action) : q.OrderBy(a => a.Action))
            .Sortable("entityType", (q, desc) => desc ? q.OrderByDescending(a => a.EntityType) : q.OrderBy(a => a.EntityType))
            .DefaultSort(q => q.OrderByDescending(a => a.Timestamp))
            .ToPagedResultAsync(a => new AuditLogListItem(
                a.Id,
                a.OrganizationId,
                a.UserId,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.OldValues,
                a.NewValues,
                a.Timestamp,
                a.IpAddress,
                a.UserAgent));
    }
}
