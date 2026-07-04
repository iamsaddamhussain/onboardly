using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Read-only company profile for the active organization: details + a recent
// activity timeline. Visible to organization admins (manage_users/manage_roles)
// and to platform admins while viewing a tenant. Editing is done elsewhere
// (OrganizationsController) by platform admins.
[ApiController]
[Authorize]
[Route("api/organization")]
public class OrganizationProfileController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IAuditService _audit;

    public OrganizationProfileController(AppDbContext db, ITenantContext tenant, IAuditService audit)
    {
        _db = db;
        _tenant = tenant;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> Current()
    {
        var canView =
            User.HasClaim(AppClaims.Permission, Permissions.ManageUsers) ||
            User.HasClaim(AppClaims.Permission, Permissions.ManageRoles) ||
            User.HasClaim(AppClaims.Permission, Permissions.PlatformManageOrganizations);
        if (!canView)
            return Forbid();

        // No single organization in the platform-wide view.
        if (_tenant.OrganizationId is not int organizationId)
            return NoContent();

        var org = await _db.Organizations
            .Where(o => o.Id == organizationId)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.Slug,
                o.IsActive,
                o.SubscriptionTier,
                o.CreatedAt,
                UserCount = o.Users.Count,
            })
            .FirstOrDefaultAsync();

        if (org is null)
            return NotFound(new { message = "Organization not found." });

        var activity = await _audit.GetRecentForOrganizationAsync(organizationId);

        return Ok(new OrganizationProfileResponse(
            org.Id, org.Name, org.Slug, org.IsActive, org.SubscriptionTier,
            org.CreatedAt, org.UserCount, activity));
    }
}
