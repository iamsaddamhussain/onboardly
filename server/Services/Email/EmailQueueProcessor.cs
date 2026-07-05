using Microsoft.Extensions.Options;

namespace Onboardly.Server.Services.Email;

// Drains the email queue in the background and delivers each job through the
// configured provider, with Laravel-style retries and failure logging. Runs as
// a hosted service today; the same ProcessAsync logic can be lifted into a
// Hangfire job or dedicated worker later.
public class EmailQueueProcessor : BackgroundService
{
    private readonly IEmailQueue _queue;
    private readonly IEmailProvider _provider;
    private readonly EmailOptions _options;
    private readonly ILogger<EmailQueueProcessor> _logger;

    public EmailQueueProcessor(
        IEmailQueue queue,
        IEmailProvider provider,
        IOptions<EmailOptions> options,
        ILogger<EmailQueueProcessor> logger)
    {
        _queue = queue;
        _provider = provider;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Email queue processor started.");
        try
        {
            await foreach (var job in _queue.DequeueAllAsync(stoppingToken))
            {
                await ProcessAsync(job, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown.
        }
    }

    private async Task ProcessAsync(EmailJob job, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            job.Attempts++;
            try
            {
                await _provider.SendAsync(job.Message, ct);
                return;
            }
            catch (Exception ex) when (job.Attempts < job.MaxAttempts)
            {
                _logger.LogWarning(
                    ex,
                    "Email to {To} failed (attempt {Attempt}/{Max}); retrying in {Delay}s.",
                    job.Message.ToAddress, job.Attempts, job.MaxAttempts, _options.Queue.RetryDelaySeconds);

                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(_options.Queue.RetryDelaySeconds), ct);
                }
                catch (OperationCanceledException)
                {
                    return;
                }
            }
            catch (Exception ex)
            {
                // Terminal failure: log so the delivery can be investigated. A
                // durable queue would move this to a dead-letter store here.
                _logger.LogError(
                    ex,
                    "Email to {To} permanently failed after {Attempts} attempt(s). Subject: {Subject}",
                    job.Message.ToAddress, job.Attempts, job.Message.Subject);
                return;
            }
        }
    }
}
