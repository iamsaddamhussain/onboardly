using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

// ---------------- Leave Types ----------------

// Row for the leave-types datatable.
public record LeaveTypeListItem(
    int Id,
    string Name,
    string Code,
    string Color,
    bool IsPaid,
    bool RequiresApproval,
    bool AllowHalfDay,
    decimal MinDurationDays,
    decimal? MaxDurationDays,
    string GenderRestriction,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

// Lightweight option for leave-type selectors.
public record LeaveTypeLookupItem(int Id, string Name, string Code, string Color, bool AllowHalfDay);

// One request shape for create + update. Code is auto-generated.
public record SaveLeaveTypeRequest(
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(120)]
    string Name,

    [Required]
    [MaxLength(9)]
    string Color,

    bool IsPaid,
    bool CountsTowardAttendance,
    bool CountsTowardPayroll,
    bool RequiresApproval,
    bool CanAttachDocument,
    int? DocumentRequiredAfterDays,

    [Range(0, 366, ErrorMessage = "Minimum duration must be between 0 and 366 days.")]
    decimal MinDurationDays,
    decimal? MaxDurationDays,

    bool AllowHalfDay,
    bool AllowHourly,
    bool FutureOnly,
    bool AllowPastDays,
    bool CanCarryForward,
    decimal? MaxCarryForwardDays,
    int? CarryForwardExpiryDays,
    bool CanEncash,

    [MaxLength(20)]
    string GenderRestriction,
    bool RestrictedDuringProbation,
    bool IsActive
);

// ---------------- Leave Policies ----------------

// A leave type included in a policy with its per-policy entitlement.
public record LeavePolicyLineItem(
    int LeaveTypeId,
    string LeaveTypeName,
    decimal AnnualEntitlementDays,
    string AccrualMethod
);

// Row for the policies datatable.
public record LeavePolicyListItem(
    int Id,
    string Name,
    string Code,
    string? Description,
    bool IsDefault,
    bool IsActive,
    int LeaveTypeCount,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

// Full policy detail including its lines (for the edit form).
public record LeavePolicyDetail(
    int Id,
    string Name,
    string Code,
    string? Description,
    bool IsDefault,
    bool IsActive,
    IReadOnlyList<LeavePolicyLineItem> Lines
);

public record LeavePolicyLookupItem(int Id, string Name, string Code, bool IsDefault);

// A line in a save request.
public record SaveLeavePolicyLine(
    int LeaveTypeId,
    [Range(0, 366)] decimal AnnualEntitlementDays,
    [MaxLength(20)] string AccrualMethod
);

public record SaveLeavePolicyRequest(
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(120)]
    string Name,

    [MaxLength(1000)]
    string? Description,

    bool IsDefault,
    bool IsActive,

    IReadOnlyList<SaveLeavePolicyLine> Lines
);

// ---------------- Leave Requests ----------------

public record LeaveRequestListItem(
    int Id,
    int EmployeeId,
    string EmployeeName,
    int LeaveTypeId,
    string LeaveTypeName,
    string LeaveTypeColor,
    DateOnly StartDate,
    DateOnly EndDate,
    string StartPortion,
    string EndPortion,
    decimal TotalDays,
    string Reason,
    string Status,
    string? ReviewNotes,
    DateTime? ReviewedAt,
    DateTime CreatedAt
);

// Employee's request to take leave. EmployeeId is optional: HR applying on
// behalf supplies it; otherwise the caller's own employee record is used.
public record SaveLeaveRequest(
    int? EmployeeId,

    [Required]
    int LeaveTypeId,

    [Required]
    DateOnly StartDate,

    [Required]
    DateOnly EndDate,

    [MaxLength(20)]
    string? StartPortion,

    [MaxLength(20)]
    string? EndPortion,

    [Required(ErrorMessage = "A reason is required.")]
    [MaxLength(1000)]
    string Reason,

    [MaxLength(500)]
    string? DocumentUrl
);

public record ReviewLeaveRequest([MaxLength(1000)] string? ReviewNotes);

// ---------------- Balances ----------------

// A single leave type's balance breakdown for an employee/year (ledger sums).
public record LeaveBalanceSummary(
    int LeaveTypeId,
    string LeaveTypeName,
    string LeaveTypeColor,
    int Year,
    decimal Entitlement,
    decimal Accrued,
    decimal Used,
    decimal Adjustment,
    decimal CarriedForward,
    decimal Expired,
    decimal Remaining
);

// Manual balance adjustment recorded as a ledger transaction.
public record AdjustLeaveBalanceRequest(
    [Required]
    int EmployeeId,

    [Required]
    int LeaveTypeId,

    int? Year,

    [Required]
    [MaxLength(20)]
    string Type,

    // Signed day amount (positive credit / negative debit).
    decimal Days,

    [MaxLength(500)]
    string? Notes
);

// ---------------- Holidays ----------------

public record HolidayListItem(
    int Id,
    string Name,
    DateOnly Date,
    string Type,
    string? Region,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record SaveHolidayRequest(
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(150)]
    string Name,

    [Required]
    DateOnly Date,

    [Required]
    [MaxLength(20)]
    string Type,

    [MaxLength(120)]
    string? Region,

    [MaxLength(500)]
    string? Description,

    bool IsActive
);
