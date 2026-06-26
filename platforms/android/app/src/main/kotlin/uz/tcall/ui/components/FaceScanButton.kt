package uz.tcall.ui.components

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uz.tcall.ui.theme.TcallColors

@Composable
fun FaceScanButton(
    scanned: Boolean,
    onImageCaptured: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicturePreview(),
    ) { bitmap ->
        if (bitmap != null) {
            scope.launch {
                val dataUrl = withContext(Dispatchers.Default) {
                    bitmapToFaceDataUrl(bitmap)
                }
                onImageCaptured(dataUrl)
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) cameraLauncher.launch(null)
    }

    fun startScan() {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) {
            cameraLauncher.launch(null)
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    TcallPrimaryButton(
        text = if (scanned) "Yuz tayyor ✓ — qayta skanerlash" else "Yuzni skanerlash (majburiy)",
        onClick = ::startScan,
        modifier = modifier,
    )
    Text(
        if (scanned) "Yuz rasmi yuborishga tayyor" else "PIN o'rnatish uchun avval yuzingizni skaner qiling",
        fontSize = 12.sp,
        color = TcallColors.TextSecondary,
        modifier = Modifier.padding(top = 8.dp),
    )
}
