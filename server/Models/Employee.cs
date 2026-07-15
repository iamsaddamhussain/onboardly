namespace Onboardly.Server.Models;

// Lifecycle state of an employment relationship. Kept deliberately small for
// Phase 1; operational states (leave, etc.) will be driven by future modules.
public enum EmploymentStatus
{
    Active = 0,
    Probation = 1,
    OnLeave = 2,
    Suspended = 3,
    Terminated = 4,
}

// The nature of the engagement.
public enum EmploymentType
{
    FullTime = 0,
    PartTime = 1,
    Contract = 2,
    Intern = 3,
    Temporary = 4,
}

// The master workforce record for a tenant. An Employee is the HR view of a
// person and is linked one-to-one to an application User account. Tenant-owned
// (IOrgOwned) and soft-deletable. Designed as the foundation that future HR
// modules (attendance, leave, payroll, org chart, documents…) extend.
public class Employee : IEntity, IOrgOwned, ISoftDeletable
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    // Auto-generated, tenant-unique human-readable identifier (e.g. EMP-1-000123).
    public string EmployeeNumber { get; set; } = string.Empty;

    // The linked application user account (identity, login, RBAC).
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public int? JobTitleId { get; set; }
    public JobTitle? JobTitle { get; set; }

    // The leave policy this employee inherits (entitlements, accrual, rules).
    // Null falls back to the tenant's default policy when one is configured.
    public int? LeavePolicyId { get; set; }
    public LeavePolicy? LeavePolicy { get; set; }

    // Self-referencing reporting line; optional (e.g. top of the org).
    public int? ReportingManagerId { get; set; }
    public Employee? ReportingManager { get; set; }
    public ICollection<Employee> DirectReports { get; set; } = new List<Employee>();

    public DateTime JoiningDate { get; set; }
    public EmploymentStatus EmploymentStatus { get; set; } = EmploymentStatus.Active;
    public EmploymentType EmploymentType { get; set; } = EmploymentType.FullTime;

    // HR-controlled gate: only leave-eligible employees can use the leave system
    // (contractual/temporary staff are typically not eligible). Defaults to off.
    public bool LeaveEligible { get; set; }

    public string? WorkEmail { get; set; }
    public string? WorkPhone { get; set; }
    public string? Notes { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
