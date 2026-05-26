package com.example.padelplanner.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import com.example.padelplanner.data.OnceAvailability

class PadelRepository(private val context: Context) {
    private val apiClient = ApiClient()
    private val sharedPrefs = context.getSharedPreferences("padel_prefs", Context.MODE_PRIVATE)

    private val _activePlayer = MutableStateFlow<Player?>(null)
    val activePlayer: StateFlow<Player?> = _activePlayer.asStateFlow()

    private val _players = MutableStateFlow<List<Player>>(emptyList())
    val players: StateFlow<List<Player>> = _players.asStateFlow()

    private val _activeMatches = MutableStateFlow<List<Match>>(emptyList())
    val activeMatches: StateFlow<List<Match>> = _activeMatches.asStateFlow()

    private val _rankings = MutableStateFlow<List<RankedPlayer>>(emptyList())
    val rankings: StateFlow<List<RankedPlayer>> = _rankings.asStateFlow()

    private val _courts = MutableStateFlow<List<Court>>(emptyList())
    val courts: StateFlow<List<Court>> = _courts.asStateFlow()

    private val _myAvailability = MutableStateFlow<List<Availability>>(emptyList())
    val myAvailability: StateFlow<List<Availability>> = _myAvailability.asStateFlow()

    private val _myOnceAvailability = MutableStateFlow<List<OnceAvailability>>(emptyList())
    val myOnceAvailability: StateFlow<List<OnceAvailability>> = _myOnceAvailability.asStateFlow()

    private val _myBadges = MutableStateFlow<List<Badge>>(emptyList())
    val myBadges: StateFlow<List<Badge>> = _myBadges.asStateFlow()

    private val _currentSeason = MutableStateFlow<CurrentSeasonResponse?>(null)
    val currentSeason: StateFlow<CurrentSeasonResponse?> = _currentSeason.asStateFlow()

    init {
        // Load saved session
        val savedJson = sharedPrefs.getString("active_player", null)
        if (savedJson != null) {
            try {
                _activePlayer.value = Json.decodeFromString<Player>(savedJson)
            } catch (e: Exception) {
                // Invalid json, clear it
                sharedPrefs.edit().remove("active_player").apply()
            }
        }
    }

    suspend fun login(name: String, pin: String): Result<Player> {
        return try {
            val player = apiClient.login(name, pin)
            _activePlayer.value = player
            sharedPrefs.edit().putString("active_player", Json.encodeToString(player)).apply()
            Result.success(player)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(name: String, level: Int, position: String, pin: String): Result<Player> {
        return try {
            val player = apiClient.register(name, level, position, pin)
            _activePlayer.value = player
            sharedPrefs.edit().putString("active_player", Json.encodeToString(player)).apply()
            Result.success(player)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun logout() {
        _activePlayer.value = null
        sharedPrefs.edit().remove("active_player").apply()
        _activeMatches.value = emptyList()
        _myAvailability.value = emptyList()
    }

    suspend fun loadPlayers() {
        try {
            _players.value = apiClient.getPlayers()
        } catch (e: Exception) {
            // Log error, keep empty
        }
    }

    suspend fun loadMyAvailability() {
        val player = _activePlayer.value ?: return
        try {
            _myAvailability.value = apiClient.getAvailability(player.id)
        } catch (e: Exception) {
            // Keep current
        }
    }

    suspend fun loadMyOnceAvailability() {
        val player = _activePlayer.value ?: return
        try {
            _myOnceAvailability.value = apiClient.getOnceAvailability(player.id)
        } catch (e: Exception) {
            // Keep current
        }
    }

    suspend fun updateMyAvailability(availability: List<Availability>): Boolean {
        val player = _activePlayer.value ?: return false
        return try {
            val success = apiClient.updateAvailability(player.id, availability)
            if (success) {
                _myAvailability.value = availability
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun updateMyOnceAvailability(slots: List<OnceAvailability>): Boolean {
        val player = _activePlayer.value ?: return false
        return try {
            val success = apiClient.updateOnceAvailability(player.id, slots)
            if (success) {
                _myOnceAvailability.value = slots
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun loadActiveMatches() {
        val player = _activePlayer.value ?: return
        try {
            _activeMatches.value = apiClient.getActiveMatches(player.id)
        } catch (e: Exception) {
            // Keep current
        }
    }

    suspend fun triggerMatchFind(matchType: String = "friendly"): Match? {
        return try {
            val match = apiClient.triggerMatchFind(matchType)
            if (match != null) {
                loadActiveMatches()
            }
            match
        } catch (e: Exception) {
            null
        }
    }

    suspend fun respondToMatch(matchId: String, response: String): Boolean {
        val player = _activePlayer.value ?: return false
        return try {
            val success = apiClient.respondToMatch(matchId, player.id, response)
            if (success) {
                loadActiveMatches()
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun submitScore(matchId: String, score: SetScore): Boolean {
        val player = _activePlayer.value ?: return false
        return try {
            val success = apiClient.submitScore(matchId, score, player.id)
            if (success) {
                loadActiveMatches()
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun verifyScore(matchId: String, approved: Boolean): Boolean {
        val player = _activePlayer.value ?: return false
        return try {
            val success = apiClient.verifyScore(matchId, player.id, approved)
            if (success) {
                loadActiveMatches()
                loadRankings() // Reload rankings since score verified
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun loadRankings() {
        try {
            _rankings.value = apiClient.getRankings()
        } catch (e: Exception) {
            // Keep current
        }
    }

    suspend fun loadCourts(date: String) {
        val city = _activePlayer.value?.city ?: "Groningen"
        val playtime = _activePlayer.value?.pref_playtime ?: 90
        val courtType = _activePlayer.value?.pref_court_type ?: "double"
        try {
            _courts.value = apiClient.getCourts(date, city, playtime, courtType)
        } catch (e: Exception) {
            // Keep current
        }
    }

    suspend fun updatePlayer(
        name: String,
        level: Int,
        position: String,
        pin: String,
        city: String,
        preferredClubs: List<String>,
        avatar: String,
        prefPlaytime: Int,
        prefCourtType: String
    ): Result<Player> {
        val player = _activePlayer.value ?: return Result.failure(IllegalStateException("No active player logged in"))
        return try {
            val updated = apiClient.updatePlayer(player.id, name, level, position, pin, city, preferredClubs, avatar, prefPlaytime, prefCourtType)
            _activePlayer.value = updated
            sharedPrefs.edit().putString("active_player", Json.encodeToString(updated)).apply()
            Result.success(updated)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateBooking(matchId: String, bookingUrl: String?, tikkieUrl: String?): Boolean {
        val player = _activePlayer.value ?: return false
        return try {
            val success = apiClient.updateBooking(matchId, player.id, bookingUrl, tikkieUrl)
            if (success) {
                loadActiveMatches()
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun claimBooking(matchId: String): Pair<Boolean, String?> {
        val player = _activePlayer.value ?: return Pair(false, null)
        return try {
            val result = apiClient.claimBooking(matchId, player.id)
            loadActiveMatches()
            result
        } catch (e: Exception) {
            Pair(false, null)
        }
    }

    suspend fun confirmBooked(matchId: String, bookingUrl: String?, tikkieUrl: String?): Boolean {
        val player = _activePlayer.value ?: return false
        return try {
            val success = apiClient.confirmBooked(matchId, player.id, bookingUrl, tikkieUrl)
            if (success) {
                loadActiveMatches()
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun loadMyBadges() {
        val player = _activePlayer.value ?: return
        try {
            _myBadges.value = apiClient.getBadges(player.id)
        } catch (e: Exception) {
            // Keep current
        }
    }

    suspend fun loadCurrentSeason() {
        try {
            _currentSeason.value = apiClient.getSeasonCurrent()
        } catch (e: Exception) {
            // Keep current
        }
    }

    suspend fun toggleAvailableNow(available: Boolean): Boolean {
        val player = _activePlayer.value ?: return false
        return try {
            val success = apiClient.toggleAvailableNow(player.id, available)
            if (success) {
                val updatedPlayer = player.copy(available_now = if (available) 1 else 0)
                _activePlayer.value = updatedPlayer
                sharedPrefs.edit().putString("active_player", Json.encodeToString(updatedPlayer)).apply()
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun triggerUrgentMatch(): UrgentMatchResponse {
        val player = _activePlayer.value ?: throw IllegalStateException("No active player logged in")
        return try {
            val response = apiClient.triggerUrgentMatch(player.id)
            if (response.success) {
                loadActiveMatches()
            }
            val updatedPlayer = player.copy(available_now = if (response.success) 0 else 1)
            _activePlayer.value = updatedPlayer
            sharedPrefs.edit().putString("active_player", Json.encodeToString(updatedPlayer)).apply()
            response
        } catch (e: Exception) {
            UrgentMatchResponse(success = false, message = e.message)
        }
    }
}

