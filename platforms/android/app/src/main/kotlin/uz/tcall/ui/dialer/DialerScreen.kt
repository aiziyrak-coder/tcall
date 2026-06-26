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
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.network.CallHistoryDto
import uz.tcall.ui.components.DialSubTabBar
import uz.tcall.ui.components.FilterChipRow
import uz.tcall.ui.components.GreenCallButton
import uz.tcall.ui.components.IosSearchField
import uz.tcall.ui.components.TcallEmptyState
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId
import uz.tcall.ui.util.formatCallDuration
import uz.tcall.ui.util.formatShortTime

private data class DialKey(val digit: String, val letters: String = "")

private val keyRows = listOf(
    listOf(DialKey("1"), DialKey("2", "ABC"), DialKey("3", "DEF")),
    listOf(DialKey("4", "GHI"), DialKey("5", "JKL"), DialKey("6", "MNO")),
    listOf(DialKey("7", "PQRS"), DialKey("8", "TUV"), DialKey("9", "WXYZ")),
    listOf(DialKey(""), DialKey("0", "+"), DialKey("del")),
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
    val dialState by viewModel.state.collectAsState()

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            if (subTab == "keypad") {
                KeypadContent(viewModel, dialState, ui, onCall, onMessage)
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
    state: DialerUiState,
    ui: TcallUiStrings,
    onCall: (String) -> Unit,
    onMessage: (String) -> Unit,
) {
    Column(
        Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            ui.dialNumber,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = TcallColors.TextSecondary,
            modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
        )
        Text(
            text = if (state.digits.isBlank()) "— — —" else formatTcallId(state.digits),
            fontSize = 34.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 3.sp,
            fontFamily = FontFamily.Monospace,
            color = TcallColors.TextPrimary,
        )
        state.error?.let {
            Text(it, color = TcallColors.Destructive, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
        }
        Spacer(Modifier.height(8.dp))

        keyRows.forEach { row ->
            Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                row.forEach { key ->
                    when (key.digit) {
                        "" -> Spacer(Modifier.weight(1f).aspectRatio(1f))
                        "del" -> Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                            Box(
                                Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .clickable(
                                        interactionSource = remember { MutableInteractionSource() },
                                        indication = null,
                                        onClick = viewModel::backspace,
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Backspace, null, tint = TcallColors.TextSecondary)
                            }
                        }
                        else -> IosDialKey(key.digit, key.letters, { viewModel.append(key.digit) }, Modifier.weight(1f))
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(64.dp)
                    .shadow(8.dp, CircleShape, spotColor = TcallColors.CallGreen.copy(alpha = 0.4f))
                    .clip(CircleShape)
                    .background(TcallColors.CallGreen)
                    .clickable(
                        enabled = !state.loading && state.digits.length == 9,
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { viewModel.dial(onCall) },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (state.loading) {
                    CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Icon(Icons.Default.Call, null, tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }
            Box(
                Modifier
                    .size(52.dp)
                    .shadow(4.dp, CircleShape, spotColor = TcallColors.IosBlue.copy(0.25f))
                    .clip(CircleShape)
                    .background(TcallColors.GlassSheet)
                    .border(0.5.dp, TcallColors.GlassHairline, CircleShape)
                    .clickable(
                        enabled = !state.loading && state.digits.length == 9,
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { viewModel.openChat(onMessage) },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Message, null, tint = TcallColors.IosBlue, modifier = Modifier.size(24.dp))
            }
        }
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
        Text(ui.recents, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TcallColors.Slate900)
        Spacer(Modifier.height(10.dp))
        FilterChipRow(chips, state.filter, viewModel::setFilter)
        Spacer(Modifier.height(10.dp))
        IosSearchField(state.search, viewModel::setSearch, ui.nameOrNumber)
        Spacer(Modifier.height(10.dp))

        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TcallColors.IosBlue)
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
    val iconTint = if (isMissed) TcallColors.Destructive else TcallColors.Brand600

    Row(
        Modifier
            .fillMaxWidth()
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(14.dp))
            .background(Color.White)
            .border(1.dp, Color(0x12000000), androidx.compose.foundation.shape.RoundedCornerShape(14.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = iconTint, modifier = Modifier.size(20.dp))
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Text(name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = TcallColors.Slate900)
            Text(
                "${formatTcallId(tcallId)} · ${formatCallDuration(call.durationSec)}",
                fontSize = 12.sp,
                color = TcallColors.Slate500,
            )
        }
        Text(formatShortTime(call.createdAt) ?: "", fontSize = 12.sp, color = TcallColors.Slate500)
        if (tcallId.isNotBlank()) {
            Spacer(Modifier.size(8.dp))
            GreenCallButton(onClick = { onDial(tcallId) })
        }
    }
}

@Composable
private fun IosDialKey(
    digit: String,
    letters: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .aspectRatio(1f)
            .padding(4.dp)
            .shadow(2.dp, CircleShape)
            .clip(CircleShape)
            .background(TcallColors.GlassSheet)
            .border(0.5.dp, TcallColors.GlassHairline, CircleShape)
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(digit, fontSize = 28.sp, fontWeight = FontWeight.Medium, color = TcallColors.TextPrimary)
            if (letters.isNotBlank()) {
                Text(letters, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.TextSecondary, letterSpacing = 1.sp)
            }
        }
    }
}
