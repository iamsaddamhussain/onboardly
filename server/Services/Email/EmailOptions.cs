namespace Onboardly.Server.Services.Email;

// Strongly-typed binding for the "Email" configuration section. Everything about
// how mail is delivered — mode, provider, SMTP credentials, branding and queue
// behaviour — is driven from configuration so the same code runs in every
// environment.
public class EmailOptions
{
    public const string SectionName = "Email";

    // How mail is dispatched. Sync sends inline during the request; Queue hands
    // the message to the background processor. Business code never changes when
    // this flips — it always calls IEmailSender.
    public EmailDeliveryMode Mode { get; set; } = EmailDeliveryMode.Sync;

    // Which IEmailProvider to use: "Log" (dev default, no real delivery) or
    // "Smtp" (works with Mailtrap and any SMTP server). Future providers
    // (SendGrid, SES, Mailgun) plug in here without touching callers.
    public string Provider { get; set; } = "Log";

    public string FromAddress { get; set; } = "no-reply@onboardly.dev";
    public string FromName { get; set; } = "Onboardly";

    // Base URL of the client app, used to build login / password-setup links.
    public string AppBaseUrl { get; set; } = "http://localhost:5174";

    public SmtpOptions Smtp { get; set; } = new();
    public BrandingOptions Branding { get; set; } = new();
    public QueueOptions Queue { get; set; } = new();
}

public enum EmailDeliveryMode
{
    Sync,
    Queue,
}

public class SmtpOptions
{
    public string Host { get; set; } = "sandbox.smtp.mailtrap.io";
    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool UseStartTls { get; set; } = true;
}

// Default branding applied to every email; individual organizations can override
// the display name (and, in future, the logo) at render time.
public class BrandingOptions
{
    public string CompanyName { get; set; } = "Onboardly";
    public string? LogoUrl { get; set; }
    public string PrimaryColor { get; set; } = "#171717";
}

public class QueueOptions
{
    public int MaxAttempts { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 10;
}
