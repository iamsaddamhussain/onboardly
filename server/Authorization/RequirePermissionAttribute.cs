using Microsoft.AspNetCore.Authorization;

namespace Onboardly.Server.Authorization;

// Guards a controller/action with a single permission, e.g.
// [RequirePermission(Permissions.ManageUsers)]. Policies are created on demand
// by PermissionPolicyProvider so no manual registration is needed.
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string Prefix = "perm:";
    public RequirePermissionAttribute(string permission) => Policy = $"{Prefix}{permission}";
}
