package uz.tcall.ui.interpreter

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.IosBottomSheet
import uz.tcall.ui.components.IosListCard
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.GlassLevel
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallGlassSurface
import uz.tcall.ui.util.TCALL_LANGUAGES
import uz.tcall.ui.util.langLabel

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
        IosListCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(TcallColors.GlassSheet), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Translate, null, tint = TcallColors.CallGreen)
                }
                Column(Modifier.padding(start = 12.dp).weight(1f)) {
                    Text(ui.interpreterTitle, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TcallColors.TextPrimary)
                    Text(ui.interpreterSubtitle, fontSize = 13.sp, color = TcallColors.TextSecondary, lineHeight = 18.sp)
                }
            }
        }

        TcallGlassSurface(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)),
            level = GlassLevel.Input,
            shape = RoundedCornerShape(14.dp),
        ) {
            Row(
                Modifier.fillMaxWidth().padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    "${langLabel(state.sourceLang)} ↔ ${langLabel(state.targetLang)}",
                    fontWeight = FontWeight.SemiBold,
                    color = TcallColors.TextPrimary,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { viewModel.toggleLangPicker(true) }) {
                    Icon(Icons.Default.SwapHoriz, null, tint = TcallColors.IosBlue)
                }
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SpeakCard(
                title = ui.iSpeak,
                hint = ui.hold,
                lang = "${state.sourceLang.uppercase()} → ${state.targetLang.uppercase()}",
                border = TcallColors.IosBlue,
                icon = Icons.Default.Person,
                modifier = Modifier.weight(1f),
                active = state.recording && state.activeSide == SpeakSide.SELF,
                enabled = !state.processing,
                onPressStart = { viewModel.startRecording(SpeakSide.SELF) },
                onPressEnd = { if (state.recording) viewModel.stopAndProcess() },
            )
            SpeakCard(
                title = ui.theySpeak,
                hint = ui.hold,
                lang = "${state.targetLang.uppercase()} → ${state.sourceLang.uppercase()}",
                border = TcallColors.CallGreen,
                icon = Icons.Default.People,
                modifier = Modifier.weight(1f),
                active = state.recording && state.activeSide == SpeakSide.PARTNER,
                enabled = !state.processing,
                onPressStart = { viewModel.startRecording(SpeakSide.PARTNER) },
                onPressEnd = { if (state.recording) viewModel.stopAndProcess() },
            )
        }

        Text(ui.holdHint, fontSize = 12.sp, color = TcallColors.TextSecondary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())

        IosListCard {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                if (state.processing) {
                    CircularProgressIndicator(Modifier.size(28.dp), color = TcallColors.IosBlue)
                } else {
                    Text(
                        state.translated ?: state.original ?: ui.interpreterSubtitle,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = TcallColors.TextPrimary,
                        textAlign = TextAlign.Center,
                        lineHeight = 21.sp,
                    )
                    state.original?.let {
                        Text(it, fontSize = 13.sp, color = TcallColors.TextSecondary, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            }
        }

        state.history.drop(1).forEach { (orig, tr) ->
            IosListCard {
                Text(tr ?: "", fontSize = 14.sp, color = TcallColors.TextPrimary)
                orig?.let { Text(it, fontSize = 12.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 4.dp)) }
            }
        }

        state.error?.let { Text(it, color = TcallColors.Destructive, fontSize = 13.sp) }
    }

    if (state.showLangPicker) {
        IosBottomSheet(onDismiss = { viewModel.toggleLangPicker(false) }) {
            Text("Tillar", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TcallColors.TextPrimary)
            Spacer(Modifier.height(12.dp))
            Text("Men gapiraman", fontWeight = FontWeight.SemiBold, color = TcallColors.TextSecondary)
            LangChipRow(state.sourceLang, viewModel::setSourceLang)
            Spacer(Modifier.height(10.dp))
            Text("U gapiradi", fontWeight = FontWeight.SemiBold, color = TcallColors.TextSecondary)
            LangChipRow(state.targetLang, viewModel::setTargetLang)
        }
    }
}

@Composable
private fun LangChipRow(selected: String, onSelect: (String) -> Unit) {
    Column {
        TCALL_LANGUAGES.forEach { lang ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (selected == lang.code) TcallColors.GlassCard else Color.Transparent)
                    .padding(vertical = 8.dp, horizontal = 4.dp)
                    .clickable { onSelect(lang.code) },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(if (selected == lang.code) "●" else "○", color = TcallColors.IosBlue, modifier = Modifier.padding(end = 8.dp))
                Text(lang.label, color = TcallColors.TextPrimary, fontWeight = FontWeight.Medium)
            }
        }
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
    enabled: Boolean,
    onPressStart: () -> Unit,
    onPressEnd: () -> Unit,
) {
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(TcallColors.GlassSheet)
            .border(2.dp, if (active) border else border.copy(0.45f), RoundedCornerShape(16.dp))
            .pointerInput(enabled) {
                if (!enabled) return@pointerInput
                detectTapGestures(
                    onPress = {
                        onPressStart()
                        tryAwaitRelease()
                        onPressEnd()
                    },
                )
            }
            .padding(14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, null, tint = border, modifier = Modifier.size(28.dp))
        Spacer(Modifier.height(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = border)
        Text(hint, fontSize = 12.sp, color = TcallColors.TextSecondary)
        Text(lang, fontSize = 11.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 4.dp))
    }
}
