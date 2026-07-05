namespace Onboardly.Server.Services.Email.Models;

// View model for the "Account Created" email. Combines the recipient details,
// the call-to-action links, and the (per-organization / configured) branding
// used by the shared layout.
public class AccountCreatedEmailModel : IEmailBrandingModel
{
    public required string UserName { get; init; }
    public required string OrganizationName { get; init; }
    public required string LoginUrl { get; init; }

    // Exactly one of these is typically set: a temporary password to sign in
    // with, or a link to set the password. Both are optional.
    public string? TemporaryPassword { get; init; }
    public string? PasswordSetupUrl { get; init; }

    // Branding (shared with the layout).
    public required string CompanyName { get; init; }
    public string? LogoUrl { get; init; }
    public string PrimaryColor { get; init; } = "#171717";
}
