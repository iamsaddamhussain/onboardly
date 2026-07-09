using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

// Row for the job titles datatable.
public record JobTitleListItem(
    int Id,
    string Name,
    string Code,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

// Lightweight option for job-title typeahead lookups.
public record JobTitleLookupItem(int Id, string Name, string Code);

// One request shape for create + update. The Code is auto-generated with the
// company prefix, so it is not accepted from the client.
public record SaveJobTitleRequest(
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(150)]
    string Name,

    [MaxLength(1000)]
    string? Description,

    bool IsActive
);
