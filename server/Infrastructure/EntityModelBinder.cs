using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Data;
using Onboardly.Server.Models;

namespace Onboardly.Server.Infrastructure;

// Resolves an EF Core entity straight from the route id. When the id is
// missing/invalid or no row matches, the parameter binds to null so the action
// can return NotFound().
//
// The binder can't emit a 404 by itself (a binder may only add model
// errors, which would be a 400), so actions keep a one-line null check.
public class EntityModelBinder<TEntity> : IModelBinder
    where TEntity : class, IEntity
{
    public async Task BindModelAsync(ModelBindingContext bindingContext)
    {
        // Default to the conventional "id" route key unless one was named.
        var routeKey = bindingContext.BinderModelName ?? "id";
        var raw = bindingContext.ActionContext.RouteData.Values[routeKey]?.ToString();

        if (int.TryParse(raw, out var id))
        {
            var db = bindingContext.HttpContext.RequestServices
                .GetRequiredService<AppDbContext>();

            var entity = await db.FindAsync<TEntity>(id);
            if (entity is not null)
                bindingContext.Result = ModelBindingResult.Success(entity);
        }

        // Leaving Result unset binds null -> the action returns NotFound().
    }
}

// Hands an EntityModelBinder to any action parameter whose type is an IEntity.
public class EntityModelBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        var type = context.Metadata.ModelType;
        if (!typeof(IEntity).IsAssignableFrom(type))
            return null;

        var binderType = typeof(EntityModelBinder<>).MakeGenericType(type);
        return (IModelBinder)Activator.CreateInstance(binderType)!;
    }
}
