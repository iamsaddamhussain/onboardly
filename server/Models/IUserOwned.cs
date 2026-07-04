namespace Onboardly.Server.Models;

// Marks a resource that has an owning/assigned user, enabling ownership-based
// resource authorization (e.g. "users can only edit projects assigned to them")
// without minting per-record permissions.
public interface IUserOwned
{
    int OwnerUserId { get; }
}
