namespace Onboardly.Server.Models;

// A configurable leave category (Annual, Sick, Casual, Maternity…). The whole
// point of the Leave Rules Engine: HR configures behaviour here instead of
// changing code. Tenant-owned and soft-deletable. Entitlement and accrual are
// defined per-policy (LeavePolicyLeaveType), so the same type can behave
// differently across policies.
public class LeaveType : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public string Name { get; set; } = string.Empty;
    // Auto-generated, tenant-unique short code (e.g. ONBO-LVT-001).
    public string Code { get; set; } = string.Empty;

    // Hex colour used to render the type on calendars and pills.
    public string Color { get; set; } = "#2563eb";

    // Paid leave is not deducted from payroll; unpaid (LWP) is.
    public bool IsPaid { get; set; } = true;
    // Whether a day on this leave counts as present for attendance reporting.
    public bool CountsTowardAttendance { get; set; }
    // Whether the leave feeds payroll inputs (unpaid days become deductions).
    public bool CountsTowardPayroll { get; set; } = true;

    public bool RequiresApproval { get; set; } = true;

    // Document rules. A supporting document may be attachable, and can be made
    // mandatory once a single request spans more than N days (e.g. medical).
    public bool CanAttachDocument { get; set; }
    public int? DocumentRequiredAfterDays { get; set; }

    // Duration bounds for a single request (in days).
    public decimal MinDurationDays { get; set; } = 1;
    public decimal? MaxDurationDays { get; set; }

    public bool AllowHalfDay { get; set; } = true;
    public bool AllowHourly { get; set; }

    // Timing rules: whether the request may start in the future only, and whether
    // backdated (past-dated) requests are permitted.
    public bool FutureOnly { get; set; }
    public bool AllowPastDays { get; set; } = true;

    // Carry-forward rules (applied by the Phase 2 accrual/expiry engine).
    public bool CanCarryForward { get; set; }
    public decimal? MaxCarryForwardDays { get; set; }
    public int? CarryForwardExpiryDays { get; set; }
    public bool CanEncash { get; set; }

    // Eligibility restrictions.
    public GenderRestriction GenderRestriction { get; set; } = GenderRestriction.Any;
    // Employees on probation cannot apply when true.
    public bool RestrictedDuringProbation { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
