package uz.tcall.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.tcall.data.UserRepository
import uz.tcall.network.UpdateSettingsRequest
import uz.tcall.network.UserSettingsDto

data class SettingsUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val user: UserSettingsDto? = null,
    val error: String? = null,
    val saved: Boolean = false,
    val section: SettingsSection = SettingsSection.OVERVIEW,
    // editable
    val name: String = "",
    val language: String = "uz",
    val translationMode: String = "text",
    val status: String = "available",
    val bio: String = "",
    val currentPassword: String = "",
    val newPassword: String = "",
    val telegram: String = "",
    val pinInput: String = "",
    val pinConfirm: String = "",
    val deleteConfirm: String = "",
)

enum class SettingsSection {
    OVERVIEW, PROFILE, PROFILE_DETAILS, PREFERENCES, NOTIFICATIONS, PASSWORD, PIN, SECURITY,
}

class SettingsViewModel(
    private val userRepository: UserRepository,
    private val pinRepository: uz.tcall.data.PinRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            userRepository.getSettings()
                .onSuccess { user ->
                    _state.update {
                        it.copy(
                            loading = false,
                            user = user,
                            name = user.name,
                            language = user.language,
                            translationMode = user.translationMode ?: "text",
                            status = user.status ?: "available",
                            bio = user.bio.orEmpty(),
                            telegram = user.telegramUsername.orEmpty(),
                        )
                    }
                }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun navigate(section: SettingsSection) {
        _state.update { it.copy(section = section, saved = false, error = null) }
    }

    fun updateName(v: String) { _state.update { it.copy(name = v) } }
    fun updateBio(v: String) { _state.update { it.copy(bio = v) } }
    fun updateLanguage(v: String) { _state.update { it.copy(language = v) } }
    fun updateTranslationMode(v: String) { _state.update { it.copy(translationMode = v) } }
    fun updateStatus(v: String) { _state.update { it.copy(status = v) } }
    fun updateCurrentPassword(v: String) { _state.update { it.copy(currentPassword = v) } }
    fun updateNewPassword(v: String) { _state.update { it.copy(newPassword = v) } }
    fun updateTelegram(v: String) { _state.update { it.copy(telegram = v) } }
    fun updatePinInput(v: String) { _state.update { it.copy(pinInput = v.filter { it.isDigit() }.take(4)) } }
    fun updatePinConfirm(v: String) { _state.update { it.copy(pinConfirm = v.filter { it.isDigit() }.take(4)) } }
    fun updateDeleteConfirm(v: String) { _state.update { it.copy(deleteConfirm = v) } }

    fun saveProfileDetails() {
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            val s = _state.value
            userRepository.updateSettings(
                UpdateSettingsRequest(
                    about = s.bio.ifBlank { null },
                    telegramUsername = s.telegram.ifBlank { null },
                ),
            ).onSuccess { user -> _state.update { it.copy(saving = false, user = user, saved = true) } }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun savePin() {
        val s = _state.value
        if (s.pinInput.length != 4 || s.pinInput != s.pinConfirm) {
            _state.update { it.copy(error = "PIN 4 raqam va mos kelishi kerak") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            pinRepository.setPin(s.pinInput)
                .onSuccess { _state.update { it.copy(saving = false, saved = true, pinInput = "", pinConfirm = "") } }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun deleteAccount(onDone: () -> Unit) {
        if (_state.value.deleteConfirm != "DELETE") {
            _state.update { it.copy(error = "Tasdiqlash uchun DELETE yozing") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            userRepository.deleteAccount()
                .onSuccess { onDone() }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun saveProfile() {
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            val s = _state.value
            userRepository.updateSettings(
                UpdateSettingsRequest(name = s.name, bio = s.bio.ifBlank { null }),
            ).onSuccess { user ->
                _state.update { it.copy(saving = false, user = user, saved = true) }
            }.onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun savePreferences() {
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            val s = _state.value
            userRepository.updateSettings(
                UpdateSettingsRequest(
                    language = s.language,
                    translationMode = s.translationMode,
                    status = s.status,
                ),
            ).onSuccess { user ->
                _state.update { it.copy(saving = false, user = user, saved = true) }
            }.onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun savePassword() {
        val s = _state.value
        if (s.newPassword.length < 6) {
            _state.update { it.copy(error = "Yangi parol kamida 6 belgi") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            userRepository.changePassword(s.currentPassword, s.newPassword)
                .onSuccess {
                    _state.update {
                        it.copy(saving = false, saved = true, currentPassword = "", newPassword = "")
                    }
                }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }
}
