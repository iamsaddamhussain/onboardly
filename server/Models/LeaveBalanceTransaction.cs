namespace Onboardly.Server.Models;

// A single, immutable movement in an employee's leave balance for a leave type
// and year. Balances are never stored directly: the remaining balance is the
// signed sum of these transactions (accounting/ledger style). Credits (opening,
// accrual, carry-forward, positive adjustments) are positive; debits (leave
// taken, expiry, encashment) are negative. Tenant-owned; not soft-deletable —
// corrections are appended as new transactions rather than edits.
public class LeaveBalanceTransaction : IEntity, IOrgOwned
{
    public int Id { get; set; }
    public int OrganizationId { get; set; }

    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public int LeaveTypeId { get; set; }
    public LeaveType LeaveType { get; set; } = null!;

    // The entitlement year this movement belongs to (calendar year).
    public int Year { get; set; }

    public LeaveLedgerEntryType Type { get; set; }

    // Signed day amount (e.g. +12 accrual, -1.5 leave taken).
    public decimal Days { get; set; }

    // Optional link back to the request that generated a LeaveTaken movement.
    public int? LeaveRequestId { get; set; }
    public LeaveRequest? LeaveRequest { get; set; }

    public string? Notes { get; set; }

    // Who recorded this movement (HR user for manual adjustments; null for
    // system-generated entries).
    public int? CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
