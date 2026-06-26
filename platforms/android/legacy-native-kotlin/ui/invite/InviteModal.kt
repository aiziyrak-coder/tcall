package uz.tcall.ui.invite

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.network.TcallApi
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosCenterModal
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.theme.TcallColors

@Composable
fun InviteModal(open: Boolean, api: TcallApi, onClose: () -> Unit) {
    if (!open) return
    val context = LocalContext.current
    var inviteUrl by remember { mutableStateOf<String?>(null) }
    var referred by remember { mutableStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        runCatching {
            val res = api.referral()
            if (res.isSuccessful) {
                inviteUrl = res.body()?.inviteUrl
                referred = res.body()?.referredCount ?: 0
            } else error = res.errorBody()?.string()
        }.onFailure { error = it.message }
    }

    IosCenterModal(onDismiss = onClose) {
        androidx.compose.foundation.layout.Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text("Do'stlarni taklif qilish", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
            IosIconButton(Icons.Default.Close, onClose)
        }
        Spacer(Modifier.height(12.dp))
        error?.let { Text(it, color = TcallColors.Destructive, fontSize = 13.sp) }
        inviteUrl?.let { url ->
            Text(url, fontSize = 13.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(vertical = 8.dp))
            Text("Taklif qilingan: $referred", fontSize = 13.sp, color = TcallColors.TextPrimary)
            Spacer(Modifier.height(12.dp))
            GradientPrimaryButton("Nusxa olish", onClick = {
                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText("invite", url))
            })
            Spacer(Modifier.height(8.dp))
            GradientPrimaryButton("Ulashish", onClick = {
                context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, url)
                }, null))
            })
        }
    }
}
