import SwiftUI

struct LoginView: View {
    let submitting: Bool
    let error: String?
    let onLogin: (String, String) -> Void

    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 16) {
            Text("Tcall")
                .font(.largeTitle.bold())
                .foregroundStyle(Color(red: 0, green: 0.48, blue: 1))
            Text("iOS native ilova")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textFieldStyle(.roundedBorder)
            SecureField("Parol", text: $password)
                .textFieldStyle(.roundedBorder)

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            Button(submitting ? "…" : "Kirish") {
                onLogin(email, password)
            }
            .buttonStyle(.borderedProminent)
            .disabled(submitting)
        }
        .padding(24)
    }
}
