namespace Onboardly.Server.Services.Email;

// Loads the embedded email stylesheet once so the layout can drop it into a
// <style> block. PreMailer then inlines those classes into each element at
// render time (see RazorEmailRenderer) for email-client compatibility.
public static class EmailStyles
{
    private static readonly Lazy<string> Stylesheet = new(Load);

    public static string Css => Stylesheet.Value;

    private static string Load()
    {
        var assembly = typeof(EmailStyles).Assembly;
        const string resourceName = "Onboardly.Server.Services.Email.Templates.email.css";

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
            return string.Empty;

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
