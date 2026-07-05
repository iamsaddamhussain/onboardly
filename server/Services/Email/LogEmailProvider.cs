namespace Onboardly.Server.Services.Email;

// Development / safe-default provider: logs the email instead of sending it, so
// no real mail leaves the machine when SMTP isn't configured. Selected via
// Email:Provider = "Log".
public class LogEmailProvider : IEmailProvider
{
    private readonly ILogger<LogEmailProvider> _logger;

    public LogEmailProvider(ILogger<LogEmailProvider> logger) => _logger = logger;

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "[LogEmailProvider] Email NOT delivered (dev mode). To={To} <{Address}> | Subject: {Subject}\n{Body}",
            message.ToName, message.ToAddress, message.Subject, message.HtmlBody);
        return Task.CompletedTask;
    }
}
