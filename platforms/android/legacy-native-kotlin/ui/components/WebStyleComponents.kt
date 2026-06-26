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
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.text.TextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.unit.Dp
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
import uz.tcall.ui.theme.GlassLevel
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.theme.TcallGlassSurface

private val CardShape = RoundedCornerShape(20.dp)
private val PillShape = RoundedCornerShape(99.dp)

@Composable
fun IosPageTitle(title: String, modifier: Modifier = Modifier) {
    Text(
        title,
        modifier = modifier,
        style = androidx.compose.material3.MaterialTheme.typography.headlineSmall,
        fontSize = 24.sp,
        color = TcallColors.TextPrimary,
        letterSpacing = (-0.3).sp,
    )
}

@Composable
fun PhoneTabPill(tab: PhoneTab, label: String, modifier: Modifier = Modifier) {
    Row(
        modifier
            .clip(PillShape)
            .background(TcallColors.SaladSoft)
            .border(0.5.dp, TcallColors.AccentBorderSoft, PillShape)
            .padding(start = 4.dp, end = 10.dp, top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(
            Modifier
                .size(26.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(TcallColors.GlassSheet),
            contentAlignment = Alignment.Center,
        ) {
            Icon(tab.icon, null, tint = TcallColors.IconActive, modifier = Modifier.size(14.dp))
        }
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary)
    }
}

@Composable
fun UserNumberChip(yourNumberLabel: String, number: String, modifier: Modifier = Modifier) {
    TcallGlassSurface(
        modifier = modifier,
        level = GlassLevel.Button,
        shape = RoundedCornerShape(12.dp),
        elevation = 2.dp,
    ) {
        Column(Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
            Text(
                yourNumberLabel,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = TcallColors.TextSecondary,
                letterSpacing = 0.5.sp,
            )
            Text(
                number,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = TcallColors.TextPrimary,
                letterSpacing = 1.sp,
            )
        }
    }
}

@Composable
fun IosIconButton(
    icon: ImageVector,
    onClick: () -> Unit,
    tint: Color = TcallColors.IconPrimary,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    iconSize: Dp = 22.dp,
    glass: Boolean = false,
) {
    val shape = CircleShape
    val boxMod = modifier
        .size(size)
        .clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null,
            onClick = onClick,
        )

    if (glass) {
        TcallGlassSurface(
            modifier = boxMod,
            level = GlassLevel.Button,
            shape = shape,
            elevation = 2.dp,
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(iconSize))
            }
        }
    } else {
        Box(boxMod, contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(iconSize))
        }
    }
}

@Composable
fun AcceptRejectButtons(
    onAccept: () -> Unit,
    onReject: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    size: Dp = 44.dp,
    iconSize: Dp = 22.dp,
) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        CircleActionButton(
            color = TcallColors.CallGreen,
            icon = Icons.Default.Check,
            contentDescription = "Qabul qilish",
            onClick = onAccept,
            enabled = enabled,
            size = size,
            iconSize = iconSize,
        )
        CircleActionButton(
            color = TcallColors.Destructive,
            icon = Icons.Default.Close,
            contentDescription = "Rad etish",
            onClick = onReject,
            enabled = enabled,
            size = size,
            iconSize = iconSize,
        )
    }
}

@Composable
fun CallAcceptRejectButtons(
    onAccept: () -> Unit,
    onReject: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    size: Dp = 56.dp,
) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(20.dp), verticalAlignment = Alignment.CenterVertically) {
        CircleActionButton(
            color = TcallColors.Destructive,
            icon = Icons.Default.CallEnd,
            contentDescription = "Rad etish",
            onClick = onReject,
            enabled = enabled,
            size = size,
            iconSize = 26.dp,
        )
        CircleActionButton(
            color = TcallColors.CallGreen,
            icon = Icons.Default.Phone,
            contentDescription = "Ko'tarish",
            onClick = onAccept,
            enabled = enabled,
            size = size,
            iconSize = 26.dp,
        )
    }
}

@Composable
private fun CircleActionButton(
    color: Color,
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    enabled: Boolean,
    size: Dp,
    iconSize: Dp,
) {
    Box(
        Modifier
            .size(size)
            .shadow(6.dp, CircleShape, spotColor = color.copy(0.35f))
            .clip(CircleShape)
            .background(if (enabled) color else color.copy(0.45f))
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = contentDescription, tint = Color.White, modifier = Modifier.size(iconSize))
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
            .height(48.dp)
            .shadow(if (enabled) 6.dp else 0.dp, RoundedCornerShape(14.dp), spotColor = TcallColors.Accent.copy(0.25f))
            .clip(RoundedCornerShape(14.dp))
            .background(if (enabled) TcallColors.Accent else TcallColors.Accent.copy(0.45f))
            .clickable(enabled = enabled && !loading, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        else Text(text, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
    }
}

@Composable
fun RowScope.ChatActionButton(text: String, icon: ImageVector, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier
            .weight(1f)
            .clip(RoundedCornerShape(16.dp))
            .background(TcallColors.AccentSoft)
            .border(0.5.dp, TcallColors.AccentBorderSoft, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 13.dp, horizontal = 12.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = TcallColors.IconActive, modifier = Modifier.size(17.dp))
        Spacer(Modifier.size(6.dp))
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TcallColors.TextPrimary)
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
    TcallGlassSurface(
        modifier = modifier.fillMaxWidth(),
        level = GlassLevel.Input,
        shape = RoundedCornerShape(14.dp),
        elevation = 2.dp,
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.Search, null, tint = TcallColors.IconMuted, modifier = Modifier.size(18.dp))
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f).padding(horizontal = 8.dp, vertical = 10.dp),
                textStyle = TextStyle(fontSize = 15.sp, color = TcallColors.TextPrimary, fontWeight = FontWeight.Medium),
                decorationBox = { inner ->
                    if (value.isEmpty()) {
                        Text(placeholder, color = TcallColors.TextMuted, fontSize = 15.sp, fontWeight = FontWeight.Normal)
                    }
                    inner()
                },
            )
            trailing?.invoke()
        }
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
    TcallGlassSurface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        level = GlassLevel.Card,
        shape = CardShape,
        elevation = 4.dp,
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            TcallAvatar(name = name, size = 48.dp)
            Column(Modifier.weight(1f)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(
                        name,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = TcallColors.TextPrimary,
                        maxLines = 1,
                    )
                    time?.let {
                        Text(it, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = TcallColors.TextSecondary)
                    }
                }
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        preview,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Normal,
                        color = TcallColors.TextSecondary,
                        maxLines = 1,
                        modifier = Modifier.weight(1f),
                    )
                    if (unread > 0) {
                        Box(
                            Modifier
                                .clip(CircleShape)
                                .background(TcallColors.LogoBlue)
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
    TcallGlassSurface(
        modifier = modifier.fillMaxWidth(),
        level = GlassLevel.Input,
        shape = RoundedCornerShape(14.dp),
        elevation = 2.dp,
    ) {
        Row(Modifier.fillMaxWidth().padding(4.dp)) {
            listOf("keypad" to keypadLabel, "recents" to recentsLabel).forEach { (id, label) ->
                val active = selected == id
                Box(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (active) TcallColors.GlassSheet else Color.Transparent)
                        .clickable { if (id == "keypad") onKeypad() else onRecents() }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        fontWeight = if (active) FontWeight.Bold else FontWeight.SemiBold,
                        color = if (active) TcallColors.IconActive else TcallColors.TextSecondary,
                        fontSize = 14.sp,
                    )
                }
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
                    .clip(PillShape)
                    .background(if (active) TcallColors.AccentInk else TcallColors.SurfaceHighlight)
                    .border(0.5.dp, if (active) Color.Transparent else TcallColors.GlassHairline, PillShape)
                    .clickable { onSelect(id) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            ) {
                Text(
                    label,
                    fontSize = 12.sp,
                    fontWeight = if (active) FontWeight.Bold else FontWeight.SemiBold,
                    color = if (active) TcallColors.TextOnAccent else TcallColors.TextPrimary,
                )
            }
        }
    }
}

@Composable
fun GreenCallButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    size: Dp = 40.dp,
) {
    Box(
        modifier
            .size(size)
            .shadow(4.dp, CircleShape, spotColor = TcallColors.Accent.copy(0.2f))
            .clip(CircleShape)
            .background(if (enabled) TcallColors.LogoBlue else TcallColors.SlateLight)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Default.Phone, null, tint = Color.White, modifier = Modifier.size(size * 0.48f))
    }
}

@Composable
fun IosListCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    TcallGlassSurface(
        modifier = modifier.fillMaxWidth(),
        level = GlassLevel.Card,
        shape = CardShape,
        elevation = 4.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            content()
        }
    }
}
