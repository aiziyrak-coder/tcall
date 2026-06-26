using Avalonia.Controls;
using Avalonia.Interactivity;
using Tcall.Desktop.Core;

namespace Tcall.Windows.Views;

public partial class MainWindow : Window
{
    private readonly ApiClient _api = new();

    public MainWindow()
    {
        InitializeComponent();
        Title = $"Tcall {TcallConfig.AppVersion} — Windows";
    }

    private async void OnLoginClick(object? sender, RoutedEventArgs e)
    {
        ErrorText.IsVisible = false;
        LoginBtn.IsEnabled = false;
        try
        {
            var session = await _api.LoginAsync(EmailBox.Text ?? "", PasswordBox.Text ?? "");
            MainPanel.IsVisible = true;
            LoginPanel.IsVisible = false;
            WelcomeText.Text = $"Salom, {session.User.Name} · {session.User.TcallId}";
        }
        catch (Exception ex)
        {
            ErrorText.Text = ex.Message;
            ErrorText.IsVisible = true;
        }
        finally
        {
            LoginBtn.IsEnabled = true;
        }
    }

    private async void OnLogoutClick(object? sender, RoutedEventArgs e)
    {
        await _api.LogoutAsync();
        MainPanel.IsVisible = false;
        LoginPanel.IsVisible = true;
    }
}
