package uz.tcall.ui.dialer

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material.icons.automirrored.filled.CallMade
import androidx.compose.material.icons.automirrored.filled.CallReceived
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CallMissed
import androidx.compose.material.icons.filled.Message
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.network.CallHistoryDto
import uz.tcall.ui.components.DialSubTabBar
import uz.tcall.ui.components.DialWaveform
import uz.tcall.ui.components.FilterChipRow
import uz.tcall.ui.components.GlassDialKey
import uz.tcall.ui.components.GreenCallButton
import uz.tcall.ui.components.IosSearchField
import uz.tcall.ui.components.PremiumCallButton
import uz.tcall.ui.components.TcallEmptyState
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallGlassSurface
import uz.tcall.ui.theme.GlassLevel
import uz.tcall.ui.theme.formatTcallId
import uz.tcall.ui.util.formatCallDuration
import uz.tcall.ui.util.formatShortTime

private data class DialKey(val digit: String, val letters: String = "")

private val keyRows = listOf(
    listOf(DialKey("1"), DialKey("2", "ABC"), DialKey("3", "DEF")),
    listOf(DialKey("4", "GHI"), DialKey("5", "JKL"), DialKey("6", "MNO")),
    listOf(DialKey("7", "PQRS"), DialKey("8", "TUV"), DialKey("9", "WXYZ")),
    listOf(DialKey("*"), DialKey("0", "+"), DialKey("del")),
)

@Composable
fun DialerScreen(
    viewModel: DialerViewModel,
    recentsViewModel: RecentsViewModel,
    ui: TcallUiStrings,
    userTcallId: String,
    onCall: (String) -> Unit,
    onMessage: (String) -> Unit,
    onDialTcallId: (String) -> Unit,
) {
    var subTab by remember { mutableStateOf("keypad") }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            if (subTab == "keypad") {
                KeypadContent(viewModel, ui, onCall, onMessage)
            } else {
                RecentsContent(recentsViewModel, ui, userTcallId, onDialTcallId)
            }
        }
        DialSubTabBar(
            selected = subTab,
            keypadLabel = ui.keypad,
            recentsLabel = ui.recents,
            onKeypad = { subTab = "keypad" },
            onRecents = { subTab = "recents" },
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
    }
}

@Composable
private fun KeypadContent(
    viewModel: DialerViewModel,
    ui: TcallUiStrings,
    onCall: (String) -> Unit,
    onMessage: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    val canAct = !state.loading && state.digits.length == 9

    Column(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(12.dp))
        DialWaveform()
        Spacer(Modifier.height(16.dp))

        Text(
            ui.dialNumber,
            style = TextStyle(
                brush = TcallColors.TitleGradient,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            "Sifatli aloqa chegarasiz ✨",
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = TcallColors.Slate,
            modifier = Modifier.padding(top = 6.dp),
        )

        Spacer(Modifier.height(20.dp))
        Text(
            text = if (state.digits.isBlank()) "— — —" else formatTcallId(state.digits),
            fontSize = 36.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 4.sp,
            fontFamily = FontFamily.Monospace,
            color = TcallColors.Ink,
        )
        state.error?.let {
            Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp))
        }

        Spacer(Modifier.height(16.dp))
        keyRows.forEach { row ->
            Row(
                Modifier.fillMaxWidth().padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                row.forEach { key ->
                    when (key.digit) {
                        "del" -> Box(Modifier.size(72.dp), contentAlignment = Alignment.Center) {
                            Box(
                                Modifier
                                    .size(56.dp)
                                    .clip(CircleShape)
                                    .clickable(
                                        interactionSource = remember { MutableInteractionSource() },
                                        indication = null,
                                        onClick = viewModel::backspace,
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Backspace, null, tint = TcallColors.Ink, modifier = Modifier.size(26.dp))
                            }
                        }
                        else -> GlassDialKey(key.digit, key.letters, { viewModel.append(key.digit) })
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(24.dp), verticalAlignment = Alignment.CenterVertically) {
            PremiumCallButton(
                onClick = { viewModel.dial(onCall) },
                enabled = canAct,
                loading = state.loading,
                icon = Icons.Default.Call,
            )
            Box(
                Modifier
                    .size(56.dp)
                    .shadow(6.dp, CircleShape, spotColor = TcallColors.Accent.copy(0.2f))
                    .clip(CircleShape)
                    .background(TcallColors.GlassSheet)
                    .border(1.dp, TcallColors.GlassHairline, CircleShape)
                    .clickable(enabled = canAct, onClick = { viewModel.openChat(onMessage) }),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Message, null, tint = TcallColors.AccentInk, modifier = Modifier.size(24.dp))
            }
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun RecentsContent(
    viewModel: RecentsViewModel,
    ui: TcallUiStrings,
    userTcallId: String,
    onDial: (String) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    val chips = listOf(
        "all" to ui.all,
        "missed" to ui.missed,
        "incoming" to ui.incoming,
        "outgoing" to ui.outgoing,
    )
    val filtered = remember(state.calls, state.filter, state.search, userTcallId) {
        val q = state.search.trim().lowercase()
        state.calls.filter { call ->
            val isOutgoing = call.host.tcallId == userTcallId
            val isMissed = call.status == "missed" && !isOutgoing && call.calleeTcallId == userTcallId
            val isIncoming = !isOutgoing
            when (state.filter) {
                "missed" -> if (!isMissed) return@filter false
                "incoming" -> if (!isIncoming) return@filter false
                "outgoing" -> if (!isOutgoing) return@filter false
            }
            if (q.isBlank()) true
            else {
                val partner = if (call.host.tcallId != userTcallId) call.host
                else call.participants?.firstOrNull { it.user.tcallId != userTcallId }?.user
                "${partner?.name ?: ""} ${partner?.tcallId ?: ""}".lowercase().contains(q)
            }
        }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text(ui.recents, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TcallColors.Ink)
        Spacer(Modifier.height(12.dp))
        FilterChipRow(chips, state.filter, viewModel::setFilter)
        Spacer(Modifier.height(12.dp))
        IosSearchField(state.search, viewModel::setSearch, ui.nameOrNumber)
        Spacer(Modifier.height(12.dp))

        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TcallColors.AccentInk)
            }
            filtered.isEmpty() -> TcallEmptyState(title = ui.recents, subtitle = ui.noCalls)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filtered, key = { it.id }) { call ->
                    RecentCallRow(call, userTcallId, ui, onDial)
                }
            }
        }
    }
}

@Composable
private fun RecentCallRow(
    call: CallHistoryDto,
    userTcallId: String,
    ui: TcallUiStrings,
    onDial: (String) -> Unit,
) {
    val isOutgoing = call.host.tcallId == userTcallId
    val isMissed = call.status == "missed" && !isOutgoing && call.calleeTcallId == userTcallId
    val partner = if (!isOutgoing) call.host
    else call.participants?.firstOrNull { it.user.tcallId != userTcallId }?.user ?: call.host
    val name = partner.name.ifBlank { ui.unknown }
    val tcallId = partner.tcallId ?: call.calleeTcallId ?: ""
    val icon = when {
        isMissed -> Icons.Default.CallMissed
        isOutgoing -> Icons.AutoMirrored.Filled.CallMade
        else -> Icons.AutoMirrored.Filled.CallReceived
    }
    val iconTint = if (isMissed) TcallColors.Destructive else TcallColors.AccentInk

    TcallGlassSurface(
        modifier = Modifier.fillMaxWidth(),
        level = GlassLevel.Card,
        shape = RoundedCornerShape(28.dp),
        elevation = 4.dp,
    ) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = iconTint, modifier = Modifier.size(22.dp))
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TcallColors.Ink)
                Text(
                    "${formatTcallId(tcallId)} · ${formatCallDuration(call.durationSec)}",
                    fontSize = 13.sp,
                    color = TcallColors.Slate,
                )
            }
            Text(formatShortTime(call.createdAt) ?: "", fontSize = 12.sp, color = TcallColors.Slate)
            if (tcallId.isNotBlank()) {
                Spacer(Modifier.size(8.dp))
                GreenCallButton(onClick = { onDial(tcallId) })
            }
        }
    }
}
