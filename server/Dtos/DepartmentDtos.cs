using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

// Row for the departments datatable.
public record DepartmentListItem(
    int Id,
    string Name,
    string Code,
    string? Description,
    int? ParentDepartmentId,
    string? ParentDepartmentName,
    int? ManagerEmployeeId,
    string? ManagerName,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

// Lightweight option for department typeahead lookups.
public record DepartmentLookupItem(int Id, string Name, string Code);

// One request shape for create + update. The Code is auto-generated with the
// company prefix, so it is not accepted from the client.
public record SaveDepartmentRequest(
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(150)]
    string Name,

    [MaxLength(1000)]
    string? Description,

    int? ParentDepartmentId,

    int? ManagerEmployeeId,

    bool IsActive
);
