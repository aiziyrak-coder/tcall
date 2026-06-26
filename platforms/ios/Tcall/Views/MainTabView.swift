import SwiftUI

struct MainTabView: View {
    let user: UserDto
    let onLogout: () -> Void

    var body: some View {
        TabView {
            placeholder("Xabarlar", systemImage: "message")
            placeholder("Do'stlar", systemImage: "person.2")
            placeholder("Terish", systemImage: "circle.grid.3x3")
            placeholder("Xona", systemImage: "phone")
            placeholder("Tarjimon", systemImage: "character.bubble")
        }
        .safeAreaInset(edge: .top) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Salom, \(user.name)")
                        .font(.headline)
                    Text(user.tcallId)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Chiqish", action: onLogout)
                    .font(.caption)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
        }
    }

    private func placeholder(_ title: String, systemImage: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.largeTitle)
                .foregroundStyle(Color(red: 0, green: 0.48, blue: 1))
            Text(title)
                .font(.title3.bold())
            Text("Native ekran tez orada")
                .foregroundStyle(.secondary)
        }
        .tabItem { Label(title, systemImage: systemImage) }
    }
}
