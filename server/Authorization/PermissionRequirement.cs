using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace Onboardly.Server.Authorization;

// Custom claim type carrying a permission name. Permissions are stamped onto the
// cookie at sign-in so authorization is a fast claim check (no DB hit per call).
public static class AppClaims
{
    public const string Permission = "permission";
    // Present on the cookie only while an admin is impersonating another user;
    // carries the original (admin) user id so we can switch back.
    public const string Impersonator = "impersonator_id";
    // Authorization scope of the signed-in user: "global" (platform) or "org".
    public const string Scope = "scope";
    // Home tenant of an organization user. Absent for global/platform users.
    public const string OrganizationId = "organization_id";
    // Tenant a global user has switched into via the org selector. Absent unless
    // a platform user is actively viewing a specific organization.
    public const string ActiveOrganizationId = "active_organization_id";

    public const string ScopeGlobal = "global";
    public const string ScopeOrganization = "org";
}

public class PermissionRequirement : IAuthorizationRequirement
{
    // Access is granted when the user holds ANY one of these permissions.
    public IReadOnlyList<string> Permissions { get; }
    public PermissionRequirement(params string[] permissions) => Permissions = permissions;
}

public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly ILogger<PermissionHandler> _logger;
    private readonly IHttpContextAccessor _http;

    public PermissionHandler(ILogger<PermissionHandler> logger, IHttpContextAccessor http)
    {
        _logger = logger;
        _http = http;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var hasPermission = context.User.Claims
            .Any(c => c.Type == AppClaims.Permission && requirement.Permissions.Contains(c.Value));

        if (hasPermission)
        {
            context.Succeed(requirement);
        }
        else
        {
            // Log unauthorized access attempts for auditing.
            var user = context.User.FindFirstValue(ClaimTypes.Email) ?? "anonymous";
            var path = _http.HttpContext?.Request.Path.Value ?? "?";
            _logger.LogWarning(
                "Unauthorized access: user {User} lacks any of permission(s) {Permissions} for {Path}",
                user, string.Join(", ", requirement.Permissions), path);
        }

        return Task.CompletedTask;
    }
}
