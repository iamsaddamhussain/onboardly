using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;

namespace Onboardly.Server.Controllers;

// Platform-admin tenant management (onboarding). Restricted to global users
// holding platform.manage_organizations. Organizations are not tenant-scoped, so
// these queries intentionally see every organization.
[ApiController]
[RequirePermission(Permissions.PlatformManageOrganizations)]
[Route("api/organizations")]
public partial class OrganizationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrganizationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DataTableRequest request)
    {
        var result = await new DataTableBuilder<Organization>(_db.Organizations, request)
            .Searchable(term => o =>
                EF.Functions.ILike(o.Name, $"%{term}%") ||
                EF.Functions.ILike(o.Slug, $"%{term}%"))
            .Sortable("name", (q, desc) => desc ? q.OrderByDescending(o => o.Name) : q.OrderBy(o => o.Name))
            .Sortable("status", (q, desc) => desc ? q.OrderByDescending(o => o.IsActive) : q.OrderBy(o => o.IsActive))
            .Sortable("createdAt", (q, desc) => desc ? q.OrderByDescending(o => o.CreatedAt) : q.OrderBy(o => o.CreatedAt))
            .DefaultSort(q => q.OrderBy(o => o.Name))
            .ToPagedResultAsync(o => new OrganizationRow(
                o.Id,
                o.Name,
                o.Slug,
                o.IsActive,
                o.SubscriptionTier,
                o.CreatedAt,
                o.Users.Count));

        return Ok(result);
    }

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
        if (await _db.Organizations.AnyAsync(o => o.Slug == slug))
        {
            ModelState.AddModelError(nameof(request.Slug), "An organization with that slug already exists.");
            return ValidationProblem(ModelState);
        }

        var organization = new Organization
        {
            Name = name,
            Slug = slug,
            SubscriptionTier = string.IsNullOrWhiteSpace(request.SubscriptionTier) ? null : request.SubscriptionTier.Trim(),
            IsActive = true,
        };
        _db.Organizations.Add(organization);
        await _db.SaveChangesAsync();

        return Created($"/api/organizations/{organization.Id}", new OrganizationRow(
            organization.Id, organization.Name, organization.Slug, organization.IsActive,
            organization.SubscriptionTier, organization.CreatedAt, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOrganizationRequest request)
    {
        var organization = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == id);
        if (organization is null)
            return NotFound(new { message = "Organization not found." });

        organization.Name = request.Name.Trim();
        organization.IsActive = request.IsActive;
        organization.SubscriptionTier = string.IsNullOrWhiteSpace(request.SubscriptionTier)
            ? null
            : request.SubscriptionTier.Trim();
        await _db.SaveChangesAsync();

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
