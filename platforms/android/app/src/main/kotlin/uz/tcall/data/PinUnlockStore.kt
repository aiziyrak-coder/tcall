package uz.tcall.data

/** Ilova sessiyasida PIN bir marta kiritilgandan keyin qayta so'ralmasin */
object PinUnlockStore {
    @Volatile
    var unlockedThisSession: Boolean = false
        private set

    fun markUnlocked() {
        unlockedThisSession = true
    }

    fun clear() {
        unlockedThisSession = false
    }
}
