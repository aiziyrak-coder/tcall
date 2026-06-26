package uz.tcall.ui.subscription

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uz.tcall.data.SubscriptionRepository
import uz.tcall.network.SubscriptionResponse
import uz.tcall.ui.components.GradientPrimaryButton
import uz.tcall.ui.components.IosCenterModal
import uz.tcall.ui.components.IosIconButton
import uz.tcall.ui.components.ModalScrollColumn
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
    val context = LocalContext.current
    var loading by remember { mutableStateOf(true) }
    var data by remember { mutableStateOf<SubscriptionResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var purchasing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun openPaymentUrl(url: String?) {
        if (url.isNullOrBlank()) return
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }

    fun reload() {
        scope.launch {
            loading = true
            repository.load()
                .onSuccess { data = it; error = null }
                .onFailure { error = it.message ?: "Xatolik" }
            loading = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    val pending = data?.pendingPayment
    LaunchedEffect(pending?.id, pending?.status) {
        if (pending == null || pending.status != "pending") return@LaunchedEffect
        while (true) {
            delay(5000)
            repository.load()
                .onSuccess { fresh ->
                    data = fresh
                    if (fresh.pendingPayment == null || fresh.pendingPayment.status != "pending") {
                        error = null
                    }
                }
        }
    }

    IosCenterModal(onDismiss = onClose) {
        androidx.compose.foundation.layout.Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Obuna", fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.weight(1f))
            IosIconButton(Icons.Default.Close, onClose)
        }
        Spacer(Modifier.height(12.dp))
        when {
            loading -> CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
            error != null -> Text(error ?: "Xatolik", color = TcallColors.Destructive)
            data == null -> Text("Ma'lumot yuklanmadi", color = TcallColors.Destructive)
            else -> {
                val d = data!!
                ModalScrollColumn {
                    Text(
                        "Joriy reja: ${d.plan ?: "free"}",
                        fontWeight = FontWeight.SemiBold,
                        color = TcallColors.TextPrimary,
                    )
                    d.subscription?.expiresAt?.let {
                        Text("Muddati: $it", fontSize = 13.sp, color = TcallColors.TextSecondary, modifier = Modifier.padding(top = 4.dp))
                    }
                    Spacer(Modifier.height(16.dp))

                    d.pendingPayment?.let { p ->
                        Text(
                            "Kutilayotgan to'lov: ${p.amount} ${p.currency}",
                            color = TcallColors.IosBlue,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            "Cryptomus orqali to'lovni yakunlang. Obuna avtomatik yoqiladi.",
                            fontSize = 12.sp,
                            color = TcallColors.TextSecondary,
                            modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
                        )
                        GradientPrimaryButton(
                            text = "To'lov sahifasini ochish",
                            onClick = { openPaymentUrl(p.paymentUrl) },
                            enabled = !p.paymentUrl.isNullOrBlank(),
                            modifier = Modifier.padding(vertical = 4.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    if (d.pendingPayment == null) {
                        listOf("premium" to "Premium", "premium_plus" to "Premium+").forEach { (plan, label) ->
                            val price = d.pricesUzs?.get(plan) ?: d.prices?.get(plan)?.toInt()
                            GradientPrimaryButton(
                                text = if (purchasing) "..." else "$label ${price?.let { "— $it so'm" } ?: ""}",
                                onClick = {
                                    scope.launch {
                                        purchasing = true
                                        repository.purchase(plan)
                                            .onSuccess { fresh ->
                                                data = fresh
                                                error = null
                                                openPaymentUrl(fresh.pendingPayment?.paymentUrl)
                                            }
                                            .onFailure { err -> error = err.message ?: "Xatolik" }
                                        purchasing = false
                                    }
                                },
                                enabled = !purchasing && (d.paymentConfigured != false),
                                loading = purchasing,
                                modifier = Modifier.padding(vertical = 4.dp),
                            )
                        }
                        if (d.paymentConfigured == false) {
                            Text(
                                "To'lov tizimi sozlanmoqda. Keyinroq urinib ko'ring.",
                                fontSize = 12.sp,
                                color = TcallColors.TextMuted,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}
