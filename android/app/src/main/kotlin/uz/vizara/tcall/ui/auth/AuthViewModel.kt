package uz.vizara.tcall.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uz.vizara.tcall.data.AuthRepository
import uz.vizara.tcall.network.UserDto

data class AuthUiState(
    val loading: Boolean = true,
    val submitting: Boolean = false,
    val user: UserDto? = null,
    val error: String? = null,
)

class AuthViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val user = authRepository.restoreSession()
            _state.value = AuthUiState(loading = false, user = user)
        }
    }

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _state.value = _state.value.copy(error = "Email va parolni kiriting")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(submitting = true, error = null)
            authRepository.login(email, password)
                .onSuccess { user ->
                    _state.value = AuthUiState(loading = false, user = user)
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
            _state.value = AuthUiState(loading = false, user = null)
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
