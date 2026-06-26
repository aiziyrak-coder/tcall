package uz.tcall.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.theme.TcallColors
import uz.tcall.ui.util.TCALL_LANGUAGES
import uz.tcall.ui.util.langLabel

@Composable
fun LanguagePickerSheet(
    title: String,
    selected: String,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(query) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) TCALL_LANGUAGES
        else TCALL_LANGUAGES.filter {
            it.code.contains(q) || it.label.lowercase().contains(q)
        }
    }

    IosBottomSheet(onDismiss = onDismiss) {
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TcallColors.TextPrimary)
        Spacer(Modifier.height(10.dp))
        TcallTextField(
            value = query,
            onValueChange = { query = it },
            label = "Qidirish",
            placeholder = "Til nomi yoki kod",
        )
        Spacer(Modifier.height(8.dp))
        LazyColumn(Modifier.heightIn(max = 420.dp)) {
            items(filtered, key = { it.code }) { lang ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (selected == lang.code) TcallColors.GlassCard else Color.Transparent)
                        .clickable {
                            onSelect(lang.code)
                            onDismiss()
                        }
                        .padding(vertical = 10.dp, horizontal = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        if (selected == lang.code) "●" else "○",
                        color = TcallColors.IosBlue,
                        modifier = Modifier.padding(end = 8.dp),
                    )
                    Text(lang.label, color = TcallColors.TextPrimary, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                    Text(lang.code.uppercase(), color = TcallColors.TextMuted, fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
fun LanguagePickerRow(
    label: String,
    selected: String,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(TcallColors.SurfaceElevated)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, fontSize = 12.sp, color = TcallColors.TextSecondary)
            Text(langLabel(selected), fontWeight = FontWeight.SemiBold, color = TcallColors.TextPrimary)
        }
        Text(selected.uppercase(), color = TcallColors.IosBlue, fontWeight = FontWeight.Bold, fontSize = 12.sp)
    }
}
