namespace Onboardly.Server.Authorization;

// Ambient, per-request view of "which tenant am I acting in?". Populated by
// TenantResolutionMiddleware from the signed-in user's claims. Injected wherever
// tenant scoping is needed (query filters, audit logging, resource policies).
public interface ITenantContext
{
    // True once the middleware has run for an authenticated request.
    bool IsResolved { get; }
    // Platform/global user (not bound to a single tenant).
    bool IsGlobal { get; }
    // The tenant the request is acting in. Null for a global user who has not
    // switched into a specific organization.
    int? OrganizationId { get; }
    // The signed-in user id (may be an impersonated user).
    int? UserId { get; }
    // True when tenant boundaries should not restrict reads: a global user who
    // is not scoped into any specific organization (platform-wide view).
    bool IgnoreTenantBoundary { get; }
}

public sealed class TenantContext : ITenantContext
{
    public bool IsResolved { get; private set; }
    public bool IsGlobal { get; private set; }
    public int? OrganizationId { get; private set; }
    public int? UserId { get; private set; }
    public bool IgnoreTenantBoundary => IsGlobal && OrganizationId is null;

    internal void Set(int? userId, int? organizationId, bool isGlobal)
    {
        UserId = userId;
        OrganizationId = organizationId;
        IsGlobal = isGlobal;
        IsResolved = true;
    }
}
