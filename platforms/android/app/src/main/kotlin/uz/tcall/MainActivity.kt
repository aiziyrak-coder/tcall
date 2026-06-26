package uz.tcall

import android.app.Activity
import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Button
import android.widget.ProgressBar
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.lifecycle.lifecycleScope
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import uz.tcall.push.TcallFirebaseMessagingService
import uz.tcall.session.TcallSessionStore
import uz.tcall.web.TcallAndroidBridge
import uz.tcall.web.TcallWebChromeClient
import uz.tcall.web.TcallWebViewClient

/**
 * Tcall Android — Play Market uchun professional WebView ilova.
 * web.tcall.uz ni to'liq yuklaydi; sessiya native xotirada saqlanadi.
 */
class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var offlinePanel: View
    private lateinit var chromeClient: TcallWebChromeClient
    private lateinit var sessionStore: TcallSessionStore
    private lateinit var bridge: TcallAndroidBridge

    private var lastUrl: String? = null
    private var backPressedAt = 0L

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants -> chromeClient.onPermissionsResult(grants) }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) registerPushFromWeb()
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val uris = FileChooserResult.parse(result.resultCode, result.data)
        chromeClient.onFileChooserResult(uris)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)

        sessionStore = TcallSessionStore(this)
        webView = findViewById(R.id.webview)
        progressBar = findViewById(R.id.progress)
        offlinePanel = findViewById(R.id.offline_panel)
        findViewById<Button>(R.id.retry_button).setOnClickListener { retryLoad() }

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.updatePadding(top = bars.top, bottom = bars.bottom)
            insets
        }

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        configureCookies()
        configureWebView()
        configureClients()

        onBackPressedDispatcher.addCallback(this) {
            if (webView.canGoBack()) {
                webView.goBack()
                return@addCallback
            }
            val now = System.currentTimeMillis()
            if (now - backPressedAt < 2000) finish()
            else {
                backPressedAt = now
                android.widget.Toast.makeText(
                    this@MainActivity,
                    "Chiqish uchun yana bosing",
                    android.widget.Toast.LENGTH_SHORT,
                ).show()
            }
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
            offlinePanel.isVisible = false
        } else {
            loadInitialUrl(intent)
        }
    }

    private fun configureCookies() {
        val cm = CookieManager.getInstance()
        cm.setAcceptCookie(true)
        cm.setAcceptThirdPartyCookies(webView, true)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
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
            setSupportMultipleWindows(false)
            userAgentString = buildUserAgent(userAgentString)
        }
    }

    private fun buildUserAgent(base: String): String {
        val marker = " TcallAndroid/"
        return if (base.contains(marker)) base else "$base TcallAndroid/${BuildConfig.VERSION_NAME}"
    }

    private fun configureClients() {
        bridge = TcallAndroidBridge(
            webView = webView,
            scope = lifecycleScope,
            sessionStore = sessionStore,
            onRequestNotifications = { requestNotificationPermission() },
        )
        webView.addJavascriptInterface(bridge, "TcallAndroidBridge")

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

        chromeClient = TcallWebChromeClient(
            activity = this,
            permissionLauncher = permissionLauncher,
            fileChooserLauncher = fileChooserLauncher,
            onProgress = { p ->
                progressBar.isVisible = p in 1..99
                progressBar.progress = p
                if (p >= 100) progressBar.isVisible = false
            },
        )

        webView.webViewClient = TcallWebViewClient(
            allowedHosts = allowedHosts,
            onPageLoaded = {
                offlinePanel.isVisible = false
                registerPushFromWeb()
            },
            onPageError = { showOffline() },
        )
        webView.webChromeClient = chromeClient
    }

    private fun loadInitialUrl(intent: Intent?) {
        val deepLink = resolveDeepLink(intent)
        val url = deepLink ?: defaultStartUrl()
        lastUrl = url
        webView.loadUrl(url)
    }

    private fun defaultStartUrl(): String {
        val path = if (sessionStore.hasSession()) "/dashboard" else "/login"
        return "${BuildConfig.WEB_BASE_URL}$path"
    }

    private fun retryLoad() {
        offlinePanel.isVisible = false
        val url = lastUrl ?: defaultStartUrl()
        webView.loadUrl(url)
    }

    private fun showOffline() {
        offlinePanel.isVisible = true
        webView.loadUrl("file:///android_asset/offline.html")
    }

    private fun requestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun registerPushFromWeb() {
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

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        resolveDeepLink(intent)?.let { url ->
            lastUrl = url
            offlinePanel.isVisible = false
            webView.loadUrl(url)
        }
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        super.onPause()
        webView.onPause()
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
        val room = intent.getStringExtra(TcallFirebaseMessagingService.EXTRA_ROOM_ID)
        val conv = intent.getStringExtra(TcallFirebaseMessagingService.EXTRA_CONVERSATION_ID)
        if (!room.isNullOrBlank()) {
            return "${BuildConfig.WEB_BASE_URL}/call/${room.trim().uppercase()}"
        }
        if (!conv.isNullOrBlank()) {
            return "${BuildConfig.WEB_BASE_URL}/dashboard?tab=messages"
        }
        val data = intent.data ?: return null
        return when {
            data.scheme == "tcall" && data.host == "call" -> {
                val id = data.path?.trim('/')?.uppercase()
                if (!id.isNullOrBlank()) "${BuildConfig.WEB_BASE_URL}/call/$id" else null
            }
            data.host?.endsWith("tcall.uz") == true -> {
                val path = data.path.orEmpty()
                val query = data.query?.let { "?$it" }.orEmpty()
                when {
                    path.startsWith("/call/") -> "${BuildConfig.WEB_BASE_URL}$path$query"
                    path == "/dashboard" || path.startsWith("/login") || path.startsWith("/register") ->
                        "${BuildConfig.WEB_BASE_URL}$path$query"
                    else -> null
                }
            }
            else -> null
        }
    }
}

private object FileChooserResult {
    fun parse(resultCode: Int, data: Intent?): Array<Uri>? {
        if (resultCode != Activity.RESULT_OK) return null
        data ?: return null
        val clip = data.clipData
        if (clip != null && clip.itemCount > 0) {
            return Array(clip.itemCount) { clip.getItemAt(it).uri }
        }
        data.data?.let { return arrayOf(it) }
        return null
    }
}
