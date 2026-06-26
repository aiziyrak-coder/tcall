package uz.tcall.ui.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uz.tcall.ui.components.TcallLogo
import uz.tcall.ui.theme.TcallColors

@Composable
fun AppSplashScreen(message: String? = null) {
    Box(
        Modifier
            .fillMaxSize()
            .background(TcallColors.BgPrimary),
        contentAlignment = Alignment.Center,
    ) {
        TcallLogo(
            variant = uz.tcall.ui.components.TcallLogoVariant.Full,
            width = 220.dp,
            animate = true,
            subtitle = message ?: "Translate · Call · Connect",
        )
    }
}
