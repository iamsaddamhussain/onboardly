using RazorLight;

namespace Onboardly.Server.Services.Email;

// Renders Razor email templates via RazorLight, then inlines the <style> classes
// into element style attributes with PreMailer so the email renders consistently
// across clients (Outlook included). Templates are embedded in the assembly (see
// the csproj EmbeddedResource include), so no files need to ship alongside the
// app. The template key is the file name without extension, e.g. "AccountCreated"
// -> AccountCreated.cshtml.
public class RazorEmailRenderer : IEmailRenderer
{
    private readonly IRazorLightEngine _engine;

    public RazorEmailRenderer(IRazorLightEngine engine) => _engine = engine;

    public async Task<string> RenderAsync<TModel>(string templateKey, TModel model)
    {
        var html = await _engine.CompileRenderAsync(templateKey, model);

        // Move the stylesheet classes to inline styles and drop the <style> block.
        var inlined = PreMailer.Net.PreMailer.MoveCssInline(html, removeStyleElements: true);
        return inlined.Html;
    }
}
