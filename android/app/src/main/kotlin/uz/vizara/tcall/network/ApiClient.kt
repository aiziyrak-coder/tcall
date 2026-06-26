package uz.vizara.tcall.network

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import uz.vizara.tcall.BuildConfig
import uz.vizara.tcall.data.AuthRepository
import uz.vizara.tcall.data.SessionStore
import java.util.concurrent.TimeUnit

class ApiClient(sessionStore: SessionStore) {
    private val authInterceptor = Interceptor { chain ->
        val token = sessionStore.getTokenSync()
        val request = chain.request().newBuilder()
            .header("X-Tcall-Native", "1")
            .header("Accept", "application/json")
            .apply {
                if (!token.isNullOrBlank()) {
                    header("Authorization", "Bearer $token")
                }
            }
            .build()
        chain.proceed(request)
    }

    private val logging = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
    }

    private val okHttp = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(authInterceptor)
        .addInterceptor(logging)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttp)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val api: TcallApi = retrofit.create(TcallApi::class.java)
    val authRepository = AuthRepository(api, sessionStore)
}
