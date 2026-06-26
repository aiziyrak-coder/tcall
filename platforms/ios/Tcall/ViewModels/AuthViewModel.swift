import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var user: UserDto?
    @Published var loading = true
    @Published var submitting = false
    @Published var error: String?

    func restore() async {
        loading = true
        defer { loading = false }
        user = try? await ApiClient.shared.restoreSession()
    }

    func login(email: String, password: String) async {
        submitting = true
        error = nil
        defer { submitting = false }
        do {
            user = try await ApiClient.shared.login(email: email, password: password)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func logout() async {
        await ApiClient.shared.logout()
        user = nil
    }
}
