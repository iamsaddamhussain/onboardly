using System.Threading.Channels;

namespace Onboardly.Server.Services.Email;

// In-process, unbounded queue backed by System.Threading.Channels. Fine for a
// single instance; replace with a durable queue for multi-instance/worker setups
// (the IEmailQueue seam keeps that change local).
public class ChannelEmailQueue : IEmailQueue
{
    private readonly Channel<EmailJob> _channel =
        Channel.CreateUnbounded<EmailJob>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
        });

    public ValueTask EnqueueAsync(EmailJob job, CancellationToken ct = default) =>
        _channel.Writer.WriteAsync(job, ct);

    public IAsyncEnumerable<EmailJob> DequeueAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);
}
