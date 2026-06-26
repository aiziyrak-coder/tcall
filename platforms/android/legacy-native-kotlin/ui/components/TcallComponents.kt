package uz.tcall.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.theme.GlassLevel
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallGlassSurface

@Composable
fun TcallAuthCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    TcallGlassSurface(
        modifier = modifier.fillMaxWidth(),
        level = GlassLevel.Sheet,
        shape = RoundedCornerShape(24.dp),
        elevation = 8.dp,
    ) {
        Column(
            Modifier.padding(horizontal = 24.dp, vertical = 28.dp),
            content = content,
        )
    }
}

@Composable
fun TcallEmptyState(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        TcallLogo(variant = TcallLogoVariant.Icon, width = 56.dp)
        Text(
            title,
            modifier = Modifier.padding(top = 16.dp),
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TcallColors.TextPrimary,
            textAlign = TextAlign.Center,
        )
        Text(
            subtitle,
            modifier = Modifier.padding(top = 8.dp),
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = TcallColors.TextSecondary,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp,
        )
    }
}

@Composable
fun TcallSectionTitle(title: String, modifier: Modifier = Modifier) {
    Text(
        title.uppercase(),
        modifier = modifier.padding(horizontal = 20.dp, vertical = 8.dp),
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = TcallColors.TextSecondary,
        letterSpacing = 0.8.sp,
    )
}

@Composable
fun TcallChatBubble(text: String, mine: Boolean, modifier: Modifier = Modifier) {
    val align = if (mine) Alignment.End else Alignment.Start
    val shape = RoundedCornerShape(
        topStart = 20.dp,
        topEnd = 20.dp,
        bottomStart = if (mine) 20.dp else 6.dp,
        bottomEnd = if (mine) 6.dp else 20.dp,
    )
    Column(Modifier.fillMaxWidth().then(modifier), horizontalAlignment = align) {
        Box(
            Modifier
                .clip(shape)
                .then(
                    if (mine) {
                        Modifier
                            .background(TcallColors.BubbleMine)
                            .border(0.5.dp, TcallColors.BubbleMineBorder, shape)
                    } else {
                        Modifier
                            .background(TcallColors.BubbleTheir)
                            .border(0.5.dp, TcallColors.BubbleTheirBorder, shape)
                    },
                )
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Text(
                text,
                color = TcallColors.Ink,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                lineHeight = 21.sp,
            )
        }
    }
}

@Composable
fun TcallGlassCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    TcallGlassSurface(
        modifier = modifier.fillMaxWidth(),
        level = GlassLevel.Card,
        shape = RoundedCornerShape(20.dp),
        elevation = 4.dp,
    ) {
        Column(Modifier.padding(16.dp), content = content)
    }
}
