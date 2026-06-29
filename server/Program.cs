using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Onboardly.Server.Authorization;
using Onboardly.Server.Data;
using Onboardly.Server.Infrastructure;
using Onboardly.Server.Models;
using Onboardly.Server.Repositories;
using Onboardly.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// --- Database (PostgreSQL via EF Core / Npgsql) ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- Password hashing & app services ---
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserAccessService, UserAccessService>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();

// --- Cookie-based authentication (stateful sessions, HTTP-only cookie) ---
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "onboardly.auth";
        options.Cookie.HttpOnly = true;                       // not readable by JS
        options.Cookie.SameSite = SameSiteMode.Lax;           // same-origin via Vite proxy
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // Secure in prod (https)
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;

        // This is an API: return status codes instead of redirecting to HTML pages.
        options.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();
builder.Services.AddControllers(options =>
{
    // Enable Laravel-style route-model binding for IEntity parameters.
    options.ModelBinderProviders.Insert(0, new EntityModelBinderProvider());
});

// --- CORS for the Vite dev server (credentials required for cookies) ---
const string DevCorsPolicy = "DevClient";
builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// Apply migrations and seed a demo user on startup.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(scope.ServiceProvider);
}

if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCorsPolicy);
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
