package uz.tcall.ui.interpreter

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uz.tcall.audio.InterpreterAudioRecorder

enum class SpeakSide { SELF, PARTNER }

data class InterpreterUiState(
    val recording: Boolean = false,
    val activeSide: SpeakSide? = null,
    val processing: Boolean = false,
    val sourceLang: String = "uz",
    val targetLang: String = "en",
    val original: String? = null,
    val translated: String? = null,
    val history: List<Pair<String?, String?>> = emptyList(),
    val error: String? = null,
    val showLangPicker: Boolean = false,
)

class InterpreterViewModel(
    private val recorder: InterpreterAudioRecorder,
) : ViewModel() {
    private val _state = MutableStateFlow(InterpreterUiState())
    val state: StateFlow<InterpreterUiState> = _state.asStateFlow()
    private var recordStartedAt = 0L

    fun setSourceLang(lang: String) {
        _state.value = _state.value.copy(sourceLang = lang)
    }

    fun setTargetLang(lang: String) {
        _state.value = _state.value.copy(targetLang = lang)
    }

    fun toggleLangPicker(show: Boolean) {
        _state.value = _state.value.copy(showLangPicker = show)
    }

    fun swapLanguages() {
        val s = _state.value
        _state.value = s.copy(sourceLang = s.targetLang, targetLang = s.sourceLang)
    }

    fun startRecording(side: SpeakSide) {
        if (_state.value.recording || _state.value.processing) return
        if (recorder.startRecording()) {
            recordStartedAt = System.currentTimeMillis()
            _state.value = _state.value.copy(recording = true, activeSide = side, error = null)
        } else {
            _state.value = _state.value.copy(error = "Mikrofon ochilmadi")
        }
    }

    fun stopAndProcess() {
        if (!_state.value.recording) return
        val side = _state.value.activeSide ?: SpeakSide.SELF
        val ms = recorder.stopRecording().coerceAtLeast(System.currentTimeMillis() - recordStartedAt)
        _state.value = _state.value.copy(recording = false, activeSide = null, processing = true, error = null)
        viewModelScope.launch {
            val s = _state.value
            val (src, tgt) = when (side) {
                SpeakSide.SELF -> s.sourceLang to s.targetLang
                SpeakSide.PARTNER -> s.targetLang to s.sourceLang
            }
            recorder.process(src, tgt, ms, withSpeech = true)
                .onSuccess { res ->
                    val entry = res.original to res.translated
                    _state.value = _state.value.copy(
                        processing = false,
                        original = res.original,
                        translated = res.translated,
                        history = (listOf(entry) + s.history).take(8),
                    )
                    res.audioBase64?.let { recorder.playBase64Audio(it) }
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(processing = false, error = e.message)
                }
        }
    }

    override fun onCleared() {
        recorder.release()
        super.onCleared()
    }
}
