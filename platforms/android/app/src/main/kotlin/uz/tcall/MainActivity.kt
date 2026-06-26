package uz.tcall

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import uz.tcall.push.TcallFirebaseMessagingService
import uz.tcall.ui.TcallAppRoot
import uz.tcall.ui.theme.TcallTheme

class MainActivity : ComponentActivity() {
    private var pendingRoomId: String? = null
    private var pendingConversationId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        handleIntent(intent)

        val app = application as TcallApplication

        setContent {
            TcallTheme {
                TcallAppRoot(
                    sessionStore = app.sessionStore,
                    authRepository = app.authRepository,
                    initialRoomId = pendingRoomId,
                    initialConversationId = pendingConversationId,
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        intent ?: return
        val roomFromExtra = intent.getStringExtra(TcallFirebaseMessagingService.EXTRA_ROOM_ID)
        val convFromExtra = intent.getStringExtra(TcallFirebaseMessagingService.EXTRA_CONVERSATION_ID)
        if (!roomFromExtra.isNullOrBlank()) {
            pendingRoomId = roomFromExtra
            return
        }
        if (!convFromExtra.isNullOrBlank()) {
            pendingConversationId = convFromExtra
            return
        }
        val data: Uri? = intent.data
        if (data != null) {
            when {
                data.host == "call" && data.scheme == "tcall" -> {
                    pendingRoomId = data.path?.trim('/')?.uppercase()
                }
                data.path?.startsWith("/call/") == true -> {
                    pendingRoomId = data.lastPathSegment?.uppercase()
                }
            }
        }
    }

}
