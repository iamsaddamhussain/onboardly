namespace Onboardly.Server.Infrastructure;

// Minimal .env loader for local development. Reads KEY=VALUE lines from a .env
// file (searching upward from the working directory) and sets them as process
// environment variables, so secrets like Email__Smtp__Username can live in .env
// instead of appsettings.json. Real environment variables always win, and this
// is a no-op when no .env file is present (e.g. in Docker/production).
public static class DotEnv
{
    public static void Load(string fileName = ".env")
    {
        var path = FindUpwards(fileName);
        if (path is null)
            return;

        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
                continue;

            var separator = line.IndexOf('=');
            if (separator <= 0)
                continue;

            var key = line[..separator].Trim();
            var value = line[(separator + 1)..].Trim().Trim('"');

            // Don't override a variable that's already set in the environment.
            if (Environment.GetEnvironmentVariable(key) is null)
                Environment.SetEnvironmentVariable(key, value);
        }
    }

    private static string? FindUpwards(string fileName)
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, fileName);
            if (File.Exists(candidate))
                return candidate;
            dir = dir.Parent;
        }
        return null;
    }
}
