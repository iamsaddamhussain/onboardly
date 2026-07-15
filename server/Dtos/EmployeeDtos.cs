using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

// Row for the employees datatable. Flattened with the display names the grid
// needs so the client never has to resolve foreign keys itself.
public record EmployeeListItem(
    int Id,
    string EmployeeNumber,
    int UserId,
    string FullName,
    string Email,
    int? DepartmentId,
    string? DepartmentName,
    int? JobTitleId,
    string? JobTitleName,
    int? ReportingManagerId,
    string? ReportingManagerName,
    DateTime JoiningDate,
    string EmploymentStatus,
    string EmploymentType,
    bool LeaveEligible,
    string? WorkEmail,
    string? WorkPhone,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

// Full detail for the employee profile page (Profile/Employment/Organization).
public record EmployeeDetail(
    int Id,
    string EmployeeNumber,
    int UserId,
    string FullName,
    string Email,
    int? DepartmentId,
    string? DepartmentName,
    int? JobTitleId,
    string? JobTitleName,
    int? ReportingManagerId,
    string? ReportingManagerName,
    DateTime JoiningDate,
    string EmploymentStatus,
    string EmploymentType,
    bool LeaveEligible,
    string? WorkEmail,
    string? WorkPhone,
    string? Notes,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

// Lightweight option for employee typeahead lookups (reporting/department mgr).
public record EmployeeLookupItem(int Id, string EmployeeNumber, string FullName);

// A node in the reporting hierarchy (org chart). The client assembles the tree
// from this flat list using ReportingManagerId.
public record OrgChartNode(
    int Id,
    string EmployeeNumber,
    string FullName,
    string? JobTitleName,
    string? DepartmentName,
    string EmploymentStatus,
    int? ReportingManagerId,
    int? UserId
);

// A user account that can be linked to a new employee record.
public record AssignableUserItem(int Id, string FullName, string Email);

// One request shape for create + update. EmployeeNumber is server-generated and
// is intentionally absent here. UserId is required and immutable after create.
public record SaveEmployeeRequest(
    [Required(ErrorMessage = "A linked user account is required.")]
    int UserId,

    int? DepartmentId,

    int? JobTitleId,

    int? ReportingManagerId,

    [Required(ErrorMessage = "Joining date is required.")]
    DateTime JoiningDate,

    [Required(ErrorMessage = "Employment status is required.")]
    string EmploymentStatus,

    [Required(ErrorMessage = "Employment type is required.")]
    string EmploymentType,

    bool LeaveEligible,

    [EmailAddress(ErrorMessage = "Enter a valid work email address.")]
    [MaxLength(256)]
    string? WorkEmail,

    [MaxLength(40)]
    string? WorkPhone,

    [MaxLength(2000)]
    string? Notes
);
