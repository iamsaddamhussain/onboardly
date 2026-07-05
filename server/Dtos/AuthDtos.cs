using System.ComponentModel.DataAnnotations;

namespace Onboardly.Server.Dtos;

public record LoginRequest(string Email, string Password);

public record UserResponse(
    int Id,
    string Email,
    string Language,
    string[] Roles,
    string[] Permissions,
    string? FirstName,
    string? LastName,
    // True while this session is an admin impersonating another user.
    bool Impersonating,
    // "global" (platform user) or "org" (tenant user).
    string Scope,
    // The user's home tenant. Null for platform/global users.
    int? OrganizationId,
    string? OrganizationName,
    // Tenant a global user is currently viewing via the org selector, if any.
    int? ActiveOrganizationId,
    string? ActiveOrganizationName);

public record ProfileResponse(
    int Id,
    string FirstName,
    string LastName,
    string Email,
    string? Mobile,
    string? City,
    string? JobTitle,
    string Language,
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

// Switching the current user's UI language from the profile menu.
public record UpdateLanguageRequest(
    [Required]
    [RegularExpression("^(en|fr)$", ErrorMessage = "Unsupported language.")]
    string Language);
