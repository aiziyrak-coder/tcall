package uz.tcall.ui.room

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import uz.tcall.BuildConfig
import uz.tcall.data.CallRepository
import uz.tcall.network.RoomStatusParticipantDto

data class RoomUiState(
    val joinCode: String = "",
    val creating: Boolean = false,
    val joining: Boolean = false,
    val error: String? = null,
    val roomId: String = "",
    val roomLink: String = "",
    val participants: List<RoomStatusParticipantDto> = emptyList(),
    val copied: Boolean = false,
)

class RoomViewModel(
    private val callRepository: CallRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(RoomUiState())
    val state: StateFlow<RoomUiState> = _state.asStateFlow()
    private var pollJob: Job? = null

    fun onJoinCodeChange(code: String) {
        _state.update { it.copy(joinCode = code.filter { it.isLetterOrDigit() }.uppercase().take(8), error = null) }
    }

    fun createRoom() {
        viewModelScope.launch {
            _state.update { it.copy(creating = true, error = null) }
            callRepository.createRoom()
                .onSuccess { roomId ->
                    val link = "${BuildConfig.WEB_BASE_URL}/call/$roomId"
                    _state.update {
                        it.copy(
                            creating = false,
                            roomId = roomId,
                            roomLink = link,
                            participants = emptyList(),
                        )
                    }
                    startPolling(roomId)
                }
                .onFailure { e -> _state.update { it.copy(creating = false, error = e.message) } }
        }
    }

    fun createNewRoom() {
        pollJob?.cancel()
        _state.update { it.copy(roomId = "", roomLink = "", participants = emptyList(), copied = false) }
        createRoom()
    }

    fun joinRoom(onJoined: (String) -> Unit) {
        val code = _state.value.joinCode.trim()
        if (code.length < 8) return
        viewModelScope.launch {
            _state.update { it.copy(joining = true, error = null) }
            callRepository.join(code)
                .onSuccess {
                    _state.update { it.copy(joining = false) }
                    onJoined(code)
                }
                .onFailure { e -> _state.update { it.copy(joining = false, error = e.message) } }
        }
    }

    fun markCopied() {
        _state.update { it.copy(copied = true) }
        viewModelScope.launch {
            delay(2000)
            _state.update { it.copy(copied = false) }
        }
    }

    private fun startPolling(roomId: String) {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                callRepository.roomParticipants(roomId)
                    .onSuccess { list -> _state.update { it.copy(participants = list) } }
                delay(3000)
            }
        }
    }

    override fun onCleared() {
        pollJob?.cancel()
        super.onCleared()
    }
}
