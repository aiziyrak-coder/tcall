package uz.tcall.web

import android.graphics.Bitmap
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

class TcallWebViewClient(
    private val allowedHosts: Set<String>,
    private val onPageLoaded: () -> Unit = {},
) : WebViewClient() {

    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        val uri = request?.url ?: return false
        if (uri.scheme == "http" || uri.scheme == "https") {
            val host = uri.host?.lowercase().orEmpty()
            if (host in allowedHosts || host.endsWith(".tcall.uz")) {
                return false
            }
            return true
        }
        return true
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        onPageLoaded()
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        view?.evaluateJavascript(TcallAndroidBridge.DOCUMENT_START_SCRIPT, null)
    }
}
