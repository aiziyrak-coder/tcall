package uz.tcall.ui.interpreter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.tcall.ui.components.TcallGlassCard
import uz.tcall.ui.components.TcallSectionTitle
import uz.tcall.ui.components.tcallTextFieldColors
import uz.tcall.ui.theme.TcallColors

@Composable
fun InterpreterScreen(viewModel: InterpreterViewModel) {
    val state by viewModel.state.collectAsState()
    val fieldColors = tcallTextFieldColors()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        TcallSectionTitle("Jonli tarjimon", modifier = Modifier.padding(horizontal = 0.dp))
        Text(
            "Mikrofonni bosib ushlab turing, gapiring, keyin qo'yib yuboring.",
            fontSize = 14.sp,
            color = TcallColors.Slate500,
            lineHeight = 20.sp,
        )

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LangField("Dan", state.sourceLang, viewModel::setSourceLang, Modifier.weight(1f), fieldColors)
            LangField("Ga", state.targetLang, viewModel::setTargetLang, Modifier.weight(1f), fieldColors)
        }

        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            IconButton(
                onClick = {
                    if (state.recording) viewModel.stopAndProcess() else viewModel.startRecording()
                },
                enabled = !state.processing,
                modifier = Modifier
                    .size(72.dp)
                    .shadow(10.dp, CircleShape, spotColor = TcallColors.IosBlue.copy(alpha = 0.35f))
                    .background(
                        if (state.recording) TcallColors.Destructive else TcallColors.IosBlue,
                        CircleShape,
                    ),
            ) {
                Icon(
                    if (state.recording) Icons.Default.Stop else Icons.Default.Mic,
                    contentDescription = if (state.recording) "To'xtatish" else "Yozish",
                    tint = Color.White,
                    modifier = Modifier.size(32.dp),
                )
            }
            Text(
                when {
                    state.processing -> "Tarjima qilinmoqda..."
                    state.recording -> "Yozilmoqda — qo'yib yuboring"
                    else -> "Bosib gapiring"
                },
                modifier = Modifier.padding(top = 10.dp),
                fontSize = 14.sp,
                color = TcallColors.Slate500,
            )
            if (state.processing) {
                CircularProgressIndicator(Modifier.padding(top = 12.dp), color = TcallColors.IosBlue)
            }
        }

        state.error?.let {
            Text(it, color = TcallColors.Destructive, fontSize = 13.sp)
        }

        state.original?.let { orig ->
            ResultCard("Asl", orig)
        }
        state.translated?.let { tr ->
            ResultCard("Tarjima", tr)
        }
    }
}

@Composable
private fun LangField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    colors: androidx.compose.material3.TextFieldColors,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label, color = TcallColors.Slate500) },
        modifier = modifier,
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = colors,
    )
}

@Composable
private fun ResultCard(title: String, text: String) {
    TcallGlassCard {
        Text(title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = TcallColors.Slate500)
        Spacer(Modifier.height(6.dp))
        Text(text, fontSize = 16.sp, color = TcallColors.TextPrimary, lineHeight = 22.sp)
    }
}
