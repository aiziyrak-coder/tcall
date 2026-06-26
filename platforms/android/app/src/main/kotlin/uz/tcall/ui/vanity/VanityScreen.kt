package uz.tcall.ui.vanity

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.DialSubTabBar
import uz.tcall.ui.components.FilterChipRow
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.components.IosListCard
import uz.tcall.ui.components.IosSearchField
import uz.tcall.ui.strings.TcallUiStrings
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.formatTcallId

@Composable
fun VanityScreen(viewModel: VanityViewModel, ui: TcallUiStrings, onBack: () -> Unit) {
    val state by viewModel.state.collectAsState()
    val tierChips = buildList {
        add("all" to "${ui.all}${state.tierCounts["all"]?.let { " $it" } ?: ""}")
        listOf("bronze", "silver", "gold", "platinum", "platinum_premium", "vip").forEach { tier ->
            val count = state.tierCounts[tier]
            if (count != null && count > 0) {
                add(tier to "${tier.replace('_', ' ')} $count")
            }
        }
    }

    Column(Modifier.fillMaxSize().background(TcallColors.BgPrimary).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
            }
            Text(ui.numbers, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            Spacer(Modifier.weight(1f))
            IosIconButton(Icons.Default.Star, {})
        }

        LazyColumn(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                IosListCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color(0x1A6366F1)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.Star, null, tint = TcallColors.Brand600, modifier = Modifier.size(18.dp))
                        }
                        Column(Modifier.padding(start = 10.dp)) {
                            Text(ui.numbers, fontWeight = FontWeight.Bold)
                            Text(ui.numbersSubtitle, fontSize = 12.sp, color = TcallColors.Slate500)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0x1A6366F1))
                            .padding(14.dp),
                    ) {
                        Column {
                            Text(ui.yourNum, fontSize = 11.sp, color = TcallColors.Slate500, fontWeight = FontWeight.SemiBold)
                            Text(
                                state.ownedNumber?.let { formatTcallId(it) } ?: "—",
                                fontSize = 26.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = TcallColors.IosBlue,
                            )
                            Text("👑 ${ui.premiumNumber}", fontSize = 12.sp, color = TcallColors.Slate500, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }

            item {
                DialSubTabBar(
                    selected = if (state.mode == "catalog") "keypad" else "recents",
                    keypadLabel = ui.catalog,
                    recentsLabel = ui.dialCustom,
                    onKeypad = { viewModel.setMode("catalog") },
                    onRecents = { viewModel.setMode("custom") },
                )
            }

            if (state.mode == "catalog") {
                item {
                    FilterChipRow(tierChips, state.tier, viewModel::setTier)
                    Spacer(Modifier.height(8.dp))
                    IosSearchField(state.search, viewModel::onSearchChange, ui.searchMessages)
                }
            } else {
                item {
                    IosSearchField(state.search, viewModel::onSearchChange, ui.searchById)
                    state.checkResult?.let {
                        Text(it, fontSize = 13.sp, color = TcallColors.Slate500, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            }

            if (state.loading) {
                item { Box(Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            }

            if (state.mode == "catalog") {
                items(state.numbers, key = { it.id }) { num ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0xFFFFF7ED))
                            .border(1.dp, Color(0x1AF97316), RoundedCornerShape(14.dp))
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(formatTcallId(num.number), fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                            Text(num.tier.replace('_', ' '), fontSize = 12.sp, color = TcallColors.Slate500)
                        }
                        Text("$${num.price}", fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp))
                        GradientPrimaryButton(
                            text = ui.buy,
                            onClick = { viewModel.requestNumber(num.number) },
                            enabled = !state.requesting,
                            loading = state.requesting,
                            modifier = Modifier.fillMaxWidth(0.32f),
                        )
                    }
                }
            }

            state.error?.let { item { Text(it, color = TcallColors.Destructive, fontSize = 13.sp) } }
        }
    }
}
