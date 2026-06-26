package uz.tcall.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.text.TextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.theme.TcallColors

private val CardShape = RoundedCornerShape(16.dp)
private val Slate900 = Color(0xFF0F172A)
private val Slate500 = Color(0xFF64748B)
private val Slate700 = Color(0xFF334155)

@Composable
fun IosPageTitle(title: String, modifier: Modifier = Modifier) {
    Text(
        title,
        modifier = modifier,
        fontSize = 24.sp,
        fontWeight = FontWeight.Bold,
        color = Slate900,
        letterSpacing = (-0.3).sp,
    )
}

@Composable
fun PhoneTabPill(tab: PhoneTab, label: String, modifier: Modifier = Modifier) {
    Row(
        modifier
            .clip(RoundedCornerShape(99.dp))
            .background(
                Brush.linearGradient(
                    listOf(Color(0x1A007AFF), Color(0x146366F1)),
                ),
            )
            .border(1.dp, Color(0x26007AFF), RoundedCornerShape(99.dp))
            .padding(start = 4.dp, end = 10.dp, top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(
            Modifier
                .size(26.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.White),
            contentAlignment = Alignment.Center,
        ) {
            Icon(tab.icon, null, tint = TcallColors.IosBlue, modifier = Modifier.size(14.dp))
        }
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1D4ED8))
    }
}

@Composable
fun UserNumberChip(yourNumberLabel: String, number: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White)
            .border(1.dp, Color(0x12000000), RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
    ) {
        Text(yourNumberLabel, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Slate500, letterSpacing = 0.5.sp)
        Text(number, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Slate900, letterSpacing = 1.sp)
    }
}

@Composable
fun IosIconButton(
    icon: ImageVector,
    onClick: () -> Unit,
    tint: Color = Slate700,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .size(40.dp)
            .shadow(1.dp, CircleShape, ambientColor = Color(0x0A000000))
            .clip(CircleShape)
            .background(Color.White)
            .border(1.dp, Color(0x0F000000), CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
    }
}

@Composable
fun GradientPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Box(
        modifier
            .fillMaxWidth()
            .height(44.dp)
            .shadow(if (enabled) 4.dp else 0.dp, RoundedCornerShape(12.dp), spotColor = TcallColors.Brand600.copy(0.3f))
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (enabled) Brush.linearGradient(listOf(Color(0xFF6366F1), Color(0xFF4F46E5)))
                else Brush.linearGradient(listOf(Color(0x806366F1), Color(0x804F46E5))),
            )
            .clickable(enabled = enabled && !loading, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        else Text(text, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
    }
}

@Composable
fun RowScope.ChatActionButton(text: String, icon: ImageVector, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier
            .weight(1f)
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x1A007AFF))
            .border(1.dp, Color(0x29007AFF), RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 12.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = TcallColors.IosBlue, modifier = Modifier.size(16.dp))
        Spacer(Modifier.size(6.dp))
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1D4ED8))
    }
}

@Composable
fun IosSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White)
            .border(1.dp, Color(0x12000000), RoundedCornerShape(14.dp))
            .padding(horizontal = 12.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Default.Search, null, tint = Slate500, modifier = Modifier.size(18.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.weight(1f).padding(horizontal = 8.dp, vertical = 10.dp),
            textStyle = TextStyle(fontSize = 15.sp, color = Slate900),
            decorationBox = { inner ->
                if (value.isEmpty()) Text(placeholder, color = Slate500, fontSize = 15.sp)
                inner()
            },
        )
        trailing?.invoke()
    }
}

@Composable
fun ChatConvCard(
    name: String,
    preview: String,
    time: String?,
    unread: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier
            .fillMaxWidth()
            .shadow(2.dp, CardShape, ambientColor = Color(0x0D0F172A))
            .clip(CardShape)
            .background(Color.White)
            .border(1.dp, Color(0x12000000), CardShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        TcallAvatar(name = name, size = 48.dp)
        Column(Modifier.weight(1f)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Slate900, maxLines = 1)
                time?.let { Text(it, fontSize = 12.sp, color = Slate500) }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(preview, fontSize = 14.sp, color = Slate500, maxLines = 1, modifier = Modifier.weight(1f))
                if (unread > 0) {
                    Box(
                        Modifier
                            .background(TcallColors.Brand600, CircleShape)
                            .padding(horizontal = 7.dp, vertical = 2.dp),
                    ) {
                        Text(
                            if (unread > 9) "9+" else unread.toString(),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DialSubTabBar(
    selected: String,
    keypadLabel: String,
    recentsLabel: String,
    onKeypad: () -> Unit,
    onRecents: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x0F000000))
            .padding(4.dp),
    ) {
        listOf("keypad" to keypadLabel, "recents" to recentsLabel).forEach { (id, label) ->
            val active = selected == id
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (active) Color.White else Color.Transparent)
                    .clickable { if (id == "keypad") onKeypad() else onRecents() }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                    color = if (active) TcallColors.IosBlue else Slate500,
                    fontSize = 14.sp,
                )
            }
        }
    }
}

@Composable
fun FilterChipRow(
    chips: List<Pair<String, String>>,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        chips.forEach { (id, label) ->
            val active = selected == id
            Box(
                Modifier
                    .clip(RoundedCornerShape(99.dp))
                    .background(if (active) TcallColors.Brand600 else Color(0x0F000000))
                    .clickable { onSelect(id) }
                    .padding(horizontal = 12.dp, vertical = 7.dp),
            ) {
                Text(
                    label,
                    fontSize = 12.sp,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (active) Color.White else Slate700,
                )
            }
        }
    }
}

@Composable
fun GreenCallButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Box(
        modifier
            .size(40.dp)
            .shadow(4.dp, CircleShape, spotColor = TcallColors.CallGreen.copy(0.35f))
            .clip(CircleShape)
            .background(if (enabled) TcallColors.CallGreen else TcallColors.CallGreen.copy(0.4f))
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Default.Phone, null, tint = Color.White, modifier = Modifier.size(18.dp))
    }
}

@Composable
fun IosListCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(
        modifier
            .fillMaxWidth()
            .shadow(2.dp, CardShape, ambientColor = Color(0x0D0F172A))
            .clip(CardShape)
            .background(Color.White)
            .border(1.dp, Color(0x12000000), CardShape)
            .padding(16.dp),
    ) {
        content()
    }
}
