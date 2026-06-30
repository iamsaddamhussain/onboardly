using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

public record UserListItem(
    int Id,
    string FirstName,
    string LastName,
    string Email,
    string? Mobile,
    string? City,
    string? JobTitle,
    bool IsActive,
    DateTime CreatedAt,
    int[] RoleIds
);

// One request shape for both create and update, with declarative validation.
// Password is optional here: it's required on create (enforced in the
// controller) and left blank on update to keep the existing password.
public record SaveUserRequest(
    [Required(ErrorMessage = "First name is required.")]
    [MaxLength(100)]
    string FirstName,

    [Required(ErrorMessage = "Last name is required.")]
    [MaxLength(100)]
    string LastName,

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [MaxLength(256)]
    string Email,

    [MinLength(8, ErrorMessage = "Password must be at least 8 characters.")]
    string? Password,

    [MaxLength(50)]
    string? Mobile,

    [MaxLength(100)]
    string? City,

    [MaxLength(100)]
    string? JobTitle,

    bool IsActive
);
