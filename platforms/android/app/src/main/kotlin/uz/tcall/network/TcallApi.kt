package uz.tcall.network

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface TcallApi {
    // Auth
    @POST("/api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @GET("/api/auth/session")
    suspend fun session(): Response<SessionResponse>

    @DELETE("/api/auth/session")
    suspend fun logout(): Response<Map<String, Boolean>>

    // Chat
    @GET("/api/chat/conversations")
    suspend fun conversations(): Response<ConversationsResponse>

    @POST("/api/chat/conversations")
    suspend fun createDirectChat(@Body body: CreateDirectChatRequest): Response<CreateChatResponse>

    @GET("/api/chat/conversations/{id}")
    suspend fun messages(
        @Path("id") conversationId: String,
        @Query("cursor") cursor: String? = null,
    ): Response<MessagesResponse>

    @POST("/api/chat/conversations/{id}/messages")
    suspend fun sendMessage(
        @Path("id") conversationId: String,
        @Body body: SendMessageRequest,
    ): Response<SendMessageResponse>

    @PATCH("/api/chat/conversations/{id}")
    suspend fun markRead(@Path("id") conversationId: String): Response<OkResponse>

    // Calls
    @POST("/api/calls/dial")
    suspend fun dial(@Body body: DialRequest): Response<DialResponse>

    @POST("/api/calls/join")
    suspend fun joinCall(@Body body: JoinCallRequest): Response<JoinCallResponse>

    @POST("/api/calls/end")
    suspend fun endCall(@Body body: EndCallRequest): Response<OkResponse>

    // Interpreter
    @Multipart
    @POST("/api/interpreter/process")
    suspend fun interpreterProcess(
        @Part audio: MultipartBody.Part,
        @Part("sourceLang") sourceLang: RequestBody,
        @Part("targetLang") targetLang: RequestBody,
        @Part("withSpeech") withSpeech: RequestBody,
        @Part("recordMs") recordMs: RequestBody,
    ): Response<InterpreterResponse>

    // Push
    @POST("/api/user/device-token")
    suspend fun registerDeviceToken(@Body body: DeviceTokenRequest): Response<OkResponse>
}
