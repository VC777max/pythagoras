package com.example.padelplanner.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class ApiClient(private val baseUrl: String = "http://10.0.2.2:3000/api") {
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private inline fun <reified T> parseResponse(bodyString: String): T {
        return json.decodeFromString(bodyString)
    }

    suspend fun login(name: String, pin: String): Player = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(LoginRequest(name, pin)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/login")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to login: ${response.code} ${response.message}")
            val body = response.body?.string() ?: throw IOException("Empty response body")
            parseResponse(body)
        }
    }

    suspend fun register(name: String, level: Int, position: String, pin: String): Player = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(RegisterRequest(name, level, position, pin)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/players")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to register: ${response.code} ${response.message}")
            val body = response.body?.string() ?: throw IOException("Empty response body")
            parseResponse(body)
        }
    }

    suspend fun getPlayers(): List<Player> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/players")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to fetch players")
            val body = response.body?.string() ?: "[]"
            parseResponse(body)
        }
    }

    suspend fun getAvailability(playerId: String): List<Availability> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/players/$playerId/availability")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to fetch availability")
            val body = response.body?.string() ?: "[]"
            parseResponse(body)
        }
    }

    suspend fun updateAvailability(playerId: String, availability: List<Availability>): Boolean = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(availability).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/players/$playerId/availability")
            .put(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    suspend fun getOnceAvailability(playerId: String): List<OnceAvailability> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/players/$playerId/availability/once")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext emptyList()
            val body = response.body?.string() ?: "[]"
            parseResponse(body)
        }
    }

    suspend fun updateOnceAvailability(playerId: String, slots: List<OnceAvailability>): Boolean = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(slots).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/players/$playerId/availability/once")
            .put(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    suspend fun triggerMatchFind(matchType: String = "friendly"): Match? = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(TriggerMatchRequest(matchType)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/matches")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext null
            val body = response.body?.string() ?: return@withContext null
            if (body.contains("No matching")) return@withContext null
            parseResponse<Match>(body)
        }
    }

    suspend fun getActiveMatches(playerId: String): List<Match> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/matches/active?playerId=$playerId")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to fetch active matches")
            val body = response.body?.string() ?: "[]"
            parseResponse(body)
        }
    }

    suspend fun respondToMatch(matchId: String, playerId: String, responseText: String): Boolean = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(RespondRequest(playerId, responseText)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/matches/$matchId/respond")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    suspend fun submitScore(matchId: String, score: SetScore, submittedBy: String): Boolean = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(ScoreRequest(score, submittedBy)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/matches/$matchId/score")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    suspend fun verifyScore(matchId: String, playerId: String, approved: Boolean): Boolean = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(VerifyRequest(playerId, approved)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/matches/$matchId/verify")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    suspend fun getRankings(): List<RankedPlayer> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/rankings")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to fetch rankings")
            val body = response.body?.string() ?: "[]"
            parseResponse(body)
        }
    }

    suspend fun getCourts(date: String, city: String, playtime: Int, courtType: String): List<Court> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/courts?date=$date&city=$city&playtime=$playtime&court_type=$courtType")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to fetch courts")
            val body = response.body?.string() ?: "[]"
            parseResponse(body)
        }
    }

    suspend fun updatePlayer(
        playerId: String,
        name: String,
        level: Int,
        position: String,
        pin: String,
        city: String,
        preferredClubs: List<String>,
        avatar: String,
        prefPlaytime: Int,
        prefCourtType: String
    ): Player = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(UpdateProfileRequest(name, level, position, pin, city, preferredClubs, avatar, prefPlaytime, prefCourtType)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/players/$playerId")
            .put(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to update profile: ${response.code} ${response.message}")
            val body = response.body?.string() ?: throw IOException("Empty response body")
            parseResponse(body)
        }
    }

    suspend fun updateBooking(
        matchId: String,
        playerId: String,
        bookingUrl: String?,
        tikkieUrl: String?
    ): Boolean = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(UpdateBookingRequest(playerId, bookingUrl, tikkieUrl)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/matches/$matchId/booking")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    // Returns { success, booker_id, booker_name } or { success=false, booker_name }
    suspend fun claimBooking(matchId: String, playerId: String): Pair<Boolean, String?> = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(ClaimBookingRequest(playerId)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/matches/$matchId/claim-booking")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext Pair(false, null)
            val body = response.body?.string() ?: return@withContext Pair(false, null)
            val jsonObj = json.parseToJsonElement(body).let { it as? kotlinx.serialization.json.JsonObject }
            val success = jsonObj?.get("success")?.toString() == "true"
            val bookerName = jsonObj?.get("booker_name")?.toString()?.trim('"')
            Pair(success, bookerName)
        }
    }

    // Booker confirms court is booked, transitions match to 'booked' status
    suspend fun confirmBooked(
        matchId: String,
        playerId: String,
        bookingUrl: String?,
        tikkieUrl: String?
    ): Boolean = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(
            ConfirmBookedRequest(playerId, bookingUrl?.ifBlank { null }, tikkieUrl?.ifBlank { null })
        ).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/matches/$matchId/confirm-booked")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    suspend fun getBadges(playerId: String): List<Badge> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/players/$playerId/badges")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext emptyList()
            val body = response.body?.string() ?: "[]"
            parseResponse(body)
        }
    }

    suspend fun getSeasonCurrent(): CurrentSeasonResponse? = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/seasons/current")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext null
            val body = response.body?.string() ?: return@withContext null
            parseResponse(body)
        }
    }

    suspend fun toggleAvailableNow(playerId: String, available: Boolean): Boolean = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(AvailableNowRequest(available)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/players/$playerId/available-now")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    suspend fun triggerUrgentMatch(playerId: String): UrgentMatchResponse = withContext(Dispatchers.IO) {
        val requestBody = json.encodeToString(UrgentMatchRequest(playerId)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$baseUrl/matches/urgent")
            .post(requestBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to request urgent match")
            val body = response.body?.string() ?: throw IOException("Empty response body")
            parseResponse(body)
        }
    }
}

