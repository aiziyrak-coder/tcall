package uz.tcall.ui.chat

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import uz.tcall.ui.theme.TcallColors

private val EMOJIS = listOf(
    "😀", "😂", "😍", "🥰", "😊", "👍", "🙏", "❤️", "🔥", "✨",
    "🎉", "💯", "😢", "😡", "🤔", "👋", "💪", "🌟", "📞", "💬",
)

@Composable
fun EmojiPickerRow(onPick: (String) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        EMOJIS.forEach { emoji ->
            Text(
                emoji,
                fontSize = 22.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(TcallColors.GlassCard)
                    .clickable { onPick(emoji) }
                    .padding(horizontal = 6.dp, vertical = 4.dp),
            )
        }
    }
}
