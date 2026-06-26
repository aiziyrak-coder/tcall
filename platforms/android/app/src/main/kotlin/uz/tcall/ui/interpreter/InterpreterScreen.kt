package uz.tcall.ui.interpreter

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosListCard
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors

@Composable
fun InterpreterScreen(viewModel: InterpreterViewModel, ui: TcallUiStrings) {
    val state by viewModel.state.collectAsState()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        IosListCard(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFFECFDF5), RoundedCornerShape(16.dp)),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(Color.White),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Translate, null, tint = TcallColors.CallGreen)
                }
                Column(Modifier.padding(start = 12.dp)) {
                    Text(ui.interpreterTitle, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TcallColors.Slate900)
                    Text(ui.interpreterSubtitle, fontSize = 13.sp, color = TcallColors.Slate500, lineHeight = 18.sp)
                }
            }
        }

        GradientPrimaryButton(
            text = if (state.recording) "..." else ui.enableMic,
            onClick = {
                if (state.recording) viewModel.stopAndProcess() else viewModel.startRecording()
            },
            enabled = !state.processing,
            loading = state.processing,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(99.dp)),
        )

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SpeakCard(
                title = ui.iSpeak,
                hint = ui.hold,
                lang = "${state.sourceLang.uppercase()} → ${state.targetLang.uppercase()}",
                border = TcallColors.IosBlue,
                icon = Icons.Default.Person,
                modifier = Modifier.weight(1f),
                active = state.recording,
            )
            SpeakCard(
                title = ui.theySpeak,
                hint = ui.hold,
                lang = "${state.targetLang.uppercase()} → ${state.sourceLang.uppercase()}",
                border = TcallColors.CallGreen,
                icon = Icons.Default.People,
                modifier = Modifier.weight(1f),
                active = false,
            )
        }

        Text(ui.holdHint, fontSize = 12.sp, color = TcallColors.Slate500, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())

        IosListCard {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Translate, null, tint = TcallColors.Slate500.copy(0.35f), modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(8.dp))
                if (state.processing) {
                    CircularProgressIndicator(Modifier.size(28.dp), color = TcallColors.IosBlue)
                } else {
                    Text(
                        state.translated ?: state.original ?: ui.interpreterSubtitle,
                        fontSize = 14.sp,
                        color = TcallColors.Slate500,
                        textAlign = TextAlign.Center,
                        lineHeight = 20.sp,
                    )
                }
            }
        }

        Box(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Color.White)
                .border(1.dp, Color(0x12000000), RoundedCornerShape(14.dp))
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "${state.sourceLang.uppercase()} ↔ ${state.targetLang.uppercase()}",
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF334155),
            )
        }

        state.error?.let { Text(it, color = TcallColors.Destructive, fontSize = 13.sp) }
    }
}

@Composable
private fun SpeakCard(
    title: String,
    hint: String,
    lang: String,
    border: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    active: Boolean,
) {
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .border(2.dp, if (active) border else border.copy(0.35f), RoundedCornerShape(16.dp))
            .padding(14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, null, tint = border, modifier = Modifier.size(28.dp))
        Spacer(Modifier.height(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = border)
        Text(hint, fontSize = 12.sp, color = TcallColors.Slate500)
        Text(lang, fontSize = 11.sp, color = TcallColors.Slate500, modifier = Modifier.padding(top = 4.dp))
    }
}
