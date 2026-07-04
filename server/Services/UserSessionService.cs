using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Dtos;
using Onboardly.Server.Models;

namespace Onboardly.Server.Services;

// Centralizes cookie sign-in and the UserResponse projection so both auth and
// platform (org switching) flows issue identical, correctly-scoped sessions.
public interface IUserSessionService
{
    // Issues the auth cookie for a user, stamping scope, tenant, impersonation
    // and (for a global user viewing a tenant) the active organization.
    Task SignInAsync(
        HttpContext http,
        User user,
        int? impersonatorId = null,
        int? activeOrganizationId = null);

    // Builds the client-facing session payload including tenant/scope details.
    Task<UserResponse> BuildResponseAsync(
        User user,
        bool impersonating,
        int? activeOrganizationId = null);
}

public class UserSessionService : IUserSessionService
{
    private readonly IUserAccessService _access;
    private readonly AppDbContext _db;

    public UserSessionService(IUserAccessService access, AppDbContext db)
    {
        _access = access;
        _db = db;
    }

    public async Task SignInAsync(
        HttpContext http,
        User user,
        int? impersonatorId = null,
        int? activeOrganizationId = null)
    {
        var isGlobal = user.OrganizationId is null;

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(AppClaims.Scope, isGlobal ? AppClaims.ScopeGlobal : AppClaims.ScopeOrganization),
        };

        // Organization users carry their home tenant so requests are scoped to it.
        if (user.OrganizationId is not null)
            claims.Add(new Claim(AppClaims.OrganizationId, user.OrganizationId.Value.ToString()));

        // A global user who has switched into a tenant via the org selector.
        if (activeOrganizationId is not null)
            claims.Add(new Claim(AppClaims.ActiveOrganizationId, activeOrganizationId.Value.ToString()));

        // Preserve the original admin id while impersonating so the session can
        // be switched back without re-authenticating.
        if (impersonatorId is not null)
            claims.Add(new Claim(AppClaims.Impersonator, impersonatorId.Value.ToString()));

        // Stamp roles + permissions onto the cookie so authorization is a fast
        // claim check (this acts as the per-user permission cache).
        foreach (var role in await _access.GetRolesAsync(user.Id))
            claims.Add(new Claim(ClaimTypes.Role, role));
        foreach (var permission in await _access.GetPermissionsAsync(user.Id))
            claims.Add(new Claim(AppClaims.Permission, permission));

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await http.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));
    }

    public async Task<UserResponse> BuildResponseAsync(
        User user,
        bool impersonating,
        int? activeOrganizationId = null)
    {
        var roles = await _access.GetRolesAsync(user.Id);
        var permissions = await _access.GetPermissionsAsync(user.Id);
        var scope = user.OrganizationId is null ? AppClaims.ScopeGlobal : AppClaims.ScopeOrganization;

        var organizationName = user.OrganizationId is int orgId
            ? await OrganizationNameAsync(orgId)
            : null;
        var activeOrganizationName = activeOrganizationId is int activeId
            ? await OrganizationNameAsync(activeId)
            : null;

        return new UserResponse(
            user.Id,
            user.Email,
            user.Language,
            roles.ToArray(),
            permissions.ToArray(),
            user.FirstName,
            user.LastName,
            impersonating,
            scope,
            user.OrganizationId,
            organizationName,
            activeOrganizationId,
            activeOrganizationName);
    }

    private Task<string?> OrganizationNameAsync(int organizationId) =>
        _db.Organizations
            .Where(o => o.Id == organizationId)
            .Select(o => o.Name)
            .FirstOrDefaultAsync();
}
