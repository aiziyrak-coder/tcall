package uz.tcall.web

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import uz.tcall.BuildConfig
import uz.tcall.session.TcallSessionStore

/**
 * web.tcall.uz ↔ Android ko'prik.
 * Sessiya, push, tashqi havolalar — Play Market WebView standarti.
 */
class TcallAndroidBridge(
    private val webView: WebView,
    private val scope: CoroutineScope,
    private val sessionStore: TcallSessionStore,
    private val onRequestNotifications: () -> Unit,
) {
    private val http = OkHttpClient()

    @JavascriptInterface
    fun getStoredToken(): String = sessionStore.getToken().orEmpty()

    @JavascriptInterface
    fun getStoredUser(): String = sessionStore.getUserJson().orEmpty()

    @JavascriptInterface
    fun saveSession(token: String?, userJson: String?) {
        if (token.isNullOrBlank() || userJson.isNullOrBlank()) return
        sessionStore.save(token.trim(), userJson.trim())
        CookieManager.getInstance().flush()
    }

    @JavascriptInterface
    fun clearSession() {
        sessionStore.clear()
        CookieManager.getInstance().flush()
    }

    @JavascriptInterface
    fun syncCookies() {
        CookieManager.getInstance().flush()
    }

    @JavascriptInterface
    fun getAppVersion(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun openExternal(url: String?) {
        if (url.isNullOrBlank()) return
        val uri = runCatching { Uri.parse(url.trim()) }.getOrNull() ?: return
        webView.post {
            runCatching {
                CustomTabsIntent.Builder()
                    .setShowTitle(true)
                    .build()
                    .launchUrl(webView.context, uri)
            }.onFailure {
                webView.context.startActivity(
                    Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            }
        }
    }

    @JavascriptInterface
    fun requestNotifications() {
        webView.post { onRequestNotifications() }
    }

    @JavascriptInterface
    fun registerPush(authToken: String?) {
        if (authToken.isNullOrBlank()) return
        scope.launch(Dispatchers.IO) {
            runCatching {
                if (Build.VERSION.SDK_INT >= 33) {
                    val granted = ContextCompat.checkSelfPermission(
                        webView.context,
                        Manifest.permission.POST_NOTIFICATIONS,
                    ) == PackageManager.PERMISSION_GRANTED
                    if (!granted) {
                        webView.post { onRequestNotifications() }
                        return@launch
                    }
                }
                val fcm = FirebaseMessaging.getInstance().token.await()
                val json = """{"token":"$fcm","platform":"android"}"""
                val req = Request.Builder()
                    .url("${BuildConfig.API_BASE_URL}/api/user/device-token")
                    .post(json.toRequestBody("application/json".toMediaType()))
                    .header("Authorization", "Bearer $authToken")
                    .header("X-Tcall-Native", "1")
                    .build()
                http.newCall(req).execute().use { res ->
                    if (!res.isSuccessful) throw Exception("HTTP ${res.code}")
                }
                Log.i(TAG, "FCM token registered")
            }.onFailure { Log.w(TAG, "registerPush: ${it.message}") }
        }
    }

    @JavascriptInterface
    fun log(message: String?) {
        if (!message.isNullOrBlank()) Log.d(TAG, message)
    }

    companion object {
        private const val TAG = "TcallBridge"

        val DOCUMENT_START_SCRIPT: String = """
            (function(){
              try {
                window.Capacitor = window.Capacitor || {
                  isNativePlatform: function(){ return true; },
                  getPlatform: function(){ return 'android'; },
                  isPluginAvailable: function(){ return false; }
                };
                window.TcallNative = {
                  isAndroid: true,
                  platform: 'android',
                  version: '${BuildConfig.VERSION_NAME}'
                };
                document.documentElement.classList.add('web-app','native-app','native-android');
                if (document.body) document.body.classList.add('web-app','native-app','native-android');
                if (window.TcallAndroidBridge) {
                  var t = TcallAndroidBridge.getStoredToken();
                  var u = TcallAndroidBridge.getStoredUser();
                  if (t) localStorage.setItem('tcall:token', t);
                  if (u) localStorage.setItem('tcall:user', u);
                }
              } catch(e) {}
            })();
        """.trimIndent()
    }
}
