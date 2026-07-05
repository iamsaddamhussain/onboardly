namespace Onboardly.Server.Services.Email;

// The lowest-level delivery abstraction: given a finished message, put it on the
// wire. Swap implementations (Log, SMTP/Mailtrap, SendGrid, SES, Mailgun…) via
// configuration without changing any calling code.
public interface IEmailProvider
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
