using Hangfire;
using Microsoft.Extensions.Options;

namespace Onboardly.Server.Services.Email;

// Routes a finished message according to the configured delivery mode: send it
// now (Sync) or enqueue it as a Hangfire background job (Queue). Switching modes
// requires no code changes anywhere else.
public class EmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly IEmailProvider _provider;
    private readonly IBackgroundJobClient _jobClient;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(
        IOptions<EmailOptions> options,
        IEmailProvider provider,
        IBackgroundJobClient jobClient,
        ILogger<EmailSender> logger)
    {
        _options = options.Value;
        _provider = provider;
        _jobClient = jobClient;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        if (_options.Mode == EmailDeliveryMode.Queue)
        {
            // Hand off to Hangfire: durable, survives restarts, retried per the
            // global AutomaticRetry policy. CancellationToken.None is a placeholder
            // Hangfire replaces with a shutdown-aware token at execution time.
            _jobClient.Enqueue<EmailDeliveryJob>(
                job => job.SendAsync(message.ToAddress, message, CancellationToken.None));
            _logger.LogInformation("Email to {To} queued for background delivery.", message.ToAddress);
            return;
        }

        await _provider.SendAsync(message, ct);
    }
}
