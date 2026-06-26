package uz.tcall.ui.dialer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uz.tcall.data.CallRepository
import uz.tcall.data.ChatRepository

data class DialerUiState(
    val digits: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val roomId: String? = null,
)

class DialerViewModel(
    private val callRepository: CallRepository,
    private val chatRepository: ChatRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(DialerUiState())
    val state: StateFlow<DialerUiState> = _state.asStateFlow()

    fun setDigits(raw: String) {
        val digits = raw.filter { it.isDigit() }.take(9)
        _state.value = _state.value.copy(digits = digits, error = null)
    }

    fun append(d: String) {
        val cur = _state.value.digits
        if (cur.length >= 9) return
        _state.value = _state.value.copy(digits = cur + d, error = null)
    }

    fun backspace() {
        val cur = _state.value.digits
        if (cur.isEmpty()) return
        _state.value = _state.value.copy(digits = cur.dropLast(1), error = null)
    }

    fun clear() {
        _state.value = DialerUiState()
    }

    fun dial(onRoom: (String) -> Unit) {
        val id = _state.value.digits
        if (id.length != 9) {
            _state.value = _state.value.copy(error = "9 xonali raqam kiriting")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            callRepository.dial(id)
                .onSuccess { roomId ->
                    _state.value = _state.value.copy(loading = false, roomId = roomId)
                    onRoom(roomId)
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(loading = false, error = e.message)
                }
        }
    }

    fun openChat(onChat: (String) -> Unit) {
        val id = _state.value.digits
        if (id.length != 9) {
            _state.value = _state.value.copy(error = "9 xonali raqam kiriting")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            chatRepository.openDirectChat(id)
                .onSuccess { convId ->
                    _state.value = _state.value.copy(loading = false)
                    onChat(convId)
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(loading = false, error = e.message)
                }
        }
    }
}
