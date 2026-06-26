package uz.tcall.web

import android.graphics.Bitmap
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.browser.customtabs.CustomTabsIntent

class TcallWebViewClient(
    private val allowedHosts: Set<String>,
    private val onPageLoaded: () -> Unit = {},
    private val onPageError: () -> Unit = {},
) : WebViewClient() {

    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        val uri = request?.url ?: return false
        val scheme = uri.scheme?.lowercase().orEmpty()
        if (scheme != "http" && scheme != "https") return true

        val host = uri.host?.lowercase().orEmpty()
        if (host in allowedHosts || host.endsWith(".tcall.uz")) return false

        view?.context?.let { ctx ->
            runCatching {
                CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(ctx, uri)
            }.onFailure {
                view.loadUrl(uri.toString())
            }
        }
        return true
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        view?.evaluateJavascript(TcallAndroidBridge.DOCUMENT_START_SCRIPT, null)
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        CookieManager.getInstance().flush()
        if (url?.startsWith("file:///android_asset/") != true) {
            onPageLoaded()
        }
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?,
    ) {
        if (request?.isForMainFrame == true) onPageError()
    }

    @Deprecated("Deprecated in Java")
    override fun onReceivedError(
        view: WebView?,
        errorCode: Int,
        description: String?,
        failingUrl: String?,
    ) {
        if (failingUrl != null) onPageError()
    }

    override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
        view?.reload()
        return true
    }
}
