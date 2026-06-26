package uz.vizara.tcall.network

import com.google.gson.annotations.SerializedName

data class UserDto(
    @SerializedName("userId") val userId: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("language") val language: String,
    @SerializedName("tcallId") val tcallId: String,
    @SerializedName("translationMode") val translationMode: String? = "text",
)

data class LoginRequest(
    val email: String,
    val password: String,
    val remember: Boolean = true,
)

data class LoginResponse(
    val user: UserDto?,
    val token: String? = null,
    val error: String? = null,
)

data class SessionResponse(
    val user: UserDto?,
)
