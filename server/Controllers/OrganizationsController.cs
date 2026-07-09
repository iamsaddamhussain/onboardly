using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Repositories;

namespace Onboardly.Server.Controllers;

// Platform-admin tenant management (onboarding). Restricted to global users
// holding platform.manage_organizations. Organizations are not tenant-scoped, so
// these queries intentionally see every organization.
[ApiController]
[RequirePermission(Permissions.PlatformManageOrganizations)]
[Route("api/organizations")]
public partial class OrganizationsController : ApiControllerBase
{
    private readonly IOrganizationRepository _organizations;

    public OrganizationsController(IOrganizationRepository organizations) => _organizations = organizations;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DataTableRequest request) =>
        Ok(await _organizations.GetAll(request));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrganizationRequest request)
    {
        var name = request.Name.Trim();
        var slug = Slugify(string.IsNullOrWhiteSpace(request.Slug) ? name : request.Slug);
        if (string.IsNullOrEmpty(slug))
        {
            ModelState.AddModelError(nameof(request.Slug), "Enter a valid slug.");
            return ValidationProblem(ModelState);
        }
        if (await _organizations.SlugExistsAsync(slug))
        {
            ModelState.AddModelError(nameof(request.Slug), "An organization with that slug already exists.");
            return ValidationProblem(ModelState);
        }

        var tier = string.IsNullOrWhiteSpace(request.SubscriptionTier) ? null : request.SubscriptionTier.Trim();
        var organization = await _organizations.Create(name, slug, tier);

        return Created($"/api/organizations/{organization.Id}", new OrganizationRow(
            organization.Id, organization.Name, organization.Slug, organization.IsActive,
            organization.SubscriptionTier, organization.CreatedAt, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOrganizationRequest request)
    {
        var organization = await _organizations.GetByIdAsync(id);
        if (organization is null)
            return NotFound(new { message = "Organization not found." });

        await _organizations.Update(organization, request);

        return NoContent();
    }

    // Lowercase, hyphen-separated, alphanumeric slug derived from arbitrary text.
    private static string Slugify(string value)
    {
        var lowered = value.Trim().ToLowerInvariant();
        var hyphenated = NonSlugChars().Replace(lowered, "-");
        return hyphenated.Trim('-');
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugChars();
}
