using System.Security.Claims;

namespace Onboardly.Server.Authorization;

// Resolves the active tenant for each authenticated request from cookie claims
// and populates the scoped ITenantContext. Runs after authentication so
// HttpContext.User is available, and before authorization/endpoints.
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ITenantContext tenant)
    {
        if (context.User.Identity?.IsAuthenticated == true && tenant is TenantContext resolvable)
        {
            var scope = context.User.FindFirstValue(AppClaims.Scope);
            var isGlobal = string.Equals(scope, AppClaims.ScopeGlobal, StringComparison.Ordinal);

            int? organizationId = null;
            if (isGlobal)
            {
                // A platform user only acts within a tenant after switching into
                // one via the organization selector (active-org claim).
                if (int.TryParse(context.User.FindFirstValue(AppClaims.ActiveOrganizationId), out var active))
                    organizationId = active;
            }
            else if (int.TryParse(context.User.FindFirstValue(AppClaims.OrganizationId), out var org))
            {
                organizationId = org;
            }

            int? userId = int.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid)
                ? uid
                : null;

            resolvable.Set(userId, organizationId, isGlobal);
        }

        await _next(context);
    }
}
