# WebView JavascriptInterface
-keepclassmembers class uz.tcall.web.TcallAndroidBridge { *; }
-keep class uz.tcall.web.** { *; }
-keep class uz.tcall.session.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# EncryptedSharedPreferences
-keep class androidx.security.crypto.** { *; }
