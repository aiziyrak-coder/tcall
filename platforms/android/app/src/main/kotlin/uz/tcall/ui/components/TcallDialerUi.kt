package uz.tcall.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallNeuCircle
import uz.tcall.ui.theme.tcallPressScale

@Composable
fun DialWaveform(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "wave")
    val pulse by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Reverse),
        label = "pulse",
    )
    Row(
        modifier.height(36.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        listOf(0.4f, 0.7f, 1f, 0.85f, 0.55f, 0.9f, 0.65f).forEachIndexed { i, h ->
            val barH = (12 + 22 * h * pulse * (0.85f + i * 0.03f)).dp
            Box(
                Modifier
                    .size(width = 4.dp, height = barH)
                    .clip(RoundedCornerShape(99.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(TcallColors.Blue, TcallColors.Accent, TcallColors.Purple),
                        ),
                    ),
            )
        }
    }
}

@Composable
fun GradientTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier,
        style = TextStyle(
            brush = TcallColors.TitleGradient,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
        ),
    )
}

@Composable
fun GlassDialKey(
    digit: String,
    letters: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    TcallNeuCircle(
        modifier = modifier
            .tcallPressScale(pressed)
            .size(72.dp),
        onClick = onClick,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(digit, fontSize = 30.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.Ink)
            if (letters.isNotBlank()) {
                Text(letters, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TcallColors.Slate, letterSpacing = 1.2.sp)
            }
        }
    }
}

@Composable
fun PremiumCallButton(
    onClick: () -> Unit,
    enabled: Boolean,
    loading: Boolean,
    icon: ImageVector,
    modifier: Modifier = Modifier,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val breath = rememberInfiniteTransition(label = "callGlow")
    val glow by breath.animateFloat(
        0.88f, 1f,
        infiniteRepeatable(tween(1800), RepeatMode.Reverse),
        label = "glow",
    )
    Box(
        modifier
            .size(72.dp)
            .scale(if (pressed) 0.94f else glow)
            .shadow(16.dp, CircleShape, spotColor = TcallColors.Blue.copy(0.45f))
            .clip(CircleShape)
            .background(if (enabled) TcallColors.CallBtnGradient else Brush.linearGradient(listOf(Color.Gray, Color.Gray)))
            .border(1.5.dp, Color.White.copy(0.45f), CircleShape)
            .clickable(
                interactionSource = interaction,
                indication = null,
                enabled = enabled && !loading,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(Modifier.size(28.dp), color = Color.White, strokeWidth = 2.5.dp)
        } else {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(32.dp))
        }
    }
}
