package uz.tcall.bridge

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
import org.json.JSONObject
import uz.tcall.BuildConfig
import uz.tcall.session.SessionStore

/**
 * JavaScript ↔ Native ko'prik.
 * Web ilova (web.tcall.uz) bilan to'liq integratsiya.
 */
class WebAppBridge(
    private val context: Context,
    private val webView: WebView,
    private val scope: CoroutineScope,
    private val session: SessionStore,
    private val onRequestNotifications: () -> Unit,
) {
    private val http = OkHttpClient.Builder().build()

    @JavascriptInterface
    fun getStoredToken(): String = runCatching { session.getToken().orEmpty() }.getOrDefault("")

    @JavascriptInterface
    fun getStoredUser(): String = runCatching { session.getUserJson().orEmpty() }.getOrDefault("")

    @JavascriptInterface
    fun saveSession(token: String?, userJson: String?) {
        runCatching {
            if (token.isNullOrBlank() || userJson.isNullOrBlank()) return
            session.save(token, userJson)
            CookieManager.getInstance().flush()
            webView.post {
                webView.evaluateJavascript(
                    """
                    (function(){
                      try {
                        localStorage.setItem('tcall:token', ${JSONObject.quote(token.trim())});
                        localStorage.setItem('tcall:user', ${JSONObject.quote(userJson.trim())});
                      } catch(e) {}
                    })();
                    """.trimIndent(),
                    null,
                )
            }
        }.onFailure { Log.w(TAG, "saveSession: ${it.message}") }
    }

    @JavascriptInterface
    fun clearSession() {
        runCatching {
            session.clear()
            CookieManager.getInstance().flush()
        }.onFailure { Log.w(TAG, "clearSession: ${it.message}") }
    }

    @JavascriptInterface
    fun syncCookies() {
        runCatching { CookieManager.getInstance().flush() }
    }

    @JavascriptInterface
    fun getAppVersion(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun openExternal(url: String?) {
        if (url.isNullOrBlank()) return
        val uri = runCatching { Uri.parse(url.trim()) }.getOrNull() ?: return
        webView.post {
            runCatching {
                CustomTabsIntent.Builder().setShowTitle(true).build()
                    .launchUrl(context, uri)
            }.onFailure {
                context.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
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
                    val ok = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.POST_NOTIFICATIONS,
                    ) == PackageManager.PERMISSION_GRANTED
                    if (!ok) {
                        webView.post { onRequestNotifications() }
                        return@launch
                    }
                }
                val fcm = FirebaseMessaging.getInstance().token.await()
                val body = JSONObject().apply {
                    put("token", fcm)
                    put("platform", "android")
                }.toString()
                val req = Request.Builder()
                    .url("${BuildConfig.API_URL}/api/user/device-token")
                    .post(body.toRequestBody("application/json".toMediaType()))
                    .header("Authorization", "Bearer $authToken")
                    .header("X-Tcall-Native", "1")
                    .build()
                http.newCall(req).execute().use { res ->
                    if (!res.isSuccessful) error("HTTP ${res.code}")
                }
            }.onFailure { Log.w(TAG, "registerPush: ${it.message}") }
        }
    }

    @JavascriptInterface
    fun log(message: String?) {
        if (!message.isNullOrBlank()) Log.d(TAG, message)
    }

    companion object {
        private const val TAG = "TcallBridge"

        fun documentStartScript(): String = """
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
                var root = document.documentElement;
                root.classList.add('web-app','native-app','native-android');
                if (document.body) document.body.classList.add('web-app','native-app','native-android');
                var b = window.TcallAndroidBridge;
                if (b) {
                  var t = b.getStoredToken();
                  var u = b.getStoredUser();
                  if (t) localStorage.setItem('tcall:token', t);
                  if (u) localStorage.setItem('tcall:user', u);
                }
              } catch(e) {}
            })();
        """.trimIndent()
    }
}
