namespace Onboardly.Server.Services.Email;

// Queue abstraction for background email delivery. The default implementation is
// an in-process channel, but this interface is the seam for swapping in a
// durable backend later (Hangfire, a .NET Worker Service, RabbitMQ, Azure
// Service Bus…) without touching producers or the processor.
public interface IEmailQueue
{
    ValueTask EnqueueAsync(EmailJob job, CancellationToken ct = default);

    IAsyncEnumerable<EmailJob> DequeueAllAsync(CancellationToken ct);
}
