package uz.tcall.ui.support

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.tcall.data.UserRepository
import uz.tcall.network.SupportMessageDto
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.components.TcallTextField
import uz.tcall.ui.theme.TcallColors

@Composable
fun SupportScreen(userRepository: UserRepository, onBack: () -> Unit) {
    var loading by remember { mutableStateOf(true) }
    var messages by remember { mutableStateOf<List<SupportMessageDto>>(emptyList()) }
    var text by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            userRepository.supportMessages()
                .onSuccess { messages = it }
                .onFailure { error = it.message }
            loading = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    Column(Modifier.fillMaxSize().background(TcallColors.BgPrimary).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) }
            Text("Qo'llab-quvvatlash", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            LazyColumn(Modifier.weight(1f).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(messages, key = { it.id }) { msg ->
                    val mine = msg.sender == "user"
                    Box(
                        Modifier.fillMaxWidth(),
                        contentAlignment = if (mine) Alignment.CenterEnd else Alignment.CenterStart,
                    ) {
                        Text(
                            msg.text,
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (mine) TcallColors.IosBlue else Color.White)
                                .padding(12.dp),
                            color = if (mine) Color.White else TcallColors.TextPrimary,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
        }

        Column(Modifier.padding(16.dp)) {
            TcallTextField(text, { text = it }, "Xabar", maxLines = 3)
            TcallPrimaryButton(
                text = if (sending) "Yuborilmoqda..." else "Yuborish",
                onClick = {
                    scope.launch {
                        sending = true
                        userRepository.sendSupport(text.trim())
                            .onSuccess { text = ""; reload() }
                            .onFailure { error = it.message }
                        sending = false
                    }
                },
                loading = sending,
                enabled = text.isNotBlank(),
            )
            error?.let { Text(it, color = TcallColors.Destructive, fontSize = 12.sp) }
        }
    }
}
