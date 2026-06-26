package uz.tcall.network

import com.google.gson.annotations.SerializedName

// ——— Social / Contacts ———

data class ContactDto(
    val id: String,
    val name: String,
    val tcallId: String,
    val favorite: Boolean? = false,
)

data class ContactsResponse(
    val contacts: List<ContactDto>? = null,
    val error: String? = null,
)

data class BlockDto(
    @SerializedName("blockedTcallId") val blockedTcallId: String,
    val name: String? = null,
)

data class BlockRequest(
    @SerializedName("tcallId") val tcallId: String,
)

data class BlocksResponse(
    val blocks: List<BlockDto>? = null,
)

data class FriendRequestSenderDto(
    val id: String,
    val name: String,
    val tcallId: String,
    val language: String? = null,
)

data class IncomingFriendRequestDto(
    val id: String,
    val sender: FriendRequestSenderDto,
)

data class FriendRequestsResponse(
    val incoming: List<IncomingFriendRequestDto>? = null,
)

data class FriendRequestActionRequest(
    @SerializedName("senderTcallId") val senderTcallId: String,
    val accept: Boolean,
)

data class SendFriendRequestRequest(
    val tcallId: String,
    val name: String,
)

data class LookupUserDto(
    val id: String,
    val name: String,
    val tcallId: String,
    val language: String? = null,
    val bio: String? = null,
    val online: Boolean? = false,
    @SerializedName("isFriend") val isFriend: Boolean? = false,
    @SerializedName("blockedByYou") val blockedByYou: Boolean? = false,
    @SerializedName("blockedYou") val blockedYou: Boolean? = false,
    @SerializedName("friendRequestSent") val friendRequestSent: Boolean? = false,
    @SerializedName("friendRequestReceived") val friendRequestReceived: Boolean? = false,
)

data class LookupResponse(
    val found: Boolean? = false,
    val user: LookupUserDto? = null,
    val error: String? = null,
)

// ——— User settings ———

data class UserSettingsDto(
    val id: String,
    val email: String,
    val name: String,
    val language: String,
    @SerializedName("translationMode") val translationMode: String? = "text",
    val status: String? = "available",
    val bio: String? = null,
    val about: String? = null,
    @SerializedName("tcallId") val tcallId: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    val telegramUsername: String? = null,
)

data class UserSettingsResponse(
    val user: UserSettingsDto?,
    val error: String? = null,
)

data class UpdateSettingsRequest(
    val name: String? = null,
    val language: String? = null,
    @SerializedName("translationMode") val translationMode: String? = null,
    val status: String? = null,
    val bio: String? = null,
    val about: String? = null,
    val telegramUsername: String? = null,
)

data class ChangePasswordRequest(
    @SerializedName("currentPassword") val currentPassword: String,
    @SerializedName("newPassword") val newPassword: String,
)

// ——— Room / calls list ———

data class CreateRoomResponse(
    @SerializedName("roomId") val roomId: String?,
    @SerializedName("callId") val callId: String? = null,
    val error: String? = null,
)

data class RoomStatusParticipantDto(
    @SerializedName("userId") val userId: String,
    val name: String,
    @SerializedName("tcallId") val tcallId: String?,
    val language: String? = null,
    @SerializedName("isHost") val isHost: Boolean? = false,
)

data class RoomStatusResponse(
    val participants: List<RoomStatusParticipantDto>? = null,
    val error: String? = null,
)

data class CallHistoryHostDto(
    val name: String,
    val language: String? = null,
    @SerializedName("tcallId") val tcallId: String?,
)

data class CallHistoryParticipantDto(
    val user: CallHistoryHostDto,
)

data class CallHistoryDto(
    val id: String,
    @SerializedName("roomId") val roomId: String,
    val status: String,
    @SerializedName("durationSec") val durationSec: Int? = null,
    @SerializedName("calleeTcallId") val calleeTcallId: String? = null,
    @SerializedName("createdAt") val createdAt: String,
    val host: CallHistoryHostDto,
    val participants: List<CallHistoryParticipantDto>? = null,
)

data class CallHistoryResponse(
    val calls: List<CallHistoryDto>? = null,
)

// ——— Vanity numbers ———

data class VanityNumberDto(
    val id: String,
    val number: String,
    val price: Int,
    val tier: String,
)

data class VanityOwnedDto(
    val number: String,
    val tier: String? = null,
)

data class VanityPendingDto(
    val number: String,
    val tier: String? = null,
    val status: String? = null,
)

data class VanityNumbersResponse(
    val numbers: List<VanityNumberDto>? = null,
    val total: Int? = 0,
    val page: Int? = 1,
    val pages: Int? = 1,
    @SerializedName("tierCounts") val tierCounts: Map<String, Int>? = null,
    val owned: VanityOwnedDto? = null,
    @SerializedName("pendingRequest") val pendingRequest: VanityPendingDto? = null,
)

data class VanityCheckResponse(
    val available: Boolean? = false,
    val tier: String? = null,
    val price: Int? = null,
    val taken: Boolean? = false,
    val error: String? = null,
)

data class VanityRequestBody(
    val number: String,
)

// ——— Support ———

data class SupportMessageDto(
    val id: String,
    val sender: String,
    val text: String,
    @SerializedName("createdAt") val createdAt: String,
)

data class SupportMessagesResponse(
    val messages: List<SupportMessageDto>? = null,
)

data class SendSupportRequest(
    val text: String,
)

data class SendSupportResponse(
    val ok: Boolean? = null,
    val message: SupportMessageDto? = null,
    val error: String? = null,
)
