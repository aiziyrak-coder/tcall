package uz.tcall.audio

import android.content.Context
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import uz.tcall.network.InterpreterResponse
import uz.tcall.network.TcallApi
import java.io.File

class InterpreterAudioRecorder(
    private val context: Context,
    private val api: TcallApi,
) {
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var startedAt = 0L
    private var player: MediaPlayer? = null

    fun startRecording(): Boolean {
        stopRecording()
        return try {
            val file = File(context.cacheDir, "interp_${System.currentTimeMillis()}.m4a")
            outputFile = file
            recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }
            startedAt = System.currentTimeMillis()
            true
        } catch (e: Exception) {
            stopRecording()
            false
        }
    }

    fun stopRecording(): Long {
        val duration = if (startedAt > 0) System.currentTimeMillis() - startedAt else 0L
        runCatching { recorder?.stop() }
        runCatching { recorder?.release() }
        recorder = null
        startedAt = 0L
        return duration
    }

    suspend fun process(
        sourceLang: String,
        targetLang: String,
        recordMs: Long,
        withSpeech: Boolean = true,
    ): Result<InterpreterResponse> = withContext(Dispatchers.IO) {
        val file = outputFile ?: return@withContext Result.failure(Exception("Audio yo'q"))
        if (file.length() < 1800) return@withContext Result.failure(Exception("Juda qisqa — yana gapiring"))

        runCatching {
            val part = MultipartBody.Part.createFormData(
                "audio",
                file.name,
                file.asRequestBody("audio/mp4".toMediaType()),
            )
            val res = api.interpreterProcess(
                audio = part,
                sourceLang = sourceLang.toRequestBody("text/plain".toMediaType()),
                targetLang = targetLang.toRequestBody("text/plain".toMediaType()),
                withSpeech = (if (withSpeech) "true" else "false").toRequestBody("text/plain".toMediaType()),
                recordMs = recordMs.toString().toRequestBody("text/plain".toMediaType()),
            )
            if (!res.isSuccessful) throw Exception(res.errorBody()?.string() ?: "Tarjima xatosi")
            res.body() ?: throw Exception("Bo'sh javob")
        }
    }

    fun playBase64Audio(base64: String, onDone: () -> Unit = {}) {
        stopPlayback()
        try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            val temp = File.createTempFile("tts", ".mp3", context.cacheDir)
            temp.writeBytes(bytes)
            player = MediaPlayer().apply {
                setDataSource(temp.absolutePath)
                setOnCompletionListener {
                    temp.delete()
                    onDone()
                }
                prepare()
                start()
            }
        } catch (_: Exception) {
            onDone()
        }
    }

    fun stopPlayback() {
        runCatching { player?.stop() }
        runCatching { player?.release() }
        player = null
    }

    fun release() {
        stopRecording()
        stopPlayback()
        outputFile?.delete()
        outputFile = null
    }
}
