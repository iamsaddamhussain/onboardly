using Microsoft.AspNetCore.Authorization;

namespace Onboardly.Server.Authorization;

// Guards a controller/action with one or more permissions, e.g.
//   [RequirePermission(Permissions.ManageUsers)]                       // single
//   [RequirePermission(Permissions.ViewAudit, Permissions.PlatformViewAllAudits)]  // any-of (OR)
// Access is granted when the user holds ANY of the listed permissions.
// Policies are created on demand by PermissionPolicyProvider so no manual
// registration is needed.
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string Prefix = "perm:";
    // Joins multiple permissions in the policy name. Safe because permission
    // names never contain this character.
    public const char Separator = '|';

    public RequirePermissionAttribute(params string[] permissions)
        => Policy = Prefix + string.Join(Separator, permissions);
}

