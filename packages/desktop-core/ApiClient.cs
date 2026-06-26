using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Tcall.Desktop.Core;

public sealed class UserDto
{
    [JsonPropertyName("userId")] public string UserId { get; set; } = "";
    [JsonPropertyName("email")] public string Email { get; set; } = "";
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("language")] public string Language { get; set; } = "uz";
    [JsonPropertyName("tcallId")] public string TcallId { get; set; } = "";
}

public sealed class LoginRequest
{
    [JsonPropertyName("email")] public string Email { get; set; } = "";
    [JsonPropertyName("password")] public string Password { get; set; } = "";
    [JsonPropertyName("remember")] public bool Remember { get; set; } = true;
}

public sealed class LoginResponse
{
    [JsonPropertyName("user")] public UserDto? User { get; set; }
    [JsonPropertyName("token")] public string? Token { get; set; }
    [JsonPropertyName("error")] public string? Error { get; set; }
}

public sealed class SessionResponse
{
    [JsonPropertyName("user")] public UserDto? User { get; set; }
}

public sealed class AuthSession
{
    public string Token { get; init; } = "";
    public UserDto User { get; init; } = new();
}

public sealed class ApiClient
{
    private readonly HttpClient _http;
    private string? _token;

    public ApiClient()
    {
        _http = new HttpClient { BaseAddress = new Uri(TcallConfig.ApiBaseUrl) };
        _http.DefaultRequestHeaders.Add(TcallConfig.NativeHeader, TcallConfig.NativeHeaderValue);
    }

    public UserDto? CurrentUser { get; private set; }

    public async Task<AuthSession> LoginAsync(string email, string password, CancellationToken ct = default)
    {
        var res = await _http.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email.Trim().ToLowerInvariant(),
            Password = password,
        }, ct);

        var body = await res.Content.ReadFromJsonAsync<LoginResponse>(cancellationToken: ct);
        if (!res.IsSuccessStatusCode || body?.User is null || string.IsNullOrWhiteSpace(body.Token))
            throw new InvalidOperationException(body?.Error ?? $"Login failed ({(int)res.StatusCode})");

        _token = body.Token;
        CurrentUser = body.User;
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        return new AuthSession { Token = _token, User = body.User };
    }

    public async Task<UserDto?> RestoreSessionAsync(string token, CancellationToken ct = default)
    {
        _token = token;
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res = await _http.GetAsync("/api/auth/session", ct);
        var body = await res.Content.ReadFromJsonAsync<SessionResponse>(cancellationToken: ct);
        if (!res.IsSuccessStatusCode || body?.User is null)
            return null;
        CurrentUser = body.User;
        return body.User;
    }

    public async Task LogoutAsync(CancellationToken ct = default)
    {
        try { await _http.DeleteAsync("/api/auth/session", ct); } catch { /* ignore */ }
        _token = null;
        CurrentUser = null;
        _http.DefaultRequestHeaders.Authorization = null;
    }
}
