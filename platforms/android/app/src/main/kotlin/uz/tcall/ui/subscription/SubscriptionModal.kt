package uz.tcall.ui.subscription

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.tcall.data.SubscriptionRepository
import uz.tcall.network.SubscriptionResponse
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosCenterModal
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.theme.TcallColors
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close

@Composable
fun SubscriptionModal(
    open: Boolean,
    repository: SubscriptionRepository,
    onClose: () -> Unit,
) {
    if (!open) return
    var loading by remember { mutableStateOf(true) }
    var data by remember { mutableStateOf<SubscriptionResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var purchasing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            repository.load()
                .onSuccess { data = it; error = null }
                .onFailure { error = it.message }
            loading = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    IosCenterModal(onDismiss = onClose) {
        androidx.compose.foundation.layout.Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Obuna", fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.weight(1f))
            IosIconButton(Icons.Default.Close, onClose)
        }
        Spacer(Modifier.height(12.dp))
        when {
            loading -> CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
            error != null -> Text(error!!, color = TcallColors.Destructive)
            else -> {
                val d = data!!
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    Text(
                        "Joriy reja: ${d.plan ?: "free"}",
                        fontWeight = FontWeight.SemiBold,
                        color = TcallColors.TextPrimary,
                    )
                    d.subscription?.expiresAt?.let {
                        Text("Muddati: $it", fontSize = 13.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 4.dp))
                    }
                    Spacer(Modifier.height(16.dp))
                    listOf("premium" to "Premium", "premium_plus" to "Premium+").forEach { (plan, label) ->
                        val price = d.pricesUzs?.get(plan) ?: d.prices?.get(plan)?.toInt()
                        GradientPrimaryButton(
                            text = if (purchasing) "..." else "$label ${price?.let { "— $it so'm" } ?: ""}",
                            onClick = {
                                scope.launch {
                                    purchasing = true
                                    repository.purchase(plan)
                                        .onSuccess { data = it }
                                        .onFailure { error = it.message }
                                    purchasing = false
                                }
                            },
                            enabled = !purchasing,
                            loading = purchasing,
                            modifier = Modifier.padding(vertical = 4.dp),
                        )
                    }
                    d.card?.number?.let { num ->
                        Spacer(Modifier.height(12.dp))
                        Text("To'lov kartasi: $num", fontSize = 13.sp, color = TcallColors.TextSecondary)
                        Text("Karta egasi: ${d.card.holder ?: ""}", fontSize = 12.sp, color = TcallColors.TextMuted)
                    }
                    d.pendingPayment?.let { p ->
                        Spacer(Modifier.height(12.dp))
                        Text("Kutilayotgan to'lov: ${p.amount} ${p.currency}", color = TcallColors.IosBlue, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}
