package uz.tcall.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

enum class GlassLevel { Bar, Card, Sheet, Button, Input }

object TcallGlass {
    fun fill(level: GlassLevel): Color = when (level) {
        GlassLevel.Bar -> TcallColors.GlassBar
        GlassLevel.Card -> TcallColors.GlassCard
        GlassLevel.Sheet -> TcallColors.GlassSheet
        GlassLevel.Button -> Color(0xE8FFFFFF)
        GlassLevel.Input -> Color(0xF0FFFFFF)
    }

    val hairline = TcallColors.GlassRim
}

@Composable
fun TcallGlassSurface(
    modifier: Modifier = Modifier,
    level: GlassLevel = GlassLevel.Card,
    shape: Shape = RoundedCornerShape(32.dp),
    elevation: Dp = 8.dp,
    accentGlow: Boolean = false,
    clipContent: Boolean = true,
    content: @Composable BoxScope.() -> Unit,
) {
    val base = modifier
        .shadow(elevation, shape, ambientColor = Color(0x0A1E2A3A), spotColor = Color(0x123BB4E8))
        .then(if (clipContent) Modifier.clip(shape) else Modifier)
        .background(TcallGlass.fill(level))
        .border(1.dp, TcallColors.GlassHairline, shape)
    Box(base, content = content)
}

@Composable
fun TcallGlassBar(modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    TcallGlassSurface(
        modifier = modifier.fillMaxWidth().padding(horizontal = 12.dp),
        level = GlassLevel.Bar,
        shape = RoundedCornerShape(28.dp),
        elevation = 6.dp,
        content = content,
    )
}

@Composable
fun TcallNeuCircle(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    val clickableMod = if (onClick != null) {
        Modifier.clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null,
            onClick = onClick,
        )
    } else Modifier

    Box(
        modifier
            .shadow(6.dp, CircleShape, spotColor = Color(0x141E2A3A))
            .clip(CircleShape)
            .background(TcallColors.GlassSheet)
            .border(1.dp, TcallColors.GlassHairline, CircleShape)
            .then(clickableMod),
        contentAlignment = Alignment.Center,
        content = content,
    )
}
