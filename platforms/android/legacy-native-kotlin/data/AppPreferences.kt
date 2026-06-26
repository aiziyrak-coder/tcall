package uz.tcall.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.prefsStore by preferencesDataStore(name = "tcall_prefs")

class AppPreferences(private val context: Context) {
    private val onboardingKey = booleanPreferencesKey("onboarding_v2")
    private val rememberedEmailKey = stringPreferencesKey("remembered_email")

    @Volatile
    private var onboardingCached: Boolean? = null

    val onboardingComplete: Flow<Boolean> = context.prefsStore.data.map { prefs ->
        prefs[onboardingKey] == true
    }

    val rememberedEmail: Flow<String?> = context.prefsStore.data.map { prefs ->
        prefs[rememberedEmailKey]
    }

    suspend fun warmUp() {
        onboardingCached = context.prefsStore.data.first()[onboardingKey] == true
    }

    suspend fun isOnboardingComplete(): Boolean {
        onboardingCached?.let { return it }
        return onboardingComplete.first().also { onboardingCached = it }
    }

    suspend fun completeOnboarding() {
        onboardingCached = true
        context.prefsStore.edit { it[onboardingKey] = true }
    }

    suspend fun saveRememberedEmail(email: String?) {
        context.prefsStore.edit { prefs ->
            if (email.isNullOrBlank()) {
                prefs.remove(rememberedEmailKey)
            } else {
                prefs[rememberedEmailKey] = email
            }
        }
    }
}
