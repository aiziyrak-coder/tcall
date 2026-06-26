package uz.tcall.core

import android.content.Context
import com.google.gson.Gson
import uz.tcall.audio.InterpreterAudioRecorder
import uz.tcall.data.CallRepository
import uz.tcall.data.ChatRepository
import uz.tcall.data.SessionStore
import uz.tcall.network.ApiClient
import uz.tcall.socket.TcallSocketManager
import uz.tcall.webrtc.WebRtcCallManager

class TcallServices private constructor(
    context: Context,
    val sessionStore: SessionStore,
    val apiClient: ApiClient,
    val chatRepository: ChatRepository,
    val callRepository: CallRepository,
    val socketManager: TcallSocketManager,
    val webRtcCallManager: WebRtcCallManager,
    val interpreterRecorder: InterpreterAudioRecorder,
    val gson: Gson,
) {
  companion object {
    @Volatile private var instance: TcallServices? = null

    fun get(context: Context): TcallServices {
      return instance ?: synchronized(this) {
        instance ?: build(context.applicationContext).also { instance = it }
      }
    }

    private fun build(context: Context): TcallServices {
      val gson = Gson()
      val sessionStore = SessionStore(context)
      val apiClient = ApiClient(sessionStore)
      val socketManager = TcallSocketManager(gson)
      return TcallServices(
        context = context,
        sessionStore = sessionStore,
        apiClient = apiClient,
        chatRepository = ChatRepository(apiClient.api),
        callRepository = CallRepository(apiClient.api),
        socketManager = socketManager,
        webRtcCallManager = WebRtcCallManager(context, socketManager),
        interpreterRecorder = InterpreterAudioRecorder(context, apiClient.api),
        gson = gson,
      )
    }
  }
}
