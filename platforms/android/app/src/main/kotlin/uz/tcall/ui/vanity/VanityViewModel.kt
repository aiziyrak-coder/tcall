package uz.tcall.ui.vanity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.tcall.data.UserRepository
import uz.tcall.network.VanityNumberDto

data class VanityUiState(
    val loading: Boolean = true,
    val numbers: List<VanityNumberDto> = emptyList(),
    val ownedNumber: String? = null,
    val pendingRequest: String? = null,
    val search: String = "",
    val tier: String = "all",
    val mode: String = "catalog",
    val tierCounts: Map<String, Int> = emptyMap(),
    val error: String? = null,
    val requesting: Boolean = false,
    val checkResult: String? = null,
)

class VanityViewModel(private val userRepository: UserRepository) : ViewModel() {
    private val _state = MutableStateFlow(VanityUiState())
    val state: StateFlow<VanityUiState> = _state.asStateFlow()

    init { load() }

    fun setMode(mode: String) {
        _state.update { it.copy(mode = mode, search = "", checkResult = null) }
        if (mode == "catalog") load() else _state.update { it.copy(numbers = emptyList()) }
    }

    fun setTier(tier: String) {
        _state.update { it.copy(tier = tier) }
        load()
    }

    fun load(q: String? = null) {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val tier = _state.value.tier.takeIf { it != "all" }
            userRepository.vanityNumbers(q = q?.filter { it.isDigit() }, tier = tier)
                .onSuccess { res ->
                    _state.update {
                        it.copy(
                            loading = false,
                            numbers = res.numbers.orEmpty(),
                            ownedNumber = res.owned?.number,
                            pendingRequest = res.pendingRequest?.number,
                            tierCounts = res.tierCounts.orEmpty(),
                        )
                    }
                }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun onSearchChange(v: String) {
        val digits = v.filter { it.isDigit() }.take(9)
        _state.update { it.copy(search = digits, checkResult = null) }
        if (_state.value.mode == "custom") {
            if (digits.length == 9) checkCustom(digits) else _state.update { it.copy(checkResult = null) }
        } else if (digits.length >= 2) {
            load(digits)
        } else if (digits.isEmpty()) {
            load()
        }
    }

    fun requestNumber(number: String) {
        viewModelScope.launch {
            _state.update { it.copy(requesting = true, error = null) }
            userRepository.requestNumber(number)
                .onSuccess { load() }
                .onFailure { e -> _state.update { it.copy(requesting = false, error = e.message) } }
            _state.update { it.copy(requesting = false) }
        }
    }

    private fun checkCustom(number: String) {
        viewModelScope.launch {
            userRepository.checkNumber(number)
                .onSuccess { res ->
                    val msg = when {
                        res?.taken == true -> "Band"
                        res?.available == true -> "Mavjud — ${res.tier} ($${res.price})"
                        else -> res?.error ?: "Noto'g'ri raqam"
                    }
                    _state.update { it.copy(checkResult = msg) }
                }
        }
    }
}
