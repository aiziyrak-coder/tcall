package uz.tcall.audio

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

class ChatVoiceRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var startedAt = 0L

    fun start(): Boolean {
        stop()
        return try {
            val file = File(context.cacheDir, "voice_${System.currentTimeMillis()}.m4a")
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
        } catch (_: Exception) {
            stop()
            false
        }
    }

    fun stop(): File? {
        val duration = if (startedAt > 0) System.currentTimeMillis() - startedAt else 0L
        runCatching { recorder?.stop() }
        runCatching { recorder?.release() }
        recorder = null
        startedAt = 0L
        val file = outputFile
        outputFile = null
        return if (file != null && file.length() > 800 && duration > 400) file else {
            file?.delete()
            null
        }
    }

    fun cancel() {
        runCatching { recorder?.stop() }
        runCatching { recorder?.release() }
        recorder = null
        outputFile?.delete()
        outputFile = null
        startedAt = 0L
    }
}
