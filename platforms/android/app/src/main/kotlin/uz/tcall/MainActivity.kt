package uz.tcall

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.lifecycle.lifecycleScope
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import uz.tcall.push.TcallFirebaseMessagingService
import uz.tcall.web.TcallAndroidBridge
import uz.tcall.web.TcallWebChromeClient
import uz.tcall.web.TcallWebViewClient

/**
 * Tcall Android — web.tcall.uz WebView ilovasi.
 * Veb bilan bir xil dizayn va funksiyalar.
 */
class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var chromeClient: TcallWebChromeClient
    private var startUrl: String? = null

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants -> chromeClient.onPermissionsResult(grants) }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { _ -> /* web bridge qayta urinadi */ }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val uris = WebChromeClientResult.parse(result.resultCode, result.data)
        chromeClient.onFileChooserResult(uris)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        if (android.os.Build.VERSION.SDK_INT >= 33) {
            notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }

        webView = WebView(this)
        setContentView(
            webView,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )

        ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.updatePadding(top = bars.top, bottom = bars.bottom)
            insets
        }

        chromeClient = TcallWebChromeClient(this, permissionLauncher, fileChooserLauncher = fileChooserLauncher)

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString TcallAndroid/${BuildConfig.VERSION_NAME}"
        }

        webView.addJavascriptInterface(
            TcallAndroidBridge(webView, lifecycleScope),
            "TcallAndroidBridge",
        )

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(
                webView,
                TcallAndroidBridge.DOCUMENT_START_SCRIPT,
                setOf("https://*.tcall.uz/*", "https://tcall.uz/*"),
            )
        }

        val allowedHosts = setOf(
            "tcall.uz", "www.tcall.uz", "web.tcall.uz", "api.tcall.uz", "localhost", "127.0.0.1",
        )

        webView.webViewClient = TcallWebViewClient(allowedHosts) {
            // Auth token bo'lsa push ro'yxatdan o'tkazish
            webView.evaluateJavascript(
                """
                (function(){
                  try {
                    var t = localStorage.getItem('tcall:token');
                    if (t && window.TcallAndroidBridge && window.TcallAndroidBridge.registerPush) {
                      window.TcallAndroidBridge.registerPush(t);
                    }
                  } catch(e) {}
                })();
                """.trimIndent(),
                null,
            )
        }
        webView.webChromeClient = chromeClient

        onBackPressedDispatcher.addCallback(this) {
            if (webView.canGoBack()) webView.goBack()
            else finish()
        }

        val url = startUrl ?: resolveStartUrl(intent) ?: "${BuildConfig.WEB_BASE_URL}/dashboard"
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(url)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        resolveStartUrl(intent)?.let { webView.loadUrl(it) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    private fun resolveStartUrl(intent: Intent?): String? {
        intent ?: return null
        val room = intent.getStringExtra(TcallFirebaseMessagingService.EXTRA_ROOM_ID)
        val conv = intent.getStringExtra(TcallFirebaseMessagingService.EXTRA_CONVERSATION_ID)
        if (!room.isNullOrBlank()) {
            return "${BuildConfig.WEB_BASE_URL}/call/${room.trim().uppercase()}"
        }
        if (!conv.isNullOrBlank()) {
            return "${BuildConfig.WEB_BASE_URL}/dashboard?tab=messages"
        }
        val data: Uri? = intent.data
        if (data != null) {
            when {
                data.scheme == "tcall" && data.host == "call" -> {
                    val id = data.path?.trim('/')?.uppercase()
                    if (!id.isNullOrBlank()) return "${BuildConfig.WEB_BASE_URL}/call/$id"
                }
                data.host?.endsWith("tcall.uz") == true -> {
                    val path = data.path.orEmpty()
                    val query = data.query?.let { "?$it" }.orEmpty()
                    if (path.startsWith("/call/") || path == "/dashboard" || path.startsWith("/login")) {
                        return "${BuildConfig.WEB_BASE_URL}$path$query"
                    }
                }
            }
        }
        return null
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}

/** File chooser natijasi */
private object WebChromeClientResult {
    fun parse(resultCode: Int, data: Intent?): Array<Uri>? {
        if (resultCode != android.app.Activity.RESULT_OK) return null
        data ?: return null
        val clip = data.clipData
        if (clip != null && clip.itemCount > 0) {
            return Array(clip.itemCount) { clip.getItemAt(it).uri }
        }
        data.data?.let { return arrayOf(it) }
        return null
    }
}
