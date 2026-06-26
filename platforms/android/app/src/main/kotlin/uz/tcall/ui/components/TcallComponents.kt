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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.theme.TcallColors

@Composable
fun TcallAuthCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(16.dp), ambientColor = Color(0x0F0F172A))
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .border(1.dp, TcallColors.BorderLight, RoundedCornerShape(16.dp))
            .padding(horizontal = 24.dp, vertical = 28.dp),
        content = content,
    )
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
        TcallLogoIcon(Modifier.size(56.dp))
        Text(
            title,
            modifier = Modifier.padding(top = 16.dp),
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = TcallColors.TextPrimary,
            textAlign = TextAlign.Center,
        )
        Text(
            subtitle,
            modifier = Modifier.padding(top = 8.dp),
            fontSize = 14.sp,
            color = TcallColors.Slate500,
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
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = TcallColors.Slate400,
        letterSpacing = 0.8.sp,
    )
}

@Composable
fun TcallChatBubble(text: String, mine: Boolean, modifier: Modifier = Modifier) {
    val align = if (mine) Alignment.End else Alignment.Start
    val shape = RoundedCornerShape(
        topStart = 18.dp,
        topEnd = 18.dp,
        bottomStart = if (mine) 18.dp else 4.dp,
        bottomEnd = if (mine) 4.dp else 18.dp,
    )
    Column(Modifier.fillMaxWidth().then(modifier), horizontalAlignment = align) {
        Box(
            Modifier
                .clip(shape)
                .then(
                    if (mine) {
                        Modifier.background(TcallColors.BubbleMineGradient)
                    } else {
                        Modifier
                            .background(Color.White)
                            .border(1.dp, TcallColors.BorderLight, shape)
                            .shadow(1.dp, shape)
                    },
                )
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Text(
                text,
                color = if (mine) Color.White else TcallColors.TextPrimary,
                fontSize = 15.sp,
                lineHeight = 20.sp,
            )
        }
    }
}

@Composable
fun TcallGlassCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = 0.92f))
            .border(1.dp, TcallColors.BorderLight, RoundedCornerShape(16.dp))
            .padding(16.dp),
        content = content,
    )
}
