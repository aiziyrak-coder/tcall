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
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import uz.tcall.ui.theme.TcallColors

@Composable
fun tcallTextFieldColors(): TextFieldColors = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TcallColors.TextPrimary,
    unfocusedTextColor = TcallColors.TextPrimary,
    disabledTextColor = TcallColors.Slate400,
    errorTextColor = TcallColors.Destructive,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White,
    disabledContainerColor = Color(0xFFF7F8FB),
    errorContainerColor = Color.White,
    focusedBorderColor = TcallColors.IosBlue,
    unfocusedBorderColor = TcallColors.Separator,
    disabledBorderColor = TcallColors.Separator,
    errorBorderColor = TcallColors.Destructive,
    focusedLabelColor = TcallColors.Slate500,
    unfocusedLabelColor = TcallColors.Slate400,
    cursorColor = TcallColors.IosBlue,
    focusedPlaceholderColor = TcallColors.Slate400,
    unfocusedPlaceholderColor = TcallColors.Slate400,
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
        label = { Text(label, color = TcallColors.Slate500) },
        placeholder = placeholder?.let { { Text(it, color = TcallColors.Slate400) } },
        singleLine = singleLine,
        maxLines = maxLines,
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = tcallTextFieldColors(),
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
    )
}
