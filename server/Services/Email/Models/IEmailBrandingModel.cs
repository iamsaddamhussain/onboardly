namespace Onboardly.Server.Services.Email.Models;

// Branding fields shared by the reusable email layout. Every email view model
// implements this so the layout can be strongly typed (no dynamic), which keeps
// RazorLight template compilation simple and reference-free.
public interface IEmailBrandingModel
{
    string CompanyName { get; }
    string? LogoUrl { get; }
    string PrimaryColor { get; }
}
