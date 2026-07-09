using Microsoft.AspNetCore.Mvc;
using Onboardly.Server.Authorization;

namespace Onboardly.Server.Controllers;

// Base class for API controllers. Provides small, Laravel-style permission
// helpers so action bodies can branch on what the signed-in user may do without
// re-reading claims by hand. Pure authorization gates should still be declared
// with [RequirePermission(...)]; use these only when the result also drives
// logic (e.g. widening a query for platform admins).
public abstract class ApiControllerBase : ControllerBase
{
    // True when the signed-in user holds the given permission.
    protected bool Can(string permission) => User.HasClaim(AppClaims.Permission, permission);

    // True when the user holds ANY of the given permissions.
    protected bool CanAny(params string[] permissions) => permissions.Any(Can);
}
