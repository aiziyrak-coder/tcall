package uz.tcall.session

import android.content.Context

/** Ishonchli sessiya saqlash — EncryptedSharedPreferences ba'zi qurilmalarda xato beradi. */
class SessionStore(context: Context) {
    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun hasSession(): Boolean = !getToken().isNullOrBlank() && !getUserJson().isNullOrBlank()

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)?.takeIf { it.isNotBlank() }

    fun getUserJson(): String? = prefs.getString(KEY_USER, null)?.takeIf { it.isNotBlank() }

    fun save(token: String, userJson: String) {
        prefs.edit()
            .putString(KEY_TOKEN, token.trim())
            .putString(KEY_USER, userJson.trim())
            .commit()
    }

    fun clear() {
        prefs.edit().clear().commit()
    }

    companion object {
        private const val PREFS = "tcall_web_session"
        private const val KEY_TOKEN = "token"
        private const val KEY_USER = "user"
    }
}
