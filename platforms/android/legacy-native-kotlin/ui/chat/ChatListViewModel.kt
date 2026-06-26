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
import uz.tcall.network.ConversationDto
import uz.tcall.socket.TcallSocketManager

data class ChatListUiState(
    val loading: Boolean = true,
    val conversations: List<ConversationDto> = emptyList(),
    val unreadTotal: Int = 0,
    val error: String? = null,
)

class ChatListViewModel(
    private val chatRepository: ChatRepository,
    socketManager: TcallSocketManager,
) : ViewModel() {
    private val _state = MutableStateFlow(ChatListUiState())
    val state: StateFlow<ChatListUiState> = _state.asStateFlow()

    init {
        refresh()
        socketManager.chatMessage.onEach { refresh() }.launchIn(viewModelScope)
    }

    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            chatRepository.loadConversations()
                .onSuccess { (list, unread) ->
                    _state.value = ChatListUiState(loading = false, conversations = list, unreadTotal = unread)
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(loading = false, error = e.message)
                }
        }
    }
}
