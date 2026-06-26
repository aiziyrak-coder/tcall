package uz.tcall.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
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
enum class TcallLogoLayout { Vertical, Horizontal }

private const val LOGO_ASPECT = 743f / 159f
private val LogoPlate = Color(0xFFFFF5EE)
private val LogoPlateBorder = Color(0x33FF6B35)
private val LogoPlateShape = RoundedCornerShape(10.dp)

/** Logo PNG chetlaridagi artefaktlarni yashirish uchun olov rangli fon */
@Composable
fun TcallLogoPlate(
    modifier: Modifier = Modifier,
    padding: Dp = 6.dp,
    elevated: Boolean = false,
    content: @Composable () -> Unit,
) {
    val shape = LogoPlateShape
    Box(
        modifier
            .then(if (elevated) Modifier.shadow(2.dp, shape, ambientColor = Color(0x14000000)) else Modifier)
            .clip(shape)
            .background(LogoPlate)
            .border(0.5.dp, LogoPlateBorder, shape)
            .padding(padding),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

@Composable
fun TcallLogo(
    modifier: Modifier = Modifier,
    variant: TcallLogoVariant = TcallLogoVariant.Icon,
    layout: TcallLogoLayout = TcallLogoLayout.Vertical,
    width: Dp = if (variant == TcallLogoVariant.Icon) 72.dp else 220.dp,
    animate: Boolean = false,
    title: String? = null,
    subtitle: String? = null,
    elevatedPlate: Boolean = false,
    showPlate: Boolean = true,
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

    val imageHeight = if (variant == TcallLogoVariant.Icon) width else width / LOGO_ASPECT
    val platePadding = if (variant == TcallLogoVariant.Icon) 8.dp else 10.dp

    val image = @Composable {
        val content = @Composable {
            Image(
                painter = painter,
                contentDescription = "Tcall",
                modifier = Modifier
                    .then(
                        if (variant == TcallLogoVariant.Icon) {
                            Modifier.width(width).height(width)
                        } else {
                            Modifier.width(width).height(imageHeight)
                        },
                    )
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    },
                contentScale = ContentScale.Fit,
            )
        }
        if (showPlate) {
            TcallLogoPlate(padding = platePadding, elevated = elevatedPlate) { content() }
        } else {
            content()
        }
    }

    val textBlock = @Composable {
        Column(
            horizontalAlignment = if (layout == TcallLogoLayout.Horizontal) Alignment.Start else Alignment.CenterHorizontally,
        ) {
            if (!title.isNullOrBlank()) {
                Text(
                    title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = TcallColors.TextPrimary,
                    textAlign = if (layout == TcallLogoLayout.Horizontal) TextAlign.Start else TextAlign.Center,
                )
            }
            if (!subtitle.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    subtitle,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = TcallColors.TextSecondary,
                    textAlign = if (layout == TcallLogoLayout.Horizontal) TextAlign.Start else TextAlign.Center,
                )
            }
        }
    }

    when (layout) {
        TcallLogoLayout.Horizontal -> {
            Row(
                modifier = modifier,
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                image()
                if (!title.isNullOrBlank() || !subtitle.isNullOrBlank()) {
                    Spacer(Modifier.width(16.dp))
                    textBlock()
                }
            }
        }
        TcallLogoLayout.Vertical -> {
            Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
                image()
                if (!title.isNullOrBlank() || !subtitle.isNullOrBlank()) {
                    Spacer(Modifier.height(12.dp))
                    textBlock()
                }
            }
        }
    }
}

/** Header — kichik ikon (Terish/Xona) */
@Composable
fun TcallLogoHeaderIcon(modifier: Modifier = Modifier) {
    TcallLogoPlate(modifier = modifier, padding = 4.dp) {
        Image(
            painter = painterResource(R.drawable.tcall_logo_icon),
            contentDescription = "Tcall",
            modifier = Modifier.size(28.dp),
            contentScale = ContentScale.Fit,
        )
    }
}

/** Header — to'liq yozuvli logo */
@Composable
fun TcallLogoHeader(modifier: Modifier = Modifier) {
    TcallLogoPlate(modifier = modifier, padding = 4.dp) {
        Image(
            painter = painterResource(R.drawable.tcall_logo_full),
            contentDescription = "Tcall",
            modifier = Modifier
                .width(108.dp)
                .height(108.dp / LOGO_ASPECT),
            contentScale = ContentScale.Fit,
        )
    }
}

@Composable
fun TcallLogoIcon(modifier: Modifier = Modifier) {
    TcallLogo(modifier = modifier, variant = TcallLogoVariant.Icon, width = 40.dp)
}
