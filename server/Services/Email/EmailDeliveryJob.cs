using System.ComponentModel;
using Hangfire;

namespace Onboardly.Server.Services.Email;

// Hangfire background job that delivers a rendered email via the configured
// provider. Enqueued by EmailSender in Queue mode; Hangfire owns durability,
// scheduling and retries (see AutomaticRetry). The whole EmailMessage is
// serialized as the job argument, so the payload survives restarts and worker
// hand-offs without a bespoke jobs table.
public class EmailDeliveryJob
{
    private readonly IEmailProvider _provider;
    private readonly ILogger<EmailDeliveryJob> _logger;

    public EmailDeliveryJob(IEmailProvider provider, ILogger<EmailDeliveryJob> logger)
    {
        _provider = provider;
        _logger = logger;
    }

    // Retry policy is applied globally from configuration (see Program.cs), so an
    // exception here re-queues the job with back-off; the final failure is kept
    // in Hangfire's "Failed" state for inspection in the dashboard.
    [DisplayName("Send email to {0}")]
    public async Task SendAsync(string toAddress, EmailMessage message, CancellationToken ct)
    {
        await _provider.SendAsync(message, ct);
        _logger.LogInformation("Email to {To} delivered via background job.", toAddress);
    }
}
