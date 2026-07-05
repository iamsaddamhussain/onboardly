using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Onboardly.Server.Data;
using Onboardly.Server.Models;
using Onboardly.Server.Services.Email.Models;

namespace Onboardly.Server.Services.Email;

// Domain-facing entry point for transactional emails. Builds the view model
// (recipient + links + per-organization branding), renders the Razor template,
// and hands the finished message to IEmailSender — callers don't touch
// templates, providers, or the delivery mode.
public interface IEmailService
{
    Task SendAccountCreatedAsync(User user, string? temporaryPassword = null, CancellationToken ct = default);
}

public class EmailService : IEmailService
{
    private readonly AppDbContext _db;
    private readonly IEmailRenderer _renderer;
    private readonly IEmailSender _sender;
    private readonly EmailOptions _options;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        AppDbContext db,
        IEmailRenderer renderer,
        IEmailSender sender,
        IOptions<EmailOptions> options,
        ILogger<EmailService> logger)
    {
        _db = db;
        _renderer = renderer;
        _sender = sender;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAccountCreatedAsync(
        User user, string? temporaryPassword = null, CancellationToken ct = default)
    {
        // Notifications are dispatch-and-forget (like Laravel's ->queue()): the
        // caller never has to guard against email failures. Delivery problems are
        // logged here, and in Queue mode the background processor also retries.
        try
        {
            // Per-organization branding: use the org's name when the user belongs
            // to one, otherwise fall back to the configured company name.
            var orgName = user.OrganizationId is int orgId
                ? await _db.Organizations
                    .Where(o => o.Id == orgId)
                    .Select(o => o.Name)
                    .FirstOrDefaultAsync(ct)
                : null;

            var baseUrl = _options.AppBaseUrl.TrimEnd('/');
            var branding = _options.Branding;

            var model = new AccountCreatedEmailModel
            {
                UserName = $"{user.FirstName} {user.LastName}".Trim(),
                OrganizationName = orgName ?? branding.CompanyName,
                LoginUrl = $"{baseUrl}/login",
                TemporaryPassword = temporaryPassword,
                // With no temporary password, point the user at the app to set one.
                PasswordSetupUrl = string.IsNullOrEmpty(temporaryPassword) ? $"{baseUrl}/login" : null,
                CompanyName = branding.CompanyName,
                LogoUrl = string.IsNullOrWhiteSpace(branding.LogoUrl) ? null : branding.LogoUrl,
                PrimaryColor = branding.PrimaryColor,
            };

            var html = await _renderer.RenderAsync("AccountCreated", model);

            await _sender.SendAsync(new EmailMessage
            {
                ToAddress = user.Email,
                ToName = model.UserName,
                Subject = $"Welcome to {model.OrganizationName}",
                HtmlBody = html,
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send account-created email to {Email}.", user.Email);
        }
    }
}
