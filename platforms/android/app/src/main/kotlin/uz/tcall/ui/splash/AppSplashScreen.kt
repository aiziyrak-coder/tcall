package uz.tcall.ui.splash

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun AppSplashScreen() {
    var show by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { show = true }

    Box(Modifier.fillMaxSize()) {
        CosmicStarfield(Modifier.fillMaxSize())

        AnimatedVisibility(
            visible = show,
            enter = fadeIn(tween(700)) + slideInVertically(tween(700)) { it / 4 },
            modifier = Modifier.align(Alignment.Center),
        ) {
            CosmicBrandTitle(
                modifier = Modifier.padding(horizontal = 32.dp),
                compact = false,
                animate = true,
            )
        }
    }
}
