package uz.tcall.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import uz.tcall.data.ChatRepository
import uz.tcall.network.ChatMessageDto
import uz.tcall.socket.TcallSocketManager

data class ChatThreadUiState(
    val loading: Boolean = true,
    val messages: List<ChatMessageDto> = emptyList(),
    val sending: Boolean = false,
    val error: String? = null,
)

class ChatThreadViewModel(
    val conversationId: String,
    private val myUserId: String,
    private val chatRepository: ChatRepository,
    socketManager: TcallSocketManager,
) : ViewModel() {
    private val _state = MutableStateFlow(ChatThreadUiState())
    val state: StateFlow<ChatThreadUiState> = _state.asStateFlow()

    init {
        load()
        viewModelScope.launch { chatRepository.markRead(conversationId) }
        socketManager.chatMessage.onEach { event ->
            if (event.conversationId == conversationId) {
                appendMessage(event.message)
                viewModelScope.launch { chatRepository.markRead(conversationId) }
            }
        }.launchIn(viewModelScope)
    }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            chatRepository.loadMessages(conversationId)
                .onSuccess { msgs ->
                    _state.value = ChatThreadUiState(loading = false, messages = msgs.reversed())
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(loading = false, error = e.message)
                }
        }
    }

    fun send(text: String) {
        if (text.isBlank() || _state.value.sending) return
        viewModelScope.launch {
            _state.value = _state.value.copy(sending = true)
            chatRepository.sendMessage(conversationId, text)
                .onSuccess { msg -> appendMessage(msg) }
                .onFailure { e -> _state.value = _state.value.copy(error = e.message) }
            _state.value = _state.value.copy(sending = false)
        }
    }

    private fun appendMessage(msg: ChatMessageDto) {
        val current = _state.value.messages
        if (current.any { it.id == msg.id }) return
        _state.value = _state.value.copy(messages = current + msg)
    }

    fun isMine(msg: ChatMessageDto) = msg.sender.id == myUserId
}
