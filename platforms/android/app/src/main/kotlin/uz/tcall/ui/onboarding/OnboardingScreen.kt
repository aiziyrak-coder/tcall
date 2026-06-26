package uz.tcall.ui.onboarding

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.launch
import uz.tcall.ui.components.TcallLogo
import uz.tcall.ui.components.TcallLogoVariant
import uz.tcall.ui.components.TcallPrimaryButton
import uz.tcall.ui.theme.TcallColors

private val TitleColor = Color(0xFF0F172A)
private val BodyColor = Color(0xFF334155)
private val MutedColor = Color(0xFF475569)

private enum class PageKind { FEATURE, PERMISSION }

private data class OnboardingPage(
    val kind: PageKind,
    val icon: ImageVector,
    val title: String,
    val desc: String,
    val reason: String = "",
    val permission: String? = null,
    val minSdk: Int = 1,
    val gradient: List<Color>,
)

private val pages = listOf(
    OnboardingPage(
        PageKind.FEATURE,
        Icons.Default.AutoAwesome,
        "Tcall ga xush kelibsiz",
        "Dunyo bilan o'z tilingizda gaplashing. 9 xonali Tcall raqamingiz bilan audio qo'ng'iroq qiling.",
        gradient = listOf(Color(0x336366F1), Color(0x1A5856D6), Color.Transparent),
    ),
    OnboardingPage(
        PageKind.FEATURE,
        Icons.Default.Language,
        "Real-time tarjima",
        "70+ til. Sherik boshqa tilda gapirsa ham, aqlli tarjima qiladi va siz o'z tilingizda eshitasiz.",
        gradient = listOf(Color(0x3334C759), Color(0x1A007AFF), Color.Transparent),
    ),
    OnboardingPage(
        PageKind.FEATURE,
        Icons.Default.Phone,
        "Qo'ng'iroq va xabar",
        "Yuqori sifatli audio qo'ng'iroq va chat — hammasi avtomatik tarjima bilan.",
        gradient = listOf(Color(0x333B82F6), Color(0x1A5856D6), Color.Transparent),
    ),
    OnboardingPage(
        PageKind.FEATURE,
        Icons.Default.Shield,
        "Xavfsiz va shaxsiy",
        "PIN qulf, yuz orqali tiklash va himoyalangan muloqot.",
        gradient = listOf(Color(0x338B5CF6), Color(0x1A6366F1), Color.Transparent),
    ),
    OnboardingPage(
        PageKind.PERMISSION,
        Icons.Default.Notifications,
        "Bildirishnomalar",
        "Kiruvchi qo'ng'iroq va yangi xabar haqida darhol xabar olish uchun.",
        reason = "Ilova yopiq bo'lsa ham qo'ng'iroqni o'tkazib yubormaslik va tez javob berish uchun bildirishnomalar kerak.",
        permission = Manifest.permission.POST_NOTIFICATIONS,
        minSdk = 33,
        gradient = listOf(Color(0x33F59E0B), Color(0x1A6366F1), Color.Transparent),
    ),
    OnboardingPage(
        PageKind.PERMISSION,
        Icons.Default.Mic,
        "Mikrofon",
        "Ovozli qo'ng'iroq va jonli tarjima uchun mikrofoningizdan foydalanamiz.",
        reason = "Suhbatdosh sizni eshitishi va tarjima tizimi ovozingizni qayta ishlashi uchun ruxsat zarur.",
        permission = Manifest.permission.RECORD_AUDIO,
        gradient = listOf(Color(0x3334C759), Color(0x1A007AFF), Color.Transparent),
    ),
    OnboardingPage(
        PageKind.PERMISSION,
        Icons.Default.CameraAlt,
        "Kamera",
        "Video qo'ng'iroq va PIN tiklashda yuzni tanish uchun.",
        reason = "Xavfsizlik: PIN unutganda yuz orqali hisobni tiklash va video muloqot uchun kamera kerak.",
        permission = Manifest.permission.CAMERA,
        gradient = listOf(Color(0x338B5CF6), Color(0x1A3B82F6), Color.Transparent),
    ),
    OnboardingPage(
        PageKind.PERMISSION,
        Icons.Default.LocationOn,
        "Joylashuv (GPS)",
        "Vaqt mintaqasi va xavfsizlik xizmatlari uchun.",
        reason = "Mahalliy vaqt va mintaqangizni aniqlash, shuningdek favqulodda holatda joylashuvni ulashish uchun GPS ishlatiladi.",
        permission = Manifest.permission.ACCESS_FINE_LOCATION,
        gradient = listOf(Color(0x33EF4444), Color(0x1A6366F1), Color.Transparent),
    ),
)

private fun isPermissionGranted(context: android.content.Context, permission: String?): Boolean {
    if (permission == null) return true
    return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
}

private fun openAppSettings(context: android.content.Context) {
    context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        },
    )
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(onComplete: () -> Unit) {
    val context = LocalContext.current
    val activity = context as? android.app.Activity
    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()

    val grantedMap = remember {
        mutableStateMapOf<String, Boolean>().apply {
            pages.filter { it.permission != null }.forEach { page ->
                page.permission?.let { perm ->
                    val granted = if (page.minSdk > Build.VERSION.SDK_INT) {
                        true
                    } else {
                        isPermissionGranted(context, perm)
                    }
                    put(perm, granted)
                }
            }
        }
    }
    var pendingPermission by remember { mutableStateOf<String?>(null) }
    val requestedMap = remember { mutableStateMapOf<String, Boolean>() }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        val perm = pendingPermission ?: return@rememberLauncherForActivityResult
        pendingPermission = null
        grantedMap[perm] = granted
    }

    fun requestPermission(page: OnboardingPage) {
        val perm = page.permission ?: return
        if (page.minSdk > Build.VERSION.SDK_INT) {
            grantedMap[perm] = true
            return
        }
        if (isPermissionGranted(context, perm)) {
            grantedMap[perm] = true
            return
        }
        val alreadyAsked = requestedMap[perm] == true
        val showRationale = activity != null &&
            ActivityCompat.shouldShowRequestPermissionRationale(activity, perm)
        if (alreadyAsked && !showRationale) {
            openAppSettings(context)
            return
        }
        requestedMap[perm] = true
        pendingPermission = perm
        permissionLauncher.launch(perm)
    }

    fun permissionButtonLabel(page: OnboardingPage): String {
        val perm = page.permission ?: return "Ruxsat berish"
        if (grantedMap[perm] == true) return "Ruxsat berildi ✓"
        if (page.minSdk > Build.VERSION.SDK_INT) return "Avtomatik yoqilgan ✓"
        val alreadyAsked = requestedMap[perm] == true
        val showRationale = activity != null &&
            ActivityCompat.shouldShowRequestPermissionRationale(activity, perm)
        if (alreadyAsked && !showRationale &&
            !isPermissionGranted(context, perm)
        ) {
            return "Sozlamalardan yoqish"
        }
        return "Ruxsat berish"
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(TcallColors.BgPrimary),
    ) {
        val currentGradient = pages.getOrElse(pagerState.currentPage) { pages.last() }.gradient
        Box(
            Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(currentGradient)),
        )

        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                if (pagerState.currentPage < pages.size - 1) {
                    TextButton(onClick = onComplete) {
                        Text(
                            "O'tish",
                            color = MutedColor,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                        )
                    }
                }
            }

            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f),
            ) { pageIndex ->
                val page = pages[pageIndex]
                Column(
                    Modifier
                        .fillMaxSize()
                        .padding(horizontal = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    TcallLogo(variant = TcallLogoVariant.Icon, width = 64.dp)
                    Spacer(Modifier.height(28.dp))

                    Box(
                        Modifier
                            .size(88.dp)
                            .shadow(8.dp, RoundedCornerShape(28.dp))
                            .clip(RoundedCornerShape(28.dp))
                            .background(Color.White.copy(alpha = 0.95f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            page.icon,
                            contentDescription = null,
                            tint = TcallColors.Brand600,
                            modifier = Modifier.size(40.dp),
                        )
                    }
                    Spacer(Modifier.height(24.dp))

                    Text(
                        page.title,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                        color = TitleColor,
                        textAlign = TextAlign.Center,
                        lineHeight = 32.sp,
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        page.desc,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = BodyColor,
                        textAlign = TextAlign.Center,
                        lineHeight = 24.sp,
                    )

                    if (page.kind == PageKind.PERMISSION) {
                        Spacer(Modifier.height(16.dp))
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color.White.copy(alpha = 0.9f))
                                .clickable { requestPermission(page) }
                                .padding(16.dp),
                        ) {
                            Column {
                                Text(
                                    "Nima uchun kerak?",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = TitleColor,
                                )
                                Spacer(Modifier.height(6.dp))
                                Text(
                                    page.reason,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = BodyColor,
                                    lineHeight = 20.sp,
                                )
                            }
                        }
                        Spacer(Modifier.height(20.dp))
                        TcallPrimaryButton(
                            text = permissionButtonLabel(page),
                            onClick = { requestPermission(page) },
                            enabled = page.permission == null ||
                                grantedMap[page.permission] != true,
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Tugmani bosing — tizim ruxsat oynasi chiqadi",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = MutedColor,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }

            Column(
                Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 24.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(pages.size) { i ->
                        Box(
                            Modifier
                                .size(if (pagerState.currentPage == i) 10.dp else 8.dp)
                                .clip(CircleShape)
                                .background(
                                    if (pagerState.currentPage == i) TcallColors.IosBlue else Color(0x80334155),
                                ),
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (pagerState.currentPage > 0) {
                        TextButton(
                            onClick = {
                                scope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage - 1)
                                }
                            },
                            modifier = Modifier.size(48.dp),
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                                contentDescription = "Orqaga",
                                tint = TitleColor,
                            )
                        }
                    }
                    TcallPrimaryButton(
                        text = if (pagerState.currentPage == pages.size - 1) "Boshlash" else "Keyingi",
                        onClick = {
                            if (pagerState.currentPage == pages.size - 1) {
                                onComplete()
                            } else {
                                scope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage + 1)
                                }
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                    if (pagerState.currentPage < pages.size - 1) {
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = null,
                            tint = Color.Transparent,
                            modifier = Modifier.size(48.dp),
                        )
                    }
                }
            }
        }
    }
}
