package uz.tcall.ui.splash

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uz.tcall.ui.components.TcallLogo
import uz.tcall.ui.components.TcallLogoVariant
import uz.tcall.ui.theme.TcallColors

@Composable
fun AppSplashScreen(message: String? = null) {
    var show by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { show = true }

    Box(
        Modifier
            .fillMaxSize()
            .background(TcallColors.BgPrimary),
        contentAlignment = Alignment.Center,
    ) {
        AnimatedVisibility(
            visible = show,
            enter = fadeIn() + scaleIn(initialScale = 0.92f),
        ) {
            TcallLogo(
                variant = TcallLogoVariant.Full,
                width = 260.dp,
                animate = true,
                elevatedPlate = true,
                subtitle = message ?: "Translate · Call · Connect",
            )
        }
    }
}
