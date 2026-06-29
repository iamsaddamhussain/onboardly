using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

public record RegisterRequest(string Email, string Password);

public record LoginRequest(string Email, string Password);

public record UserResponse(int Id, string Email, string[] Roles, string[] Permissions);

public record ProfileResponse(
    int Id,
    string FirstName,
    string LastName,
    string Email,
    string? Mobile,
    string? City,
    string? JobTitle,
    bool IsActive,
    DateTime CreatedAt);

public record UpdateProfileRequest(
    [Required(ErrorMessage = "First name is required.")]
    [StringLength(100)]
    string FirstName,
    [Required(ErrorMessage = "Last name is required.")]
    [StringLength(100)]
    string LastName,
    [Phone(ErrorMessage = "Enter a valid phone number.")]
    [StringLength(30)]
    string? Mobile,
    [StringLength(100)]
    string? City,
    [StringLength(100)]
    string? JobTitle);
