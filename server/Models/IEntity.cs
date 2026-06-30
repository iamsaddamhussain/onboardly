namespace Onboardly.Server.Models;

// Marker for entities that can be resolved from a route id via route-model
// binding. Implemented by any aggregate with an int primary key.
public interface IEntity
{
    int Id { get; }
}
