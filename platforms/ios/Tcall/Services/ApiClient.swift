import Foundation

@MainActor
final class ApiClient {
    static let shared = ApiClient()
    private let session: URLSession
    private(set) var token: String?

    private init() {
        session = URLSession(configuration: .default)
    }

    private func request(_ path: String, method: String = "GET", body: Data? = nil) throws -> URLRequest {
        var req = URLRequest(url: TcallConfig.apiBaseURL.appendingPathComponent(path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(TcallConfig.nativeHeaderValue, forHTTPHeaderField: TcallConfig.nativeHeader)
        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = body
        return req
    }

    func login(email: String, password: String) async throws -> UserDto {
        let payload = LoginRequest(email: email.lowercased().trimmingCharacters(in: .whitespaces), password: password, remember: true)
        let data = try JSONEncoder().encode(payload)
        let req = try request("/api/auth/login", method: "POST", body: data)
        let (resData, res) = try await session.data(for: req)
        guard let http = res as? HTTPURLResponse else { throw ApiError.network }
        let decoded = try JSONDecoder().decode(LoginResponse.self, from: resData)
        if http.statusCode == 401 { throw ApiError.message(decoded.error ?? "Email yoki parol noto'g'ri") }
        guard let user = decoded.user, let t = decoded.token, !t.isEmpty else {
            throw ApiError.message(decoded.error ?? "Kirish xatosi")
        }
        token = t
        KeychainStore.save(token: t)
        return user
    }

    func restoreSession() async throws -> UserDto? {
        guard let t = KeychainStore.loadToken() else { return nil }
        token = t
        let req = try request("/api/auth/session")
        let (data, res) = try await session.data(for: req)
        guard let http = res as? HTTPURLResponse, http.statusCode == 200 else {
            KeychainStore.clear()
            token = nil
            return nil
        }
        let decoded = try JSONDecoder().decode(SessionResponse.self, from: data)
        return decoded.user
    }

    func logout() async {
        var req = (try? request("/api/auth/session", method: "DELETE")) ?? URLRequest(url: TcallConfig.apiBaseURL)
        req.httpMethod = "DELETE"
        _ = try? await session.data(for: req)
        token = nil
        KeychainStore.clear()
    }
}

enum ApiError: LocalizedError {
    case network
    case message(String)
    var errorDescription: String? {
        switch self {
        case .network: return "Tarmoq xatosi"
        case .message(let s): return s
        }
    }
}

enum KeychainStore {
    private static let service = "uz.tcall"
    private static let account = "session"

    static func save(token: String) {
        let data = Data(token.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func loadToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let str = String(data: data, encoding: .utf8) else { return nil }
        return str
    }

    static func clear() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
