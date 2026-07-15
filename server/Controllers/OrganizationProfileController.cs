using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;
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

        var entity = await _organizations.GetByIdAsync(organizationId);
        var activity = await _audit.GetRecentForOrganizationAsync(organizationId);

        return Ok(new OrganizationProfileResponse(
            org.Id, org.Name, org.Slug, org.IsActive, org.SubscriptionTier,
            org.CreatedAt, org.UserCount, activity,
            entity?.TimeZone ?? "UTC",
            (entity?.WorkDays ?? WorkDays.Weekdays).ToNames(),
            entity?.WorkdayStart ?? new TimeOnly(9, 0),
            entity?.WorkdayEnd ?? new TimeOnly(18, 0),
            entity?.BreakMinutes ?? 60,
            entity?.FlagMissingPunches ?? true));
    }

    // HR updates the organization's attendance policy (time zone + office hours)
    // that drives the auto-checkout sweep.
    [HttpPut("attendance")]
    [RequirePermission(Permissions.ManageUsers)]
    public async Task<IActionResult> UpdateAttendance([FromBody] UpdateAttendanceSettingsRequest request)
    {
        if (_tenant.OrganizationId is not int organizationId)
            return NoContent();

        var organization = await _organizations.GetByIdAsync(organizationId);
        if (organization is null)
            return NotFound(new { message = "Organization not found." });

        // The time zone must be one the server can resolve, or the sweep can't
        // compute the office close time.
        if (!TimeZoneExists(request.TimeZone))
        {
            ModelState.AddModelError(nameof(request.TimeZone), "Unknown time zone.");
            return ValidationProblem(ModelState);
        }
        if (request.WorkdayEnd <= request.WorkdayStart)
        {
            ModelState.AddModelError(nameof(request.WorkdayEnd), "Office close must be after office start.");
            return ValidationProblem(ModelState);
        }

        await _organizations.UpdateAttendanceSettings(organization, request);
        return NoContent();
    }

    private static bool TimeZoneExists(string id)
    {
        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(id);
            return true;
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return false;
        }
    }

    // Daily activity counts for the active organization's contribution heatmap
    // (roughly the past year), rendered as a GitHub-style graph.
    [HttpGet("heatmap")]
    [RequirePermission(Permissions.ManageUsers, Permissions.ManageRoles, Permissions.PlatformManageOrganizations)]
    public async Task<IActionResult> Heatmap()
    {
        if (_tenant.OrganizationId is not int organizationId)
            return NoContent();

        var points = await _audit.GetHeatmapForOrganizationAsync(organizationId, DateTime.UtcNow.AddDays(-371));
        return Ok(points);
    }

    // Drill-down: the organization's audit entries on a specific calendar day,
    // used when a heatmap cell is clicked to filter the activity timeline.
    [HttpGet("activity")]
    [RequirePermission(Permissions.ManageUsers, Permissions.ManageRoles, Permissions.PlatformManageOrganizations)]
    public async Task<IActionResult> Activity([FromQuery] DateOnly date)
    {
        if (_tenant.OrganizationId is not int organizationId)
            return NoContent();

        var items = await _audit.GetForOrganizationOnDateAsync(organizationId, date);
        return Ok(items);
    }
}
