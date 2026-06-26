package uz.tcall.ui.splash

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.R

private const val LOGO_ASPECT = 743f / 159f

@Composable
fun AppSplashScreen(
    tagline: String = "Tarjima · Qo'ng'iroq · Chat",
    caption: String = "Dunyo bilan o'z tilingizda",
) {
    var show by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { show = true }

    val transition = rememberInfiniteTransition(label = "logoFloat")
    val floatY by transition.animateFloat(
        initialValue = 0f,
        targetValue = -6f,
        animationSpec = infiniteRepeatable(tween(2200), RepeatMode.Reverse),
        label = "floatY",
    )
    val glow by transition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1800), RepeatMode.Reverse),
        label = "glow",
    )

    Box(Modifier.fillMaxSize()) {
        CosmicStarfield(Modifier.fillMaxSize())

        AnimatedVisibility(
            visible = show,
            enter = fadeIn(tween(700)) + slideInVertically(tween(700)) { it / 4 },
            modifier = Modifier.align(Alignment.Center),
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(horizontal = 32.dp),
            ) {
                Image(
                    painter = painterResource(R.drawable.tcall_logo_full),
                    contentDescription = "Tcall",
                    modifier = Modifier
                        .width(220.dp)
                        .height(220.dp / LOGO_ASPECT)
                        .graphicsLayer {
                            translationY = floatY
                            scaleX = glow
                            scaleY = glow
                        },
                    contentScale = ContentScale.Fit,
                )
                Spacer(Modifier.height(18.dp))
                Text(
                    tagline,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFFFE8D6),
                    letterSpacing = 0.6.sp,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    caption,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0x99C4B5FF),
                    textAlign = TextAlign.Center,
                    lineHeight = 15.sp,
                )
            }
        }
    }
}
