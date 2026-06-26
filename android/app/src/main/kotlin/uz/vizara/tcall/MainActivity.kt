package uz.vizara.tcall

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import uz.vizara.tcall.ui.TcallAppRoot
import uz.vizara.tcall.ui.theme.TcallTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as TcallApplication

        setContent {
            TcallTheme {
                TcallAppRoot(
                    sessionStore = app.sessionStore,
                    authRepository = app.apiClient.authRepository,
                )
            }
        }
    }
}
