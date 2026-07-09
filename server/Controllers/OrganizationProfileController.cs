using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;

namespace Onboardly.Server.Controllers;

// Read-only company profile for the active organization: details + a recent
// activity timeline. Visible to organization admins (manage_users/manage_roles)
// and to platform admins while viewing a tenant. Editing is done elsewhere
// (OrganizationsController) by platform admins.
[ApiController]
[Authorize]
[Route("api/organization")]
public class OrganizationProfileController : ApiControllerBase
{
    private readonly IOrganizationRepository _organizations;
    private readonly ITenantContext _tenant;
    private readonly IAuditService _audit;

    public OrganizationProfileController(IOrganizationRepository organizations, ITenantContext tenant, IAuditService audit)
    {
        _organizations = organizations;
        _tenant = tenant;
        _audit = audit;
    }

    [HttpGet]
    [RequirePermission(Permissions.ManageUsers, Permissions.ManageRoles, Permissions.PlatformManageOrganizations)]
    public async Task<IActionResult> Current()
    {
        // No single organization in the platform-wide view.
        if (_tenant.OrganizationId is not int organizationId)
            return NoContent();

        var org = await _organizations.GetRowAsync(organizationId);
        if (org is null)
            return NotFound(new { message = "Organization not found." });

        var activity = await _audit.GetRecentForOrganizationAsync(organizationId);

        return Ok(new OrganizationProfileResponse(
            org.Id, org.Name, org.Slug, org.IsActive, org.SubscriptionTier,
            org.CreatedAt, org.UserCount, activity));
    }
}
