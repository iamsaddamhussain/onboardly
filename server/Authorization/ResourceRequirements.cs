using Microsoft.AspNetCore.Authorization;
using Onboardly.Server.Models;

namespace Onboardly.Server.Authorization;

// Layer 3 — policy/resource authorization. These requirements combine coarse
// RBAC permissions with row-level rules so we avoid per-record permissions like
// "edit_customer_company_a". Use them imperatively:
//
//   var result = await _authz.AuthorizeAsync(User, resource, new SameOrganizationRequirement());
//   if (!result.Succeeded) return Forbid();

// The resource must belong to the caller's active tenant. Defense-in-depth for
// writes/actions where a resource id is supplied directly (complements the
// EF global query filter on reads).
public sealed class SameOrganizationRequirement : IAuthorizationRequirement { }

// The resource must be owned by / assigned to the caller.
public sealed class ResourceOwnerRequirement : IAuthorizationRequirement { }

public class SameOrganizationHandler
    : AuthorizationHandler<SameOrganizationRequirement, IOrgOwned>
{
    private readonly ITenantContext _tenant;

    public SameOrganizationHandler(ITenantContext tenant) => _tenant = tenant;

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        SameOrganizationRequirement requirement,
        IOrgOwned resource)
    {
        // A platform user with no active org may act across tenants; everyone
        // else is bounded to their active organization.
        if (_tenant.IgnoreTenantBoundary || resource.OrganizationId == _tenant.OrganizationId)
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}

public class ResourceOwnerHandler
    : AuthorizationHandler<ResourceOwnerRequirement, IUserOwned>
{
    private readonly ITenantContext _tenant;

    public ResourceOwnerHandler(ITenantContext tenant) => _tenant = tenant;

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ResourceOwnerRequirement requirement,
        IUserOwned resource)
    {
        if (_tenant.UserId is int userId && resource.OwnerUserId == userId)
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}
