package uz.tcall.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.tcall.data.SessionStore
import uz.tcall.data.UserRepository
import uz.tcall.network.TelegramStatusResponse
import uz.tcall.network.UpdateSettingsRequest
import uz.tcall.network.UserDto
import uz.tcall.network.UserSettingsDto
import java.io.File

data class SettingsUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val user: UserSettingsDto? = null,
    val error: String? = null,
    val saved: Boolean = false,
    val section: SettingsSection = SettingsSection.OVERVIEW,
    val name: String = "",
    val language: String = "uz",
    val translationMode: String = "text",
    val status: String = "available",
    val bio: String = "",
    val about: String = "",
    val interests: String = "",
    val skills: String = "",
    val age: String = "",
    val city: String = "",
    val country: String = "",
    val address: String = "",
    val workplace: String = "",
    val education: String = "",
    val graduatedFrom: String = "",
    val profession: String = "",
    val telegram: String = "",
    val avatarUrl: String? = null,
    val uploadingAvatar: Boolean = false,
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val pinCurrent: String = "",
    val pinInput: String = "",
    val pinConfirm: String = "",
    val pinFaceImage: String? = null,
    val pinEnabled: Boolean = false,
    val pinFaceEnrolled: Boolean = false,
    val pinLoading: Boolean = false,
    val telegramStatus: TelegramStatusResponse? = null,
    val telegramBusy: Boolean = false,
    val deletePassword: String = "",
    val logoutConfirm: String = "",
    val deleteOpen: Boolean = false,
)

enum class SettingsSection {
    OVERVIEW, PROFILE, PROFILE_DETAILS, PREFERENCES, NOTIFICATIONS, PASSWORD, PIN, SECURITY,
}

class SettingsViewModel(
    private val userRepository: UserRepository,
    private val pinRepository: uz.tcall.data.PinRepository,
    private val sessionStore: SessionStore,
    private val onUserUpdated: (UserDto) -> Unit = {},
) : ViewModel() {
    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    private var profileLoaded = false

    fun ensureLoaded() {
        if (profileLoaded && _state.value.user != null && _state.value.error == null) return
        profileLoaded = true
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val cached = sessionStore.cachedUser()
            if (cached != null && _state.value.user == null) {
                applyUser(sessionFromCache(cached), syncToMain = false)
            }
            userRepository.getSettings()
                .onSuccess { user -> applyUser(mergeWithSession(user, cached)) }
                .onFailure { e ->
                    if (cached != null) {
                        applyUser(sessionFromCache(cached), syncToMain = false)
                    } else {
                        _state.update { it.copy(loading = false, error = e.message) }
                    }
                }
        }
    }

    private fun sessionFromCache(cached: UserDto): UserSettingsDto = UserSettingsDto(
        id = cached.userId,
        userId = cached.userId,
        email = cached.email,
        name = cached.name,
        tcallId = cached.tcallId,
        language = cached.language,
        translationMode = cached.translationMode,
    )

    private fun mergeWithSession(user: UserSettingsDto, cached: UserDto?): UserSettingsDto {
        if (cached == null) return user
        return user.copy(
            id = user.id?.takeIf { it.isNotBlank() } ?: cached.userId,
            userId = user.userId?.takeIf { it.isNotBlank() } ?: cached.userId,
            name = user.name?.takeIf { it.isNotBlank() } ?: cached.name,
            email = user.email?.takeIf { it.isNotBlank() } ?: cached.email,
            tcallId = user.tcallId?.takeIf { it.isNotBlank() } ?: cached.tcallId,
            language = user.language?.takeIf { it.isNotBlank() } ?: cached.language,
            translationMode = user.translationMode?.takeIf { it.isNotBlank() } ?: cached.translationMode,
        )
    }

    private fun applyUser(user: UserSettingsDto, syncToMain: Boolean = false) {
        val userId = user.resolvedId()
        val userName = user.resolvedName()
        if (userId.isBlank() || userName.isBlank()) {
            _state.update { it.copy(loading = false, error = "Profil ma'lumotlari to'liq emas") }
            return
        }
        val normalized = user.copy(id = userId, userId = userId, name = userName)
        _state.update {
            it.copy(
                loading = false,
                user = normalized,
                name = normalized.name.orEmpty(),
                language = user.language ?: "uz",
                translationMode = user.translationMode ?: "text",
                status = user.status ?: "available",
                bio = user.bio.orEmpty(),
                about = user.about.orEmpty(),
                interests = user.interests.orEmpty(),
                skills = user.skills.orEmpty(),
                age = user.age?.toString().orEmpty(),
                city = user.city.orEmpty(),
                country = user.country.orEmpty(),
                address = user.address.orEmpty(),
                workplace = user.workplace.orEmpty(),
                education = user.education.orEmpty(),
                graduatedFrom = user.graduatedFrom.orEmpty(),
                profession = user.profession.orEmpty(),
                telegram = user.telegramUsername.orEmpty(),
                avatarUrl = user.avatarUrl,
            )
        }
        if (syncToMain) syncSession(normalized)
    }

    private fun syncSession(user: UserSettingsDto) {
        val token = sessionStore.getTokenSync() ?: return
        val userId = user.resolvedId()
        if (userId.isBlank()) return
        val name = user.name.orEmpty()
        val email = user.email.orEmpty()
        val language = user.language ?: "uz"
        val dto = UserDto(
            userId = userId,
            email = email,
            name = name,
            language = language,
            tcallId = user.tcallId.orEmpty(),
        )
        onUserUpdated(dto)
        viewModelScope.launch {
            sessionStore.saveSession(token, dto)
        }
    }

    fun navigate(section: SettingsSection) {
        _state.update { it.copy(section = section, saved = false, error = null) }
        when (section) {
            SettingsSection.PIN -> loadPinStatus()
            SettingsSection.NOTIFICATIONS -> loadTelegramStatus()
            else -> {}
        }
    }

    fun updateName(v: String) { _state.update { it.copy(name = v) } }
    fun updateBio(v: String) { _state.update { it.copy(bio = v) } }
    fun updateAbout(v: String) { _state.update { it.copy(about = v) } }
    fun updateInterests(v: String) { _state.update { it.copy(interests = v) } }
    fun updateSkills(v: String) { _state.update { it.copy(skills = v) } }
    fun updateAge(v: String) { _state.update { it.copy(age = v.filter { it.isDigit() }.take(3)) } }
    fun updateCity(v: String) { _state.update { it.copy(city = v) } }
    fun updateCountry(v: String) { _state.update { it.copy(country = v) } }
    fun updateAddress(v: String) { _state.update { it.copy(address = v) } }
    fun updateWorkplace(v: String) { _state.update { it.copy(workplace = v) } }
    fun updateEducation(v: String) { _state.update { it.copy(education = v) } }
    fun updateGraduatedFrom(v: String) { _state.update { it.copy(graduatedFrom = v) } }
    fun updateProfession(v: String) { _state.update { it.copy(profession = v) } }
    fun updateLanguage(v: String) { _state.update { it.copy(language = v) } }
    fun updateTranslationMode(v: String) { _state.update { it.copy(translationMode = v) } }
    fun updateStatus(v: String) { _state.update { it.copy(status = v) } }
    fun updateCurrentPassword(v: String) { _state.update { it.copy(currentPassword = v) } }
    fun updateNewPassword(v: String) { _state.update { it.copy(newPassword = v) } }
    fun updateConfirmPassword(v: String) { _state.update { it.copy(confirmPassword = v) } }
    fun updateTelegram(v: String) { _state.update { it.copy(telegram = v.replace("@", "")) } }
    fun updatePinCurrent(v: String) { _state.update { it.copy(pinCurrent = v.filter { it.isDigit() }.take(4)) } }
    fun updatePinInput(v: String) { _state.update { it.copy(pinInput = v.filter { it.isDigit() }.take(4)) } }
    fun updatePinConfirm(v: String) { _state.update { it.copy(pinConfirm = v.filter { it.isDigit() }.take(4)) } }
    fun updatePinFaceImage(v: String?) { _state.update { it.copy(pinFaceImage = v) } }
    fun updateDeletePassword(v: String) { _state.update { it.copy(deletePassword = v) } }
    fun updateLogoutConfirm(v: String) { _state.update { it.copy(logoutConfirm = v) } }
    fun setDeleteOpen(open: Boolean) { _state.update { it.copy(deleteOpen = open) } }

    fun uploadAvatar(file: File, mime: String, name: String) {
        viewModelScope.launch {
            _state.update { it.copy(uploadingAvatar = true, error = null) }
            userRepository.uploadAvatar(file, mime, name)
                .onSuccess { url -> _state.update { it.copy(uploadingAvatar = false, avatarUrl = url, saved = true) } }
                .onFailure { e -> _state.update { it.copy(uploadingAvatar = false, error = e.message) } }
        }
    }

    fun removeAvatar() {
        viewModelScope.launch {
            _state.update { it.copy(uploadingAvatar = true, error = null) }
            userRepository.deleteAvatar()
                .onSuccess { _state.update { it.copy(uploadingAvatar = false, avatarUrl = null, saved = true) } }
                .onFailure { e -> _state.update { it.copy(uploadingAvatar = false, error = e.message) } }
        }
    }

    fun loadPinStatus() {
        viewModelScope.launch {
            _state.update { it.copy(pinLoading = true) }
            pinRepository.status()
                .onSuccess { st ->
                    _state.update {
                        it.copy(
                            pinLoading = false,
                            pinEnabled = st.enabled == true,
                            pinFaceEnrolled = st.faceEnrolled == true,
                        )
                    }
                }
                .onFailure { e -> _state.update { it.copy(pinLoading = false, error = e.message) } }
        }
    }

    fun loadTelegramStatus() {
        viewModelScope.launch {
            _state.update { it.copy(telegramBusy = true) }
            userRepository.telegramStatus()
                .onSuccess { st -> _state.update { it.copy(telegramBusy = false, telegramStatus = st) } }
                .onFailure { e -> _state.update { it.copy(telegramBusy = false, error = e.message) } }
        }
    }

    fun connectTelegram(onOpenUrl: (String) -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(telegramBusy = true, error = null) }
            userRepository.linkTelegram()
                .onSuccess { link ->
                    _state.update { it.copy(telegramBusy = false) }
                    link.url?.let(onOpenUrl)
                    loadTelegramStatus()
                }
                .onFailure { e -> _state.update { it.copy(telegramBusy = false, error = e.message) } }
        }
    }

    fun disconnectTelegram() {
        viewModelScope.launch {
            _state.update { it.copy(telegramBusy = true, error = null) }
            userRepository.unlinkTelegram()
                .onSuccess { loadTelegramStatus() }
                .onFailure { e -> _state.update { it.copy(telegramBusy = false, error = e.message) } }
        }
    }

    fun saveProfile() = save(UpdateSettingsRequest(name = _state.value.name, bio = _state.value.bio.blankOrNull()))

    fun saveProfileDetails() {
        val s = _state.value
        val ageNum = s.age.toIntOrNull()?.coerceIn(13, 120)
        save(
            UpdateSettingsRequest(
                age = ageNum,
                city = s.city.blankOrNull(),
                country = s.country.blankOrNull(),
                address = s.address.blankOrNull(),
                workplace = s.workplace.blankOrNull(),
                education = s.education.blankOrNull(),
                graduatedFrom = s.graduatedFrom.blankOrNull(),
                profession = s.profession.blankOrNull(),
            ),
        )
    }

    fun saveMyInfo() {
        val s = _state.value
        save(
            UpdateSettingsRequest(
                name = s.name,
                bio = s.bio.blankOrNull(),
                about = s.about.blankOrNull(),
                interests = s.interests.blankOrNull(),
                skills = s.skills.blankOrNull(),
            ),
        )
    }

    fun savePreferences() {
        val s = _state.value
        save(
            UpdateSettingsRequest(
                language = s.language,
                translationMode = s.translationMode,
                status = s.status,
                telegramUsername = s.telegram.blankOrNull(),
            ),
        )
    }

    private fun save(body: UpdateSettingsRequest) {
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null, saved = false) }
            userRepository.updateSettings(body)
                .onSuccess { user ->
                    applyUser(user, syncToMain = true)
                    _state.update { it.copy(saving = false, saved = true) }
                }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun savePassword() {
        val s = _state.value
        if (s.currentPassword.isBlank() || s.newPassword.isBlank() || s.confirmPassword.isBlank()) {
            _state.update { it.copy(error = "Barcha parol maydonlarini to'ldiring") }
            return
        }
        if (s.newPassword.length < 8) {
            _state.update { it.copy(error = "Yangi parol kamida 8 belgi") }
            return
        }
        if (!s.newPassword.any { it.isDigit() } || !s.newPassword.any { it.isLetter() }) {
            _state.update { it.copy(error = "Parolda harf va raqam bo'lishi kerak") }
            return
        }
        if (s.newPassword != s.confirmPassword) {
            _state.update { it.copy(error = "Yangi parollar mos emas") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            userRepository.changePassword(s.currentPassword, s.newPassword)
                .onSuccess {
                    _state.update {
                        it.copy(saving = false, saved = true, currentPassword = "", newPassword = "", confirmPassword = "")
                    }
                }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun savePin() {
        val s = _state.value
        if (s.pinInput.length != 4 || s.pinInput != s.pinConfirm) {
            _state.update { it.copy(error = "PIN 4 raqam va mos kelishi kerak") }
            return
        }
        val face = s.pinFaceImage
        if (face.isNullOrBlank() || face.length < 100) {
            _state.update { it.copy(error = "PIN o'rnatish uchun yuz skaneri majburiy") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            pinRepository.setPin(s.pinInput, face)
                .onSuccess {
                    _state.update {
                        it.copy(
                            saving = false,
                            saved = true,
                            pinInput = "",
                            pinConfirm = "",
                            pinFaceImage = null,
                            pinEnabled = true,
                            pinFaceEnrolled = true,
                        )
                    }
                }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun changePin() {
        val s = _state.value
        if (s.pinCurrent.length != 4 || s.pinInput.length != 4 || s.pinInput != s.pinConfirm) {
            _state.update { it.copy(error = "Joriy va yangi PIN to'g'ri kiriting") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            pinRepository.changePin(s.pinCurrent, s.pinInput)
                .onSuccess {
                    _state.update {
                        it.copy(saving = false, saved = true, pinCurrent = "", pinInput = "", pinConfirm = "")
                    }
                }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun disablePin() {
        val pin = _state.value.pinCurrent
        if (pin.length != 4) {
            _state.update { it.copy(error = "Joriy PIN kiriting") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            pinRepository.disable(pin)
                .onSuccess {
                    _state.update {
                        it.copy(saving = false, saved = true, pinEnabled = false, pinCurrent = "")
                    }
                }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }

    fun deleteAccount(onDone: () -> Unit) {
        val pw = _state.value.deletePassword
        if (pw.isBlank()) {
            _state.update { it.copy(error = "Parol kiriting") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(saving = true, error = null) }
            userRepository.deleteAccount(pw)
                .onSuccess { onDone() }
                .onFailure { e -> _state.update { it.copy(saving = false, error = e.message) } }
        }
    }
}

private fun String.blankOrNull(): String? = trim().ifBlank { null }
