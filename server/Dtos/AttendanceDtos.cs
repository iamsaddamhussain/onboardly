using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

// Row for the attendance datatable. Flattened with the display names the grid
// needs so the client never resolves foreign keys itself.
public record AttendanceListItem(
    int Id,
    int EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    string? DepartmentName,
    DateOnly Date,
    DateTime? CheckInAt,
    DateTime? CheckOutAt,
    int WorkedMinutes,
    int BreakMinutes,
    int OvertimeMinutes,
    string Status,
    string? Remarks
);

// A single punch in the day's timeline (for the record detail view).
public record AttendanceEventItem(
    int Id,
    string Type,
    DateTime OccurredAt,
    string Source,
    string? Notes
);

// Full detail for one attendance record, including its punch timeline.
public record AttendanceDetail(
    int Id,
    int EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    string? DepartmentName,
    DateOnly Date,
    DateTime? CheckInAt,
    DateTime? CheckOutAt,
    int WorkedMinutes,
    int BreakMinutes,
    int OvertimeMinutes,
    string Status,
    string? Remarks,
    IReadOnlyList<AttendanceEventItem> Events
);

// HR manual entry / edit of a day's attendance.
public record SaveAttendanceRequest(
    [Required(ErrorMessage = "Employee is required.")]
    int EmployeeId,

    [Required(ErrorMessage = "Date is required.")]
    DateOnly Date,

    DateTime? CheckInAt,

    DateTime? CheckOutAt,

    [Range(0, 1440, ErrorMessage = "Break minutes must be between 0 and 1440.")]
    int BreakMinutes,

    [Required(ErrorMessage = "Status is required.")]
    string Status,

    [MaxLength(1000)]
    string? Remarks
);

// Self-service / device punch. Source is optional (defaults to Web); Notes can
// carry device or geo metadata for future capture integrations.
public record PunchRequest(
    string? Source = null,
    string? Notes = null
);

// The signed-in employee's current-day attendance snapshot for the self-service
// widget (drives the check in/out/break button state). IsLinked is false when
// the signed-in user has no employee record (e.g. a platform/admin account).
public record MyAttendanceToday(
    int? RecordId,
    DateOnly Date,
    DateTime? CheckInAt,
    DateTime? CheckOutAt,
    int WorkedMinutes,
    int BreakMinutes,
    string Status,
    bool IsCheckedIn,
    bool IsOnBreak,
    bool HasCheckedOut,
    bool IsLinked,
    // When on a break, the moment it started — lets the UI run a live worked/
    // break timer that pauses during the break.
    DateTime? CurrentBreakStartedAt = null
);

// Employee-raised correction request row.
public record CorrectionListItem(
    int Id,
    int EmployeeId,
    string EmployeeNumber,
    string EmployeeName,
    DateOnly Date,
    DateTime? RequestedCheckInAt,
    DateTime? RequestedCheckOutAt,
    string? RequestedStatus,
    string Reason,
    string Status,
    string? ReviewNotes,
    DateTime? ReviewedAt,
    DateTime CreatedAt
);

// A correction submission.
public record SaveCorrectionRequest(
    [Required(ErrorMessage = "Date is required.")]
    DateOnly Date,

    DateTime? RequestedCheckInAt,

    DateTime? RequestedCheckOutAt,

    string? RequestedStatus,

    [Required(ErrorMessage = "A reason is required.")]
    [MaxLength(1000)]
    string Reason,

    // Only honoured for HR raising a correction on behalf of an employee;
    // self-service submissions resolve the employee from the signed-in user.
    int? EmployeeId
);

// Approve/reject payload.
public record ReviewCorrectionRequest(
    [MaxLength(1000)]
    string? ReviewNotes
);

// HR attendance dashboard tiles for a given day.
public record AttendanceDashboard(
    DateOnly Date,
    int TotalEmployees,
    int PresentToday,
    int AbsentToday,
    int LateToday,
    int OnLeaveToday,
    int WorkFromHomeToday,
    int MissingCheckOut,
    int PendingCorrections
);

// A single day in the attendance trend series (present/absent/late counts).
public record AttendanceTrendPoint(
    DateOnly Date,
    int Present,
    int Absent,
    int Late
);
