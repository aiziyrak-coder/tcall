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
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface TcallApi {
    // Auth
    @POST("/api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @POST("/api/auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<LoginResponse>

    @POST("/api/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): Response<ForgotPasswordResponse>

    @GET("/api/auth/session")
    suspend fun session(): Response<SessionResponse>

    @DELETE("/api/auth/session")
    suspend fun logout(): Response<Map<String, Boolean>>

    // Chat
    @GET("/api/chat/conversations")
    suspend fun conversations(): Response<ConversationsResponse>

    @POST("/api/chat/conversations")
    suspend fun createDirectChat(@Body body: CreateDirectChatRequest): Response<CreateChatResponse>

    @POST("/api/chat/conversations")
    suspend fun createGroupChat(@Body body: CreateGroupChatRequest): Response<CreateChatResponse>

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

    @PATCH("/api/chat/conversations/{id}/messages/{messageId}")
    suspend fun editMessage(
        @Path("id") conversationId: String,
        @Path("messageId") messageId: String,
        @Body body: EditMessageRequest,
    ): Response<SendMessageResponse>

    @DELETE("/api/chat/conversations/{id}/messages/{messageId}")
    suspend fun deleteMessage(
        @Path("id") conversationId: String,
        @Path("messageId") messageId: String,
    ): Response<OkResponse>

    @Multipart
    @POST("/api/chat/upload")
    suspend fun uploadChatFile(@Part file: MultipartBody.Part): Response<ChatUploadResponse>

    @DELETE("/api/chat/conversations/{id}")
    suspend fun deleteConversation(@Path("id") conversationId: String): Response<OkResponse>

    @PATCH("/api/chat/pin")
    suspend fun pinConversation(@Body body: PinConversationRequest): Response<OkResponse>

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

    // Contacts & friends
    @GET("/api/contacts")
    suspend fun contacts(): Response<ContactsResponse>

    @DELETE("/api/contacts/{id}")
    suspend fun deleteContact(@Path("id") id: String): Response<OkResponse>

    @GET("/api/blocks")
    suspend fun blocks(): Response<BlocksResponse>

    @POST("/api/blocks")
    suspend fun blockUser(@Body body: BlockRequest): Response<OkResponse>

    @DELETE("/api/blocks")
    suspend fun unblockUser(@Query("tcallId") tcallId: String): Response<OkResponse>

    @GET("/api/friend-requests")
    suspend fun friendRequests(): Response<FriendRequestsResponse>

    @PATCH("/api/friend-requests")
    suspend fun respondFriendRequest(@Body body: FriendRequestActionRequest): Response<OkResponse>

    @POST("/api/friend-requests")
    suspend fun sendFriendRequest(@Body body: SendFriendRequestRequest): Response<OkResponse>

    @GET("/api/users/lookup")
    suspend fun lookupUser(@Query("tcallId") tcallId: String): Response<LookupResponse>

    // User settings
    @GET("/api/user/settings")
    suspend fun userSettings(): Response<UserSettingsResponse>

    @PATCH("/api/user/settings")
    suspend fun updateSettings(@Body body: UpdateSettingsRequest): Response<UserSettingsResponse>

    @PATCH("/api/user/password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): Response<OkResponse>

    @Multipart
    @POST("/api/user/avatar")
    suspend fun uploadAvatar(@Part file: MultipartBody.Part): Response<AvatarUploadResponse>

    @DELETE("/api/user/avatar")
    suspend fun deleteAvatar(): Response<OkResponse>

    @GET("/api/user/telegram")
    suspend fun telegramStatus(): Response<TelegramStatusResponse>

    @POST("/api/user/telegram")
    suspend fun linkTelegram(): Response<TelegramLinkResponse>

    @DELETE("/api/user/telegram")
    suspend fun unlinkTelegram(): Response<OkResponse>

    // Rooms & history
    @POST("/api/calls")
    suspend fun createRoom(): Response<CreateRoomResponse>

    @GET("/api/calls/room")
    suspend fun roomStatus(@Query("roomId") roomId: String): Response<RoomStatusResponse>

    @GET("/api/calls")
    suspend fun callHistory(): Response<CallHistoryResponse>

    // Vanity numbers
    @GET("/api/numbers")
    suspend fun vanityNumbers(
        @Query("tier") tier: String? = null,
        @Query("q") q: String? = null,
        @Query("page") page: Int? = null,
    ): Response<VanityNumbersResponse>

    @POST("/api/numbers/check")
    suspend fun checkVanityNumber(@Body body: VanityRequestBody): Response<VanityCheckResponse>

    @POST("/api/numbers/request")
    suspend fun requestVanityNumber(@Body body: VanityRequestBody): Response<OkResponse>

    // Support
    @GET("/api/support")
    suspend fun supportMessages(): Response<SupportMessagesResponse>

    @POST("/api/support")
    suspend fun sendSupportMessage(@Body body: SendSupportRequest): Response<SendSupportResponse>

    // Subscription
    @GET("/api/subscription")
    suspend fun subscription(): Response<SubscriptionResponse>

    @POST("/api/subscription")
    suspend fun purchaseSubscription(@Body body: PurchaseSubscriptionRequest): Response<SubscriptionResponse>

    // PIN
    @GET("/api/security/pin")
    suspend fun pinStatus(): Response<PinStatusResponse>

    @POST("/api/security/pin")
    suspend fun setPin(@Body body: PinBodyRequest): Response<OkResponse>

    @PUT("/api/security/pin")
    suspend fun changePin(@Body body: PinChangeRequest): Response<OkResponse>

    @POST("/api/security/pin/verify")
    suspend fun verifyPin(@Body body: PinVerifyRequest): Response<OkResponse>

    @DELETE("/api/security/pin")
    suspend fun disablePin(@Body body: PinVerifyRequest): Response<OkResponse>

    // Referral & account
    @GET("/api/user/referral")
    suspend fun referral(): Response<ReferralResponse>

    @POST("/api/user/delete-account")
    suspend fun deleteAccount(@Body body: DeleteAccountRequest): Response<OkResponse>

    @GET("/api/ui/locale")
    suspend fun uiLocale(@Query("lang") lang: String): Response<UiLocaleResponse>
}
