package uz.tcall.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uz.tcall.data.AppPreferences
import uz.tcall.data.AuthRepository
import uz.tcall.network.UserDto

data class AuthUiState(
    val loading: Boolean = true,
    val submitting: Boolean = false,
    val user: UserDto? = null,
    val token: String? = null,
    val error: String? = null,
)

class AuthViewModel(
    private val authRepository: AuthRepository,
    private val appPreferences: AppPreferences,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val user = authRepository.restoreSession()
            val token = authRepository.currentToken()
            _state.value = AuthUiState(loading = false, user = user, token = token)
        }
    }

    fun login(email: String, password: String, remember: Boolean = true) {
        if (email.isBlank() || password.isBlank()) {
            _state.value = _state.value.copy(error = "Email va parolni kiriting")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(submitting = true, error = null)
            if (remember) {
                appPreferences.saveRememberedEmail(email)
            } else {
                appPreferences.saveRememberedEmail(null)
            }
            authRepository.login(email, password)
                .onSuccess { user ->
                    _state.value = AuthUiState(
                        loading = false,
                        user = user,
                        token = authRepository.currentToken(),
                    )
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(
                        submitting = false,
                        error = err.message ?: "Xatolik",
                    )
                }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _state.value = AuthUiState(loading = false, user = null, token = null)
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
