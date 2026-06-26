package uz.tcall.network

import com.google.gson.Gson
import com.google.gson.JsonObject
import retrofit2.Response

object ApiErrorParser {
    private val gson = Gson()

    fun fromResponse(response: Response<*>, fallback: String): String {
        return try {
            val raw = response.errorBody()?.string().orEmpty()
            if (raw.isBlank()) return fallback
            val json = gson.fromJson(raw, JsonObject::class.java)
            json.get("error")?.asString?.takeIf { it.isNotBlank() } ?: raw.take(200)
        } catch (_: Exception) {
            fallback
        }
    }
}
