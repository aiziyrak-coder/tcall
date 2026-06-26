package uz.tcall.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import uz.tcall.data.ChatRepository
import uz.tcall.network.ChatMessageDto
import uz.tcall.socket.TcallSocketManager
import java.io.File

data class ReplyTarget(
    val messageId: String,
    val senderName: String,
    val preview: String,
)

data class ChatThreadUiState(
    val loading: Boolean = true,
    val messages: List<ChatMessageDto> = emptyList(),
    val sending: Boolean = false,
    val uploading: Boolean = false,
    val recordingVoice: Boolean = false,
    val showEmoji: Boolean = false,
    val peerTyping: Boolean = false,
    val peerDraft: String = "",
    val replyTo: ReplyTarget? = null,
    val editingMessageId: String? = null,
    val selectedMessageId: String? = null,
    val pinned: Boolean = false,
    val error: String? = null,
)

class ChatThreadViewModel(
    val conversationId: String,
    private val myUserId: String,
    private val chatRepository: ChatRepository,
    private val socketManager: TcallSocketManager,
) : ViewModel() {
    private val _state = MutableStateFlow(ChatThreadUiState())
    val state: StateFlow<ChatThreadUiState> = _state.asStateFlow()
    private var typingJob: Job? = null
    private var lastTypingEmit = 0L

    init {
        load()
        viewModelScope.launch { chatRepository.markRead(conversationId) }

        socketManager.chatMessage.onEach { event ->
            if (event.conversationId == conversationId) {
                upsertMessage(event.message)
                viewModelScope.launch { chatRepository.markRead(conversationId) }
            }
        }.launchIn(viewModelScope)

        socketManager.chatTyping.onEach { event ->
            if (event.conversationId != conversationId || event.userId == myUserId) return@onEach
            _state.value = _state.value.copy(
                peerTyping = event.typing,
                peerDraft = if (event.typing) event.draft.orEmpty() else "",
            )
        }.launchIn(viewModelScope)

        socketManager.chatMessageDeleted.onEach { event ->
            if (event.conversationId != conversationId) return@onEach
            markMessageDeleted(event.messageId)
        }.launchIn(viewModelScope)

        socketManager.chatMessageEdited.onEach { event ->
            if (event.conversationId != conversationId) return@onEach
            replaceMessage(event.message)
        }.launchIn(viewModelScope)
    }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            chatRepository.loadMessages(conversationId)
                .onSuccess { msgs ->
                    _state.value = _state.value.copy(loading = false, messages = msgs.reversed())
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(loading = false, error = e.message)
                }
        }
    }

    fun send(text: String) {
        val trimmed = text.trim()
        if (trimmed.isBlank() || _state.value.sending) return
        val editingId = _state.value.editingMessageId
        val replyId = _state.value.replyTo?.messageId

        viewModelScope.launch {
            _state.value = _state.value.copy(sending = true)
            if (editingId != null) {
                chatRepository.editMessage(conversationId, editingId, trimmed)
                    .onSuccess { replaceMessage(it) }
                    .onFailure { e -> _state.value = _state.value.copy(error = e.message) }
                _state.value = _state.value.copy(editingMessageId = null)
            } else {
                chatRepository.sendMessage(conversationId, trimmed, replyId)
                    .onSuccess { upsertMessage(it) }
                    .onFailure { e -> _state.value = _state.value.copy(error = e.message) }
                _state.value = _state.value.copy(replyTo = null)
            }
            _state.value = _state.value.copy(sending = false)
            socketManager.emitChatTypingStop(conversationId)
        }
    }

    fun setReply(msg: ChatMessageDto) {
        if (msg.deleted == true) return
        val preview = msg.displayText ?: msg.originalText ?: ""
        _state.value = _state.value.copy(
            replyTo = ReplyTarget(msg.id, msg.sender.name, preview),
            editingMessageId = null,
            selectedMessageId = msg.id,
        )
    }

    fun clearReply() {
        _state.value = _state.value.copy(replyTo = null)
    }

    fun startEdit(msg: ChatMessageDto) {
        if (msg.sender.id != myUserId || msg.deleted == true || msg.type != "text") return
        _state.value = _state.value.copy(
            editingMessageId = msg.id,
            replyTo = null,
            selectedMessageId = msg.id,
        )
    }

    fun cancelEdit() {
        _state.value = _state.value.copy(editingMessageId = null)
    }

    fun deleteMessage(msg: ChatMessageDto) {
        viewModelScope.launch {
            chatRepository.deleteMessage(conversationId, msg.id)
                .onSuccess { markMessageDeleted(msg.id) }
                .onFailure { e -> _state.value = _state.value.copy(error = e.message) }
        }
    }

    fun selectMessage(msg: ChatMessageDto) {
        _state.value = _state.value.copy(
            selectedMessageId = if (_state.value.selectedMessageId == msg.id) null else msg.id,
        )
    }

    fun pinConversation(pinned: Boolean) {
        viewModelScope.launch {
            chatRepository.pinConversation(conversationId, pinned)
                .onSuccess { _state.value = _state.value.copy(pinned = pinned) }
                .onFailure { e -> _state.value = _state.value.copy(error = e.message) }
        }
    }

    fun appendEmoji(emoji: String, current: String, onUpdate: (String) -> Unit) {
        onUpdate(current + emoji)
    }

    fun toggleEmoji() {
        _state.value = _state.value.copy(showEmoji = !_state.value.showEmoji)
    }

    fun onDraftChanged(text: String) {
        if (text.isBlank()) {
            socketManager.emitChatTypingStop(conversationId)
            typingJob?.cancel()
            return
        }
        val now = System.currentTimeMillis()
        if (now - lastTypingEmit > 280) {
            socketManager.emitChatTyping(conversationId, text)
            lastTypingEmit = now
        }
        typingJob?.cancel()
        typingJob = viewModelScope.launch {
            delay(2500)
            socketManager.emitChatTypingStop(conversationId)
        }
    }

    fun uploadFile(file: File, mime: String, name: String) {
        if (_state.value.uploading) return
        viewModelScope.launch {
            _state.value = _state.value.copy(uploading = true, error = null)
            chatRepository.uploadAndSend(conversationId, file, mime, name)
                .onSuccess { upsertMessage(it) }
                .onFailure { e -> _state.value = _state.value.copy(error = e.message) }
            _state.value = _state.value.copy(uploading = false)
        }
    }

    fun setRecordingVoice(recording: Boolean) {
        _state.value = _state.value.copy(recordingVoice = recording)
    }

    fun deleteChat(onDone: () -> Unit) {
        viewModelScope.launch {
            chatRepository.deleteConversation(conversationId)
                .onSuccess { onDone() }
                .onFailure { e -> _state.value = _state.value.copy(error = e.message) }
        }
    }

    private fun upsertMessage(msg: ChatMessageDto) {
        val current = _state.value.messages
        if (current.any { it.id == msg.id }) {
            replaceMessage(msg)
            return
        }
        _state.value = _state.value.copy(messages = current + msg)
    }

    private fun replaceMessage(msg: ChatMessageDto) {
        _state.value = _state.value.copy(
            messages = _state.value.messages.map { if (it.id == msg.id) msg else it },
        )
    }

    private fun markMessageDeleted(messageId: String) {
        _state.value = _state.value.copy(
            messages = _state.value.messages.map { m ->
                if (m.id != messageId) m
                else m.copy(
                    deleted = true,
                    displayText = "Xabar o'chirildi",
                    originalText = null,
                    hasTranslation = false,
                )
            },
        )
    }

    fun isMine(msg: ChatMessageDto) = msg.sender.id == myUserId
}
