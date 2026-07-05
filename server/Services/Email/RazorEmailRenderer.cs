using RazorLight;

namespace Onboardly.Server.Services.Email;

// Renders Razor email templates via RazorLight. Templates are embedded in the
// assembly (see the csproj EmbeddedResource include), so no files need to ship
// alongside the app. The template key is the file name without extension, e.g.
// "AccountCreated" -> AccountCreated.cshtml.
public class RazorEmailRenderer : IEmailRenderer
{
    private readonly IRazorLightEngine _engine;

    public RazorEmailRenderer(IRazorLightEngine engine) => _engine = engine;

    public Task<string> RenderAsync<TModel>(string templateKey, TModel model) =>
        _engine.CompileRenderAsync(templateKey, model);
}
