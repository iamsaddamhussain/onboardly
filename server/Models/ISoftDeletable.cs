namespace Onboardly.Server.Models;

// Marks an aggregate that supports soft deletion. Entities implementing this are
// automatically excluded from reads (the tenant query filter ANDs `!IsDeleted`)
// and are never physically removed — a delete flips IsDeleted and records
// DeletedAt so history (and audit) is preserved.
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
}
