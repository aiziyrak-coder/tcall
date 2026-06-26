package uz.tcall.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import uz.tcall.ui.theme.TcallColors

@Composable
fun tcallTextFieldColors(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TcallColors.TextPrimary,
    unfocusedTextColor = TcallColors.TextPrimary,
    disabledTextColor = TcallColors.TextMuted,
    errorTextColor = TcallColors.Destructive,
    focusedContainerColor = TcallColors.GlassSheet,
    unfocusedContainerColor = Color.White.copy(alpha = 0.85f),
    disabledContainerColor = Color(0xFFF7F8FB),
    errorContainerColor = TcallColors.GlassSheet,
    focusedBorderColor = TcallColors.IosBlue,
    unfocusedBorderColor = TcallColors.Separator,
    disabledBorderColor = TcallColors.Separator,
    errorBorderColor = TcallColors.Destructive,
    focusedLabelColor = TcallColors.TextSecondary,
    unfocusedLabelColor = TcallColors.TextSecondary,
    cursorColor = TcallColors.IosBlue,
    focusedPlaceholderColor = TcallColors.TextMuted,
    unfocusedPlaceholderColor = TcallColors.TextMuted,
)

@Composable
fun TcallTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    singleLine: Boolean = true,
    maxLines: Int = 1,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    enabled: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label, color = TcallColors.TextSecondary, fontWeight = FontWeight.SemiBold) },
        placeholder = placeholder?.let { { Text(it, color = TcallColors.TextMuted, fontWeight = FontWeight.Normal) } },
        singleLine = singleLine,
        maxLines = maxLines,
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        colors = tcallTextFieldColors(),
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
    )
}
