package uz.tcall

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Button
import android.widget.ProgressBar
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.lifecycle.lifecycleScope
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import uz.tcall.bridge.WebAppBridge
import uz.tcall.push.TcallMessagingService
import uz.tcall.session.SessionStore
import uz.tcall.web.AppWebChromeClient
import uz.tcall.web.AppWebViewClient

/**
 * Tcall — professional WebView ilova (Play Market).
 * web.tcall.uz ni to'liq yuklaydi; native sessiya, push, WebRTC.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var swipe: SwipeRefreshLayout
    private lateinit var progress: ProgressBar
    private lateinit var errorPanel: View
    private lateinit var session: SessionStore
    private lateinit var bridge: WebAppBridge
    private lateinit var chrome: AppWebChromeClient

    private var pendingUrl: String? = null
    private var exitAt = 0L

    private val allowedHosts = setOf(
        "tcall.uz", "www.tcall.uz", "web.tcall.uz", "api.tcall.uz", "localhost", "127.0.0.1",
    )

    private val mediaPerms = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { chrome.onPermissionResults(it) }

    private val notifyPerm = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { if (it) pushFromPage() }

    private val filePicker = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { chrome.onFileResult(parseFiles(it.resultCode, it.data)) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)

        session = SessionStore(this)
        webView = findViewById(R.id.webview)
        swipe = findViewById(R.id.swipe)
        progress = findViewById(R.id.progress)
        errorPanel = findViewById(R.id.error_panel)
        findViewById<Button>(R.id.retry).setOnClickListener { reloadMain() }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.updatePadding(top = bars.top, bottom = bars.bottom)
            insets
        }

        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)

        setupWebView()
        setupBridge()
        setupClients()

        swipe.setColorSchemeResources(R.color.tcall_accent)
        swipe.setOnRefreshListener {
            webView.reload()
            swipe.isRefreshing = false
        }

        onBackPressedDispatcher.addCallback(this) {
            if (webView.canGoBack()) {
                webView.goBack()
                return@addCallback
            }
            val now = System.currentTimeMillis()
            if (now - exitAt < 2000) finish()
            else {
                exitAt = now
                android.widget.Toast.makeText(
                    this@MainActivity,
                    getString(R.string.press_back_again),
                    android.widget.Toast.LENGTH_SHORT,
                ).show()
            }
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
            errorPanel.isVisible = false
        } else {
            openUrl(resolveDeepLink(intent) ?: homeUrl())
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val cm = CookieManager.getInstance()
        cm.setAcceptCookie(true)
        cm.setAcceptThirdPartyCookies(webView, true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            userAgentString = ua(webView.settings.userAgentString)
        }
    }

    private fun ua(base: String): String {
        val tag = " TcallAndroid/"
        return if (base.contains(tag)) base else "$base TcallAndroid/${BuildConfig.VERSION_NAME}"
    }

    private fun setupBridge() {
        bridge = WebAppBridge(
            context = this,
            webView = webView,
            scope = lifecycleScope,
            session = session,
            onRequestNotifications = { requestNotifications() },
        )
        webView.addJavascriptInterface(bridge, "TcallAndroidBridge")

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(
                webView,
                WebAppBridge.documentStartScript(),
                setOf("https://*.tcall.uz/*", "https://tcall.uz/*"),
            )
        }
    }

    private fun setupClients() {
        chrome = AppWebChromeClient(
            activity = this,
            permissionLauncher = mediaPerms,
            fileChooserLauncher = filePicker,
            onProgress = { p ->
                progress.isVisible = p in 1..99
                progress.progress = p
            },
        )
        webView.webChromeClient = chrome
        webView.webViewClient = AppWebViewClient(
            allowedHosts = allowedHosts,
            onReady = {
                errorPanel.isVisible = false
                pushFromPage()
            },
            onMainError = { showError() },
            openExternal = { uri ->
                runCatching {
                    CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(this, uri)
                }
            },
        )
    }

    private fun homeUrl(): String {
        val path = if (session.hasSession()) "/dashboard" else "/login"
        return "${BuildConfig.WEB_URL}$path"
    }

    private fun openUrl(url: String) {
        pendingUrl = url
        errorPanel.isVisible = false
        webView.loadUrl(url)
    }

    private fun reloadMain() {
        errorPanel.isVisible = false
        openUrl(pendingUrl ?: homeUrl())
    }

    private fun showError() {
        errorPanel.isVisible = true
    }

    private fun requestNotifications() {
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            notifyPerm.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun pushFromPage() {
        webView.evaluateJavascript(
            """
            (function(){
              try {
                var t = localStorage.getItem('tcall:token');
                if (t && window.TcallAndroidBridge) TcallAndroidBridge.registerPush(t);
              } catch(e) {}
            })();
            """.trimIndent(),
            null,
        )
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        resolveDeepLink(intent)?.let { openUrl(it) }
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        webView.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private fun resolveDeepLink(intent: Intent?): String? {
        intent ?: return null
        intent.getStringExtra(TcallMessagingService.EXTRA_ROOM)?.let { room ->
            return "${BuildConfig.WEB_URL}/call/${room.trim().uppercase()}"
        }
        intent.getStringExtra(TcallMessagingService.EXTRA_CHAT)?.let {
            return "${BuildConfig.WEB_URL}/dashboard?tab=messages"
        }
        val data = intent.data ?: return null
        if (data.scheme == "tcall" && data.host == "call") {
            val id = data.path?.trim('/')?.uppercase()
            if (!id.isNullOrBlank()) return "${BuildConfig.WEB_URL}/call/$id"
        }
        if (data.host?.endsWith("tcall.uz") == true) {
            val path = data.path.orEmpty()
            val q = data.query?.let { "?$it" }.orEmpty()
            if (path.startsWith("/call/") || path == "/dashboard" ||
                path.startsWith("/login") || path.startsWith("/register")
            ) {
                return "${BuildConfig.WEB_URL}$path$q"
            }
        }
        return null
    }

    private fun parseFiles(code: Int, data: Intent?): Array<Uri>? {
        if (code != RESULT_OK || data == null) return null
        data.clipData?.let { clip ->
            if (clip.itemCount > 0) return Array(clip.itemCount) { clip.getItemAt(it).uri }
        }
        data.data?.let { return arrayOf(it) }
        return null
    }
}
