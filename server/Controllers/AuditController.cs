using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;

namespace Onboardly.Server.Controllers;

// Audit log query surface. Visibility follows the three-layer model and the
// active organization:
//   * platform.view_all_audits + no active org -> every organization's logs
//   * switched into an org (or an org user)     -> that organization only
[ApiController]
[Authorize]
[Route("api/audit")]
public class AuditController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;

    public AuditController(AppDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DataTableRequest request)
    {
        var canViewAll = User.HasClaim(AppClaims.Permission, Permissions.PlatformViewAllAudits);
        var canViewOrg = User.HasClaim(AppClaims.Permission, Permissions.ViewAudit);
        if (!canViewAll && !canViewOrg)
            return Forbid();

        var query = _db.AuditLogs.AsNoTracking();

        // Only a platform viewer with no active org sees every tenant's logs;
        // otherwise (org user, or a global user switched into a tenant) restrict
        // to the active organization — mirroring roles and the rest of the app.
        if (!(canViewAll && _tenant.IgnoreTenantBoundary))
            query = query.Where(a => a.OrganizationId == _tenant.OrganizationId);

        var result = await new DataTableBuilder<Models.AuditLog>(query, request)
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

        return Ok(result);
    }
}
