package uz.tcall.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import uz.tcall.data.AppPreferences
import uz.tcall.data.AuthRepository
import uz.tcall.network.UserDto

enum class AuthScreen { LOGIN, REGISTER, FORGOT_PASSWORD }

data class AuthUiState(
    val loading: Boolean = true,
    val submitting: Boolean = false,
    val user: UserDto? = null,
    val token: String? = null,
    val error: String? = null,
    val info: String? = null,
    val screen: AuthScreen = AuthScreen.LOGIN,
)

class AuthViewModel(
    private val authRepository: AuthRepository,
    private val appPreferences: AppPreferences,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    /** Login/register dan keyin eski fon yangilanishini bekor qilish */
    private var sessionGeneration = 0

    init {
        bootstrapSession()
    }

    private fun bootstrapSession() {
        val gen = ++sessionGeneration
        viewModelScope.launch {
            val token = authRepository.currentToken()
            if (token.isNullOrBlank()) {
                if (gen == sessionGeneration) {
                    _state.value = AuthUiState(loading = false)
                }
                return@launch
            }
            val cached = authRepository.cachedUser()
            if (gen == sessionGeneration) {
                _state.value = AuthUiState(loading = false, user = cached, token = token)
            }
            withTimeoutOrNull(12_000) {
                applyRefresh(authRepository.refreshSession(), gen, cached, token)
            }
        }
    }

    private fun applyRefresh(
        refresh: uz.tcall.data.SessionRefresh,
        gen: Int,
        fallbackUser: UserDto?,
        fallbackToken: String?,
    ) {
        if (gen != sessionGeneration) return
        when {
            refresh.user != null && !refresh.token.isNullOrBlank() -> {
                _state.value = AuthUiState(
                    loading = false,
                    user = refresh.user,
                    token = refresh.token,
                )
            }
            refresh.tokenRejected && _state.value.user == null -> {
                viewModelScope.launch {
                    authRepository.logout()
                    if (gen == sessionGeneration) {
                        _state.value = AuthUiState(loading = false)
                    }
                }
            }
            else -> {
                _state.value = AuthUiState(
                    loading = false,
                    user = refresh.user ?: fallbackUser ?: _state.value.user,
                    token = refresh.token ?: fallbackToken ?: _state.value.token,
                )
            }
        }
    }

    private fun commitSession(user: UserDto, token: String) {
        sessionGeneration++
        _state.value = AuthUiState(loading = false, user = user, token = token)
    }

    fun showLogin() {
        _state.value = _state.value.copy(screen = AuthScreen.LOGIN, error = null, info = null)
    }

    fun showRegister() {
        _state.value = _state.value.copy(screen = AuthScreen.REGISTER, error = null, info = null)
    }

    fun showForgotPassword() {
        _state.value = _state.value.copy(screen = AuthScreen.FORGOT_PASSWORD, error = null, info = null)
    }

    fun login(email: String, password: String, remember: Boolean = true) {
        if (email.isBlank() || password.isBlank()) {
            _state.value = _state.value.copy(error = "Email va parolni kiriting")
            return
        }
        viewModelScope.launch {
            sessionGeneration++
            _state.value = _state.value.copy(submitting = true, error = null)
            if (remember) appPreferences.saveRememberedEmail(email) else appPreferences.saveRememberedEmail(null)
            authRepository.login(email, password)
                .onSuccess { session -> commitSession(session.user, session.token) }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        submitting = false,
                        loading = false,
                        error = err.message ?: "Xatolik",
                    )
                }
        }
    }

    fun register(email: String, password: String, name: String, language: String) {
        if (name.length < 2) {
            _state.value = _state.value.copy(error = "Ism kamida 2 belgi")
            return
        }
        if (password.length < 6) {
            _state.value = _state.value.copy(error = "Parol kamida 6 belgi")
            return
        }
        viewModelScope.launch {
            sessionGeneration++
            _state.value = _state.value.copy(submitting = true, error = null)
            authRepository.register(email, password, name, language)
                .onSuccess { session -> commitSession(session.user, session.token) }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        submitting = false,
                        loading = false,
                        error = err.message ?: "Xatolik",
                    )
                }
        }
    }

    fun forgotPassword(email: String) {
        if (email.isBlank()) {
            _state.value = _state.value.copy(error = "Email kiriting")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(submitting = true, error = null, info = null)
            authRepository.forgotPassword(email)
                .onSuccess { msg ->
                    _state.value = _state.value.copy(submitting = false, info = msg)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(submitting = false, error = err.message ?: "Xatolik")
                }
        }
    }

    fun logout() {
        viewModelScope.launch {
            sessionGeneration++
            authRepository.logout()
            _state.value = AuthUiState(loading = false, user = null, token = null)
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
