using Microsoft.Extensions.Options;

namespace Onboardly.Server.Services.Email;

// Routes a finished message according to the configured delivery mode: send it
// now (Sync) or enqueue it for the background processor (Queue). Switching modes
// requires no code changes anywhere else.
public class EmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly IEmailProvider _provider;
    private readonly IEmailQueue _queue;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(
        IOptions<EmailOptions> options,
        IEmailProvider provider,
        IEmailQueue queue,
        ILogger<EmailSender> logger)
    {
        _options = options.Value;
        _provider = provider;
        _queue = queue;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        if (_options.Mode == EmailDeliveryMode.Queue)
        {
            await _queue.EnqueueAsync(
                new EmailJob { Message = message, MaxAttempts = _options.Queue.MaxAttempts }, ct);
            _logger.LogInformation("Email to {To} queued for background delivery.", message.ToAddress);
            return;
        }

        await _provider.SendAsync(message, ct);
    }
}
