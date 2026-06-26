package uz.tcall.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.R
import uz.tcall.ui.theme.TcallColors

enum class TcallLogoVariant { Icon, Full }

@Composable
fun TcallLogo(
    modifier: Modifier = Modifier,
    variant: TcallLogoVariant = TcallLogoVariant.Icon,
    width: Dp = if (variant == TcallLogoVariant.Icon) 72.dp else 200.dp,
    animate: Boolean = false,
    title: String? = null,
    subtitle: String? = null,
) {
    val transition = rememberInfiniteTransition(label = "logoPulse")
    val scale by transition.animateFloat(
        initialValue = 1f,
        targetValue = if (animate) 1.04f else 1f,
        animationSpec = infiniteRepeatable(tween(1400), RepeatMode.Reverse),
        label = "scale",
    )

    val painter = painterResource(
        if (variant == TcallLogoVariant.Icon) R.drawable.tcall_logo_icon else R.drawable.tcall_logo_full,
    )

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painter,
            contentDescription = "Tcall",
            modifier = Modifier
                .then(
                    if (variant == TcallLogoVariant.Icon) Modifier.size(width) else Modifier.width(width),
                )
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                },
            contentScale = ContentScale.Fit,
        )
        if (!title.isNullOrBlank()) {
            Spacer(Modifier.height(12.dp))
            Text(
                title,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = TcallColors.TextPrimary,
                textAlign = TextAlign.Center,
            )
        }
        if (!subtitle.isNullOrBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(
                subtitle,
                fontSize = 14.sp,
                color = TcallColors.Slate500,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** @deprecated use [TcallLogo] */
@Composable
fun TcallLogoIcon(modifier: Modifier = Modifier) {
    TcallLogo(modifier = modifier, variant = TcallLogoVariant.Icon, width = 40.dp)
}
