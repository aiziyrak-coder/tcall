package uz.tcall.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import uz.tcall.network.UserDto

private val Context.dataStore by preferencesDataStore(name = "tcall_session")

class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("auth_token")
    private val userIdKey = stringPreferencesKey("user_id")
    private val userNameKey = stringPreferencesKey("user_name")
    private val userEmailKey = stringPreferencesKey("user_email")
    private val tcallIdKey = stringPreferencesKey("tcall_id")
    private val languageKey = stringPreferencesKey("language")

    @Volatile
    private var memoryToken: String? = null

    @Volatile
    private var memoryUser: UserDto? = null

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { prefs ->
        !prefs[tokenKey].isNullOrBlank()
    }

    val currentUser: Flow<UserDto?> = context.dataStore.data.map { prefs ->
        userFromPrefs(prefs)
    }

    /** DataStore dan xotiraga yuklash — ilova ochilishida bir marta (IO thread). */
    suspend fun warmUp() {
        val prefs = context.dataStore.data.first()
        memoryToken = prefs[tokenKey]
        memoryUser = userFromPrefs(prefs)
    }

    /** OkHttp interceptor uchun — runBlocking ishlatilmaydi. */
    fun getTokenSync(): String? = memoryToken

    suspend fun cachedUser(): UserDto? {
        memoryUser?.let { return it }
        val user = userFromPrefs(context.dataStore.data.first())
        memoryUser = user
        return user
    }

    suspend fun saveSession(token: String, user: UserDto) {
        memoryToken = token
        memoryUser = user
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[userIdKey] = user.userId
            prefs[userNameKey] = user.name
            prefs[userEmailKey] = user.email
            prefs[tcallIdKey] = user.tcallId
            prefs[languageKey] = user.language
        }
    }

    suspend fun clear() {
        memoryToken = null
        memoryUser = null
        context.dataStore.edit { it.clear() }
    }

    private fun userFromPrefs(prefs: Preferences): UserDto? {
        val token = prefs[tokenKey]
        val userId = prefs[userIdKey]
        if (token.isNullOrBlank() || userId.isNullOrBlank()) return null
        return UserDto(
            userId = userId,
            email = prefs[userEmailKey] ?: "",
            name = prefs[userNameKey] ?: "",
            language = prefs[languageKey] ?: "uz",
            tcallId = prefs[tcallIdKey] ?: "",
        )
    }
}
