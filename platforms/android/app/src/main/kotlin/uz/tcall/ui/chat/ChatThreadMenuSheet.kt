package uz.tcall.ui.chat

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosBottomSheet
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors

@Composable
fun ChatThreadMenuSheet(
    open: Boolean,
    ui: TcallUiStrings,
    onDismiss: () -> Unit,
    onDeleteChat: () -> Unit,
    onPin: () -> Unit,
) {
    if (!open) return
    IosBottomSheet(onDismiss = onDismiss) {
        Text("Chat menyusi", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TcallColors.TextPrimary)
        Spacer(Modifier.height(16.dp))
        GradientPrimaryButton("Pin qilish", onClick = { onPin(); onDismiss() })
        Spacer(Modifier.height(8.dp))
        GradientPrimaryButton("Chatni o'chirish", onClick = { onDeleteChat(); onDismiss() })
    }
}
