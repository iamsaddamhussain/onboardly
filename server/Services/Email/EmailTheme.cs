namespace Onboardly.Server.Services.Email;

// Single source of truth for the email colour palette, mirroring the app's
// shadcn "neutral" design tokens (client/src/index.css). Email clients can't use
// Tailwind classes or CSS variables (and don't support oklch), so templates
// reference these named tokens for inline styles instead of scattering hex
// values. Update here to re-skin every email.
public static class EmailTheme
{
    public const string Background = "#ffffff";        // --background / --card
    public const string Foreground = "#0a0a0a";        // --foreground
    public const string Muted = "#f5f5f5";             // --muted
    public const string MutedForeground = "#737373";   // --muted-foreground
    public const string Border = "#e5e5e5";            // --border
    public const string Primary = "#171717";           // --primary
    public const string PrimaryForeground = "#fafafa"; // --primary-foreground
}
