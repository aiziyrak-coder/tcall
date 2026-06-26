package uz.tcall.ui.friends

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.tcall.data.SocialRepository
import uz.tcall.network.BlockDto
import uz.tcall.network.ContactDto
import uz.tcall.network.IncomingFriendRequestDto
import uz.tcall.network.LookupUserDto

data class FriendsUiState(
    val loading: Boolean = true,
    val friends: List<ContactDto> = emptyList(),
    val blocks: List<BlockDto> = emptyList(),
    val incoming: List<IncomingFriendRequestDto> = emptyList(),
    val searchDigits: String = "",
    val searching: Boolean = false,
    val searchResult: LookupUserDto? = null,
    val searchError: String? = null,
    val actionError: String? = null,
    val actionLoading: Boolean = false,
    val showBlacklist: Boolean = false,
    val blockInput: String = "",
)

class FriendsViewModel(
    private val socialRepository: SocialRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(FriendsUiState())
    val state: StateFlow<FriendsUiState> = _state.asStateFlow()
    private var searchJob: Job? = null

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, actionError = null) }
            val friends = socialRepository.loadFriends().getOrElse { emptyList() }
            val blocks = socialRepository.loadBlocks().getOrElse { emptyList() }
            val incoming = socialRepository.loadIncomingRequests().getOrElse { emptyList() }
            _state.update { it.copy(loading = false, friends = friends, blocks = blocks, incoming = incoming) }
        }
    }

    fun toggleBlacklist() {
        _state.update { it.copy(showBlacklist = !it.showBlacklist) }
    }

    fun onBlockInputChange(raw: String) {
        _state.update { it.copy(blockInput = raw.filter { it.isDigit() }.take(9)) }
    }

    fun blockUser() {
        val tcallId = _state.value.blockInput
        if (tcallId.length != 9) return
        viewModelScope.launch {
            _state.update { it.copy(actionLoading = true, actionError = null) }
            socialRepository.blockUser(tcallId)
                .onSuccess { _state.update { it.copy(blockInput = "") }; refresh() }
                .onFailure { e -> _state.update { it.copy(actionError = e.message) } }
            _state.update { it.copy(actionLoading = false) }
        }
    }

    fun onSearchChange(raw: String) {
        val digits = raw.filter { it.isDigit() }.take(9)
        _state.update { it.copy(searchDigits = digits, searchError = null, searchResult = null) }
        searchJob?.cancel()
        if (digits.length != 9) return
        searchJob = viewModelScope.launch {
            delay(350)
            _state.update { it.copy(searching = true) }
            socialRepository.lookup(digits)
                .onSuccess { user ->
                    _state.update {
                        it.copy(
                            searching = false,
                            searchResult = user,
                            searchError = if (user == null) "Raqam topilmadi" else null,
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(searching = false, searchError = e.message) }
                }
        }
    }

    fun sendFriendRequest(tcallId: String, name: String) {
        viewModelScope.launch {
            _state.update { it.copy(actionLoading = true, actionError = null) }
            socialRepository.sendFriendRequest(tcallId, name)
                .onSuccess { refresh() }
                .onFailure { e -> _state.update { it.copy(actionError = e.message) } }
            _state.update { it.copy(actionLoading = false) }
        }
    }

    fun respond(senderTcallId: String, accept: Boolean) {
        viewModelScope.launch {
            _state.update { it.copy(actionLoading = true, actionError = null) }
            socialRepository.respondRequest(senderTcallId, accept)
                .onSuccess { refresh() }
                .onFailure { e -> _state.update { it.copy(actionError = e.message) } }
            _state.update { it.copy(actionLoading = false) }
        }
    }

    fun removeFriend(contactId: String) {
        viewModelScope.launch {
            _state.update { it.copy(actionLoading = true, actionError = null) }
            socialRepository.removeFriend(contactId)
                .onSuccess { refresh() }
                .onFailure { e -> _state.update { it.copy(actionError = e.message) } }
            _state.update { it.copy(actionLoading = false) }
        }
    }

    fun unblock(tcallId: String) {
        viewModelScope.launch {
            socialRepository.unblockUser(tcallId).onSuccess { refresh() }
        }
    }
}
