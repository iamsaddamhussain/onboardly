namespace Onboardly.Server.Services.Email;

// Turns a Razor (.cshtml) template + model into an HTML string. Kept separate
// from delivery so templates can evolve independently of how mail is sent.
public interface IEmailRenderer
{
    Task<string> RenderAsync<TModel>(string templateKey, TModel model);
}
