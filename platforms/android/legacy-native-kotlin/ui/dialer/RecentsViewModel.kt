package uz.tcall.ui.dialer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.tcall.data.CallRepository
import uz.tcall.network.CallHistoryDto

data class RecentsUiState(
    val loading: Boolean = true,
    val calls: List<CallHistoryDto> = emptyList(),
    val filter: String = "all",
    val search: String = "",
    val error: String? = null,
)

class RecentsViewModel(
    private val callRepository: CallRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(RecentsUiState())
    val state: StateFlow<RecentsUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            callRepository.callHistory()
                .onSuccess { calls -> _state.update { it.copy(loading = false, calls = calls) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun setFilter(filter: String) {
        _state.update { it.copy(filter = filter) }
    }

    fun setSearch(q: String) {
        _state.update { it.copy(search = q) }
    }
}
