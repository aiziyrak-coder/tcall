package uz.vizara.tcall.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST

interface TcallApi {
    @POST("/api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @GET("/api/auth/session")
    suspend fun session(): Response<SessionResponse>

    @DELETE("/api/auth/session")
    suspend fun logout(): Response<Map<String, Boolean>>
}
