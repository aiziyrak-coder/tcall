import Foundation

enum TcallConfig {
    static let apiBaseURL = URL(string: "https://api.tcall.uz")!
    static let appVersion = "1.000000"
    static let nativeHeader = "X-Tcall-Native"
    static let nativeHeaderValue = "1"
}

struct UserDto: Codable {
    let userId: String
    let email: String
    let name: String
    let language: String
    let tcallId: String
}

struct LoginRequest: Codable {
    let email: String
    let password: String
    let remember: Bool
}

struct LoginResponse: Codable {
    let user: UserDto?
    let token: String?
    let error: String?
}

struct SessionResponse: Codable {
    let user: UserDto?
}
