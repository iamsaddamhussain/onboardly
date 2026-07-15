namespace Onboardly.Server.Models;

// A named bundle of leave rules assigned to employees (Default, Factory,
// Corporate, Intern…). Instead of attaching leave types directly to employees,
// employees inherit a policy — so HR maintains rules in one place. Tenant-owned
// and soft-deletable.
public class LeavePolicy : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public string Name { get; set; } = string.Empty;
    // Auto-generated, tenant-unique short code (e.g. ONBO-LVP-001).
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Exactly one policy per tenant may be the default (assigned to new
    // employees who have no explicit policy). Enforced in the service layer.
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;

    // Leave types included in this policy with their per-policy entitlement.
    public ICollection<LeavePolicyLeaveType> LeaveTypes { get; set; } = new List<LeavePolicyLeaveType>();

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

// Join between a policy and a leave type, carrying the per-policy entitlement
// and accrual configuration. Tenant-owned so the global query filter scopes it.
public class LeavePolicyLeaveType : IEntity, IOrgOwned
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public int LeavePolicyId { get; set; }
    public LeavePolicy LeavePolicy { get; set; } = null!;

    public int LeaveTypeId { get; set; }
    public LeaveType LeaveType { get; set; } = null!;

    // Yearly entitlement granted for this type under this policy (in days).
    public decimal AnnualEntitlementDays { get; set; }

    // How the entitlement is credited. Phase 1 uses Immediate; the value is
    // stored so the accrual engine can honour it later.
    public AccrualMethod AccrualMethod { get; set; } = AccrualMethod.Immediate;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
