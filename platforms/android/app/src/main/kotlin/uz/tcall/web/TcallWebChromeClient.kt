package uz.tcall.web

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.result.ActivityResultLauncher
import androidx.core.content.ContextCompat

class TcallWebChromeClient(
    private val activity: Activity,
    private val permissionLauncher: ActivityResultLauncher<Array<String>>,
    private val fileChooserLauncher: ActivityResultLauncher<Intent>,
    private val onProgress: (Int) -> Unit = {},
) : WebChromeClient() {

    private var pendingMediaRequest: PermissionRequest? = null
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null

    fun onPermissionsResult(grants: Map<String, Boolean>) {
        val req = pendingMediaRequest ?: return
        pendingMediaRequest = null
        if (grants.values.all { it }) req.grant(req.resources) else req.deny()
    }

    fun onFileChooserResult(uris: Array<Uri>?) {
        fileChooserCallback?.onReceiveValue(uris)
        fileChooserCallback = null
    }

    override fun onProgressChanged(view: WebView?, newProgress: Int) {
        onProgress(newProgress)
    }

    override fun onPermissionRequest(request: PermissionRequest?) {
        request ?: return
        val needs = request.resources.toList()
        val androidPerms = mutableListOf<String>()
        if (needs.any { it.contains("AUDIO", ignoreCase = true) }) {
            androidPerms.add(Manifest.permission.RECORD_AUDIO)
        }
        if (needs.any { it.contains("VIDEO", ignoreCase = true) }) {
            androidPerms.add(Manifest.permission.CAMERA)
        }

        if (androidPerms.isEmpty()) {
            request.grant(request.resources)
            return
        }

        val missing = androidPerms.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            request.grant(request.resources)
            return
        }

        pendingMediaRequest = request
        permissionLauncher.launch(missing.toTypedArray())
    }

    override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?,
    ): Boolean {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = filePathCallback
        val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        return runCatching {
            fileChooserLauncher.launch(intent)
            true
        }.getOrElse {
            fileChooserCallback = null
            false
        }
    }
}
