package uz.tcall.data

import uz.tcall.network.ForgotPasswordRequest
import uz.tcall.network.LoginRequest
import uz.tcall.network.RegisterRequest
import uz.tcall.network.TcallApi
import uz.tcall.network.UserDto

data class AuthSession(
    val user: UserDto,
    val token: String,
)

data class SessionRefresh(
    val user: UserDto?,
    val token: String?,
    /** Server tokenni rad etdi — faqat foydalanuvchi hali kirgan bo'lsa tozalash mumkin */
    val tokenRejected: Boolean = false,
)

class AuthRepository(
    private val api: TcallApi,
    private val sessionStore: SessionStore,
) {
    suspend fun login(email: String, password: String): Result<AuthSession> {
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
                    val session = AuthSession(body.user, body.token!!)
                    sessionStore.saveSession(session.token, session.user)
                    Result.success(session)
                }
                body?.error != null -> Result.failure(Exception(body.error))
                response.code() == 401 -> Result.failure(Exception("Email yoki parol noto'g'ri"))
                else -> Result.failure(Exception("Kirish xatosi (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "Tarmoq xatosi"))
        }
    }

    suspend fun register(
        email: String,
        password: String,
        name: String,
        language: String,
        ref: String? = null,
    ): Result<AuthSession> {
        return try {
            val response = api.register(
                RegisterRequest(
                    email = email.trim().lowercase(),
                    password = password,
                    name = name.trim(),
                    language = language,
                    ref = ref?.filter { it.isDigit() }?.takeIf { it.length == 9 },
                )
            )
            val body = response.body()
            when {
                response.isSuccessful && body?.user != null && !body.token.isNullOrBlank() -> {
                    val session = AuthSession(body.user, body.token!!)
                    sessionStore.saveSession(session.token, session.user)
                    Result.success(session)
                }
                body?.error != null -> Result.failure(Exception(body.error))
                else -> Result.failure(Exception("Ro'yxatdan o'tish xatosi (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "Tarmoq xatosi"))
        }
    }

    suspend fun forgotPassword(email: String): Result<String> {
        return try {
            val response = api.forgotPassword(ForgotPasswordRequest(email.trim().lowercase()))
            val body = response.body()
            when {
                response.isSuccessful -> Result.success(
                    body?.message ?: "Agar email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi.",
                )
                body?.error != null -> Result.failure(Exception(body.error))
                else -> Result.failure(Exception("Xatolik (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "Tarmoq xatosi"))
        }
    }

    suspend fun cachedUser(): UserDto? = sessionStore.cachedUser()

    /** Serverdan yangilash — sessiyani o'chirmaydi (logout alohida) */
    suspend fun refreshSession(): SessionRefresh {
        val token = sessionStore.getTokenSync()
        if (token.isNullOrBlank()) return SessionRefresh(null, null)
        val cached = cachedUser()
        return try {
            val response = api.session()
            val body = response.body()
            val user = body?.user
            val newToken = body?.token?.takeIf { it.isNotBlank() }
            when {
                response.isSuccessful && user != null -> {
                    val tok = newToken ?: token
                    sessionStore.saveSession(tok, user)
                    SessionRefresh(user, tok)
                }
                response.code() == 401 || response.code() == 403 -> {
                    SessionRefresh(cached, token, tokenRejected = true)
                }
                else -> SessionRefresh(cached, token)
            }
        } catch (_: Exception) {
            SessionRefresh(cached, token)
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
