package uz.tcall.data

import uz.tcall.network.LoginRequest
import uz.tcall.network.TcallApi
import uz.tcall.network.UserDto

class AuthRepository(
    private val api: TcallApi,
    private val sessionStore: SessionStore,
) {
    suspend fun login(email: String, password: String): Result<UserDto> {
        return try {
            val response = api.login(
                LoginRequest(
                    email = email.trim().lowercase(),
                    password = password,
                )
            )
            val body = response.body()
            when {
                response.isSuccessful && body?.user != null && !body.token.isNullOrBlank() -> {
                    sessionStore.saveSession(body.token!!, body.user)
                    Result.success(body.user)
                }
                body?.error != null -> Result.failure(Exception(body.error))
                response.code() == 401 -> Result.failure(Exception("Email yoki parol noto'g'ri"))
                else -> Result.failure(Exception("Kirish xatosi (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "Tarmoq xatosi"))
        }
    }

    suspend fun restoreSession(): UserDto? {
        if (sessionStore.getTokenSync().isNullOrBlank()) return null
        return try {
            val response = api.session()
            val user = response.body()?.user
            if (response.isSuccessful && user != null) {
                val token = sessionStore.getTokenSync()
                if (!token.isNullOrBlank()) {
                    sessionStore.saveSession(token, user)
                }
                user
            } else {
                sessionStore.clear()
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (_: Exception) {
            /* ignore */
        }
        sessionStore.clear()
    }

    fun currentToken(): String? = sessionStore.getTokenSync()
}
