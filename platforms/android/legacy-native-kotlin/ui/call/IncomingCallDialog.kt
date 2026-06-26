package uz.tcall.ui.call

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.network.IncomingCallEvent
import uz.tcall.ui.components.CallAcceptRejectButtons
import uz.tcall.ui.components.TcallAvatar
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId

@Composable
fun IncomingCallDialog(
    call: IncomingCallEvent,
    onAccept: () -> Unit,
    onReject: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onReject,
        containerColor = TcallColors.SurfaceElevated,
        shape = RoundedCornerShape(20.dp),
        title = {
            Text("Kiruvchi qo'ng'iroq", fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary)
        },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                TcallAvatar(name = call.caller.name, size = 64.dp)
                Text(
                    call.caller.name,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TcallColors.TextPrimary,
                    modifier = Modifier.padding(top = 12.dp),
                )
                call.caller.tcallId?.let {
                    Text(
                        formatTcallId(it),
                        fontSize = 14.sp,
                        color = TcallColors.Slate500,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                Text(
                    "Xona: ${call.roomId}",
                    fontSize = 13.sp,
                    color = TcallColors.Slate400,
                    modifier = Modifier.padding(top = 8.dp),
                )
                CallAcceptRejectButtons(
                    onAccept = onAccept,
                    onReject = onReject,
                    modifier = Modifier.padding(top = 20.dp),
                )
            }
        },
        confirmButton = {},
        dismissButton = {},
    )
}
