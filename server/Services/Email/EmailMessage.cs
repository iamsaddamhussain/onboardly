namespace Onboardly.Server.Services.Email;

// A fully-rendered email ready to hand to a provider. Rendering (Razor -> HTML)
// happens before this point, so providers and the queue only deal with final
// content and never with templates.
public class EmailMessage
{
    public required string ToAddress { get; init; }
    public string? ToName { get; init; }
    public required string Subject { get; init; }
    public required string HtmlBody { get; init; }
}
