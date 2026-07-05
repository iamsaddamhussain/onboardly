namespace Onboardly.Server.Services.Email;

// A unit of work for the background email queue. Carries the finished message
// plus retry bookkeeping, mirroring a Laravel queued job.
public class EmailJob
{
    public required EmailMessage Message { get; init; }
    public int MaxAttempts { get; init; } = 3;
    public int Attempts { get; set; }
}
