using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace Onboardly.Server.Authorization;

// Custom claim type carrying a permission name. Permissions are stamped onto the
// cookie at sign-in so authorization is a fast claim check (no DB hit per call).
public static class AppClaims
{
    public const string Permission = "permission";
}

public class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }
    public PermissionRequirement(string permission) => Permission = permission;
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
            .Any(c => c.Type == AppClaims.Permission && c.Value == requirement.Permission);

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
                "Unauthorized access: user {User} lacks permission {Permission} for {Path}",
                user, requirement.Permission, path);
        }

        return Task.CompletedTask;
    }
}
