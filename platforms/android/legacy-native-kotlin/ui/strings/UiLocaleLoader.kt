package uz.tcall.ui.strings

import uz.tcall.network.TcallApi
import java.util.concurrent.ConcurrentHashMap

object UiLocaleLoader {
    private val cache = ConcurrentHashMap<String, TcallUiStrings>()

    suspend fun load(api: TcallApi, language: String): TcallUiStrings {
        val code = language.substringBefore('-').lowercase()
        cache[code]?.let { return it }

        val base = uiStrings(code)
        if (code in STATIC) {
            cache[code] = base
            return base
        }

        val merged = try {
            val resp = api.uiLocale(code)
            if (resp.isSuccessful) {
                val remote = resp.body()?.ui
                if (remote != null) base.mergeFromRemote(remote) else base
            } else base
        } catch (_: Exception) {
            base
        }
        cache[code] = merged
        return merged
    }

    fun clear() = cache.clear()

    private val STATIC = setOf("uz", "ru", "en")
}

fun TcallUiStrings.mergeFromRemote(m: Map<String, String>): TcallUiStrings = copy(
    messages = m["messages"] ?: messages,
    friends = m["friendsTab"] ?: m["friends"] ?: friends,
    keypad = m["keypad"] ?: keypad,
    room = m["roomTab"] ?: room,
    interpreter = m["interpreterTab"] ?: interpreter,
    yourNumber = m["yourNumber"] ?: yourNumber,
    newChat = m["newChat"] ?: newChat,
    newGroup = m["newGroup"] ?: newGroup,
    search = m["search"] ?: search,
    searchMessages = m["searchMessages"] ?: searchMessages,
    searchById = m["searchByIdPlaceholder"] ?: searchById,
    dialNumber = m["dialNumber"] ?: dialNumber,
    dialPlaceholder = m["dialPlaceholder"] ?: dialPlaceholder,
    recents = m["recents"] ?: recents,
    all = m["all"] ?: m["recentsFilterAll"] ?: all,
    missed = m["recentsFilterMissed"] ?: missed,
    incoming = m["recentsFilterIncoming"] ?: incoming,
    outgoing = m["recentsFilterOutgoing"] ?: outgoing,
    nameOrNumber = m["recentsSearchPlaceholder"] ?: nameOrNumber,
    createRoom = m["createRoom"] ?: createRoom,
    startCall = m["startCall"] ?: startCall,
    join = m["join"] ?: join,
    roomCode = m["roomCode"] ?: roomCode,
    enableMic = m["interpreterStart"] ?: enableMic,
    iSpeak = m["interpreterISpeak"] ?: iSpeak,
    theySpeak = m["interpreterTheySpeak"] ?: theySpeak,
    hold = m["interpreterHoldToTalk"] ?: hold,
    numbers = m["numbersTab"] ?: numbers,
    settings = m["settings"] ?: settings,
    logout = m["logoutFromSettings"] ?: m["logout"] ?: logout,
    support = m["support"] ?: support,
    blacklist = m["blacklist"] ?: blacklist,
    call = m["call"] ?: call,
    buy = m["buy"] ?: buy,
    catalog = m["catalog"] ?: catalog,
    dialCustom = m["dialCustom"] ?: dialCustom,
    yourNum = m["yourNum"] ?: yourNum,
    premiumNumber = m["premiumNumber"] ?: premiumNumber,
    unknown = m["unknown"] ?: unknown,
    roomTitle = m["roomTitle"] ?: roomTitle,
    roomSubtitle = m["roomInfo"] ?: roomSubtitle,
    joinSubtitle = m["joinSubtitle"] ?: joinSubtitle,
    aiTranslation = m["aiTranslation"] ?: aiTranslation,
    interpreterTitle = m["interpreterTitle"] ?: interpreterTitle,
    interpreterSubtitle = m["interpreterDesc"] ?: interpreterSubtitle,
    holdHint = m["interpreterReleaseHint"] ?: holdHint,
    supportSubtitle = m["supportSubtitle"] ?: supportSubtitle,
    supportPlaceholder = m["supportPlaceholder"] ?: supportPlaceholder,
    supportHint = m["supportHint"] ?: supportHint,
    numbersSubtitle = m["numbersSubtitle"] ?: numbersSubtitle,
    removeFriend = m["removeFriend"] ?: removeFriend,
    noCalls = m["noCalls"] ?: noCalls,
    friendsSection = m["friends"] ?: friendsSection,
    startChat = m["startChat"] ?: startChat,
    createGroup = m["createGroup"] ?: createGroup,
    groupName = m["groupName"] ?: groupName,
    groupMembersHint = m["groupMembersHint"] ?: groupMembersHint,
    roomReady = m["roomLinkReady"] ?: roomReady,
    inRoom = m["inRoom"] ?: inRoom,
    roomOwner = m["roomOwner"] ?: roomOwner,
    waitingGuest = m["waitingForAnswer"] ?: waitingGuest,
    copyLink = m["copyLink"] ?: copyLink,
    copied = m["copied"] ?: copied,
    shareLink = m["shareLink"] ?: shareLink,
    enterRoom = m["enterRoom"] ?: enterRoom,
    createNewRoom = m["createNewRoom"] ?: createNewRoom,
    block = m["block"] ?: block,
    unblock = m["unblock"] ?: unblock,
    blacklistDesc = m["blacklistDesc"] ?: blacklistDesc,
    blacklistEmpty = m["blacklistEmpty"] ?: blacklistEmpty,
    message = m["message"] ?: message,
    viewOriginal = m["viewOriginal"] ?: viewOriginal,
    chatTranslated = m["chatTranslated"] ?: chatTranslated,
    close = m["close"] ?: close,
    save = m["save"] ?: save,
    myData = m["settingsMyInfo"] ?: myData,
    myDataHint = m["settingsMyInfoHint"] ?: myDataHint,
    profileDetails = m["profileDetails"] ?: profileDetails,
    profileDetailsHint = m["profileNoDetails"] ?: profileDetailsHint,
    preferences = m["settingsPreferences"] ?: preferences,
    preferencesHint = m["settingsPreferencesHint"] ?: preferencesHint,
    notifications = m["notifications"] ?: notifications,
    notificationsHint = m["settingsNotificationsHint"] ?: notificationsHint,
    changePassword = m["settingsPasswordTitle"] ?: changePassword,
    changePasswordHint = m["settingsSecurityHint"] ?: changePasswordHint,
    yourNumberLabel = m["yourNumberLabel"] ?: yourNumberLabel,
)
