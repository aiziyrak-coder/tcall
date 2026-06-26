package uz.tcall.ui.interpreter

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uz.tcall.audio.InterpreterAudioRecorder

data class InterpreterUiState(
    val recording: Boolean = false,
    val processing: Boolean = false,
    val sourceLang: String = "uz",
    val targetLang: String = "en",
    val original: String? = null,
    val translated: String? = null,
    val error: String? = null,
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

    fun startRecording() {
        if (_state.value.recording || _state.value.processing) return
        if (recorder.startRecording()) {
            recordStartedAt = System.currentTimeMillis()
            _state.value = _state.value.copy(recording = true, error = null)
        } else {
            _state.value = _state.value.copy(error = "Mikrofon ochilmadi")
        }
    }

    fun stopAndProcess() {
        if (!_state.value.recording) return
        val ms = recorder.stopRecording().coerceAtLeast(System.currentTimeMillis() - recordStartedAt)
        _state.value = _state.value.copy(recording = false, processing = true, error = null)
        viewModelScope.launch {
            val s = _state.value
            recorder.process(s.sourceLang, s.targetLang, ms, withSpeech = true)
                .onSuccess { res ->
                    _state.value = _state.value.copy(
                        processing = false,
                        original = res.original,
                        translated = res.translated,
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
