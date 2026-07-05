namespace Onboardly.Server.Services.Email;

// The delivery-mode dispatcher. Application code always calls this; whether the
// message is sent inline (Sync) or handed to the background queue (Queue) is a
// configuration detail hidden behind this single method.
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
