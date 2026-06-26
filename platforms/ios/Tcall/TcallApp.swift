import SwiftUI

@main
struct TcallApp: App {
    @StateObject private var auth = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if auth.loading {
                    ProgressView("Tcall…")
                } else if let user = auth.user {
                    MainTabView(user: user, onLogout: { Task { await auth.logout() } })
                } else {
                    LoginView(
                        submitting: auth.submitting,
                        error: auth.error,
                        onLogin: { email, password in
                            Task { await auth.login(email: email, password: password) }
                        }
                    )
                }
            }
            .task { await auth.restore() }
        }
    }
}
