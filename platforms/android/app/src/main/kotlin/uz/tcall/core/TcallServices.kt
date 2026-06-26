package uz.tcall.core

import android.content.Context
import com.google.gson.Gson
import uz.tcall.audio.InterpreterAudioRecorder
import uz.tcall.data.AppPreferences
import uz.tcall.data.CallRepository
import uz.tcall.data.ChatRepository
import uz.tcall.data.SessionStore
import uz.tcall.data.PinRepository
import uz.tcall.data.SocialRepository
import uz.tcall.data.SubscriptionRepository
import uz.tcall.data.UserRepository
import uz.tcall.network.ApiClient
import uz.tcall.socket.TcallSocketManager
import uz.tcall.webrtc.WebRtcCallManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

class TcallServices private constructor(
    context: Context,
    val sessionStore: SessionStore,
    val appPreferences: AppPreferences,
    val apiClient: ApiClient,
    val chatRepository: ChatRepository,
    val callRepository: CallRepository,
    val socialRepository: SocialRepository,
    val userRepository: UserRepository,
    val subscriptionRepository: SubscriptionRepository,
    val pinRepository: PinRepository,
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
      val appPreferences = AppPreferences(context)
      // DataStore ni UI dan oldin IO da yuklash — main thread deadlock oldini olish
      runBlocking(Dispatchers.IO) {
        sessionStore.warmUp()
        appPreferences.warmUp()
      }
      val apiClient = ApiClient(sessionStore)
      val socketManager = TcallSocketManager(gson)
      return TcallServices(
        context = context,
        sessionStore = sessionStore,
        appPreferences = appPreferences,
        apiClient = apiClient,
        chatRepository = ChatRepository(apiClient.api),
        callRepository = CallRepository(apiClient.api),
        socialRepository = SocialRepository(apiClient.api),
        userRepository = UserRepository(apiClient.api),
        subscriptionRepository = SubscriptionRepository(apiClient.api),
        pinRepository = PinRepository(apiClient.api),
        socketManager = socketManager,
        webRtcCallManager = WebRtcCallManager(context, socketManager),
        interpreterRecorder = InterpreterAudioRecorder(context, apiClient.api),
        gson = gson,
      )
    }
  }
}
