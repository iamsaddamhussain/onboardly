using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace Onboardly.Server.Services.Email;

// SMTP delivery via System.Net.Mail. Works unchanged against Mailtrap (local
// development) or any real SMTP server (staging/production) — only the host and
// credentials differ, and those come from configuration.
public class SmtpEmailProvider : IEmailProvider
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailProvider> _logger;

    public SmtpEmailProvider(IOptions<EmailOptions> options, ILogger<SmtpEmailProvider> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var smtp = _options.Smtp;

        using var client = new SmtpClient(smtp.Host, smtp.Port)
        {
            EnableSsl = smtp.UseStartTls,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Credentials = string.IsNullOrEmpty(smtp.Username)
                ? CredentialCache.DefaultNetworkCredentials
                : new NetworkCredential(smtp.Username, smtp.Password),
        };

        using var mail = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = message.Subject,
            Body = message.HtmlBody,
            IsBodyHtml = true,
        };
        mail.To.Add(new MailAddress(message.ToAddress, message.ToName ?? message.ToAddress));

        await client.SendMailAsync(mail, ct);
        _logger.LogInformation(
            "Email delivered to {To} via SMTP ({Host}:{Port})", message.ToAddress, smtp.Host, smtp.Port);
    }
}
