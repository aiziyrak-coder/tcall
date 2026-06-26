package uz.tcall.web

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.result.ActivityResultLauncher
import uz.tcall.bridge.WebAppBridge

class AppWebChromeClient(
    private val activity: Activity,
    private val permissionLauncher: ActivityResultLauncher<Array<String>>,
    private val fileChooserLauncher: ActivityResultLauncher<Intent>,
    private val onProgress: (Int) -> Unit,
) : WebChromeClient() {

    private var pendingRequest: PermissionRequest? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    fun onPermissionResults(grants: Map<String, Boolean>) {
        val req = pendingRequest ?: return
        pendingRequest = null
        if (grants.values.all { it }) req.grant(req.resources) else req.deny()
    }

    fun onFileResult(uris: Array<Uri>?) {
        fileCallback?.onReceiveValue(uris)
        fileCallback = null
    }

    override fun onProgressChanged(view: WebView?, newProgress: Int) {
        onProgress(newProgress)
    }

    override fun onPermissionRequest(request: PermissionRequest?) {
        request ?: return
        val perms = WebPermissionMapper.androidPermissions(request.resources)
        if (perms.isEmpty()) {
            request.grant(request.resources)
            return
        }
        val missing = perms.filter {
            androidx.core.content.ContextCompat.checkSelfPermission(activity, it) !=
                android.content.pm.PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            request.grant(request.resources)
            return
        }
        pendingRequest = request
        permissionLauncher.launch(missing.toTypedArray())
    }

    override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?,
    ): Boolean {
        fileCallback?.onReceiveValue(null)
        fileCallback = filePathCallback
        val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        return runCatching {
            fileChooserLauncher.launch(intent)
            true
        }.getOrElse {
            fileCallback = null
            false
        }
    }
}

class AppWebViewClient(
    private val allowedHosts: Set<String>,
    private val onReady: () -> Unit,
    private val onMainError: () -> Unit,
    private val openExternal: (Uri) -> Unit,
) : android.webkit.WebViewClient() {

    override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
        val uri = request?.url ?: return false
        if (!request.isForMainFrame) return false
        val scheme = uri.scheme?.lowercase().orEmpty()
        if (scheme != "http" && scheme != "https") return true
        val host = uri.host?.lowercase().orEmpty()
        if (host in allowedHosts || host.endsWith(".tcall.uz")) return false
        openExternal(uri)
        return true
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        view?.evaluateJavascript(WebAppBridge.documentStartScript(), null)
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        android.webkit.CookieManager.getInstance().flush()
        if (url?.startsWith("file:///android_asset/") != true) onReady()
    }

    override fun onReceivedError(
        view: WebView?,
        request: android.webkit.WebResourceRequest?,
        error: android.webkit.WebResourceError?,
    ) {
        if (request?.isForMainFrame == true) onMainError()
    }

    @Deprecated("Deprecated in Java")
    override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
        if (failingUrl != null) onMainError()
    }

    override fun onRenderProcessGone(view: WebView?, detail: android.webkit.RenderProcessGoneDetail?): Boolean {
        view?.reload()
        return true
    }
}

private object WebPermissionMapper {
    fun androidPermissions(resources: Array<String>): List<String> {
        val out = mutableListOf<String>()
        val joined = resources.joinToString(",").uppercase()
        if ("AUDIO" in joined) out.add(android.Manifest.permission.RECORD_AUDIO)
        if ("VIDEO" in joined) out.add(android.Manifest.permission.CAMERA)
        return out
    }
}
