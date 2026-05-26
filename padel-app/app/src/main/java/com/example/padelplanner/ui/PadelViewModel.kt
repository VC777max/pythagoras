package com.example.padelplanner.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.padelplanner.data.*
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PadelViewModel(private val repository: PadelRepository) : ViewModel() {

    val activePlayer: StateFlow<Player?> = repository.activePlayer
    val activeMatches: StateFlow<List<Match>> = repository.activeMatches
    val rankings: StateFlow<List<RankedPlayer>> = repository.rankings
    val courts: StateFlow<List<Court>> = repository.courts
    val myAvailability: StateFlow<List<Availability>> = repository.myAvailability
    val myOnceAvailability: StateFlow<List<OnceAvailability>> = repository.myOnceAvailability
    val players: StateFlow<List<Player>> = repository.players
    val myBadges: StateFlow<List<Badge>> = repository.myBadges
    val currentSeason: StateFlow<CurrentSeasonResponse?> = repository.currentSeason

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    init {
        viewModelScope.launch {
            if (activePlayer.value != null) {
                refreshAllData()
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun login(name: String, pin: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            val result = repository.login(name, pin)
            _isLoading.value = false
            if (result.isSuccess) {
                refreshAllData()
                onSuccess()
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Login failed"
            }
        }
    }

    fun register(name: String, level: Int, position: String, pin: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            val result = repository.register(name, level, position, pin)
            _isLoading.value = false
            if (result.isSuccess) {
                refreshAllData()
                onSuccess()
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Registration failed"
            }
        }
    }

    fun logout() {
        repository.logout()
    }

    fun refreshAllData() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.loadPlayers()
            repository.loadMyAvailability()
            repository.loadMyOnceAvailability()
            repository.loadMyBadges()
            repository.loadCurrentSeason()
            repository.loadActiveMatches()
            repository.loadRankings()
            loadCourtsForToday()
            _isLoading.value = false
        }
    }

    fun updateAvailability(slots: List<Availability>) {
        viewModelScope.launch {
            _isLoading.value = true
            val success = repository.updateMyAvailability(slots)
            _isLoading.value = false
            if (!success) {
                _errorMessage.value = "Failed to update availability"
            }
        }
    }

    fun updateOnceAvailability(slots: List<OnceAvailability>) {
        viewModelScope.launch {
            _isLoading.value = true
            val success = repository.updateMyOnceAvailability(slots)
            _isLoading.value = false
            if (!success) {
                _errorMessage.value = "Failed to update one-time availability"
            }
        }
    }

    fun triggerMatchFind(matchType: String = "friendly", onResult: (Match?) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val match = repository.triggerMatchFind(matchType)
            _isLoading.value = false
            onResult(match)
            if (match == null) {
                _errorMessage.value = "No overlapping players found to create a match"
            }
        }
    }

    fun respondToMatch(matchId: String, accept: Boolean) {
        viewModelScope.launch {
            _isLoading.value = true
            val response = if (accept) "accepted" else "rejected"
            val success = repository.respondToMatch(matchId, response)
            _isLoading.value = false
            if (!success) {
                _errorMessage.value = "Failed to send response"
            }
        }
    }

    fun submitScore(matchId: String, score: SetScore) {
        viewModelScope.launch {
            _isLoading.value = true
            val success = repository.submitScore(matchId, score)
            _isLoading.value = false
            if (!success) {
                _errorMessage.value = "Failed to submit score"
            }
        }
    }

    fun verifyScore(matchId: String, approved: Boolean) {
        viewModelScope.launch {
            _isLoading.value = true
            val success = repository.verifyScore(matchId, approved)
            _isLoading.value = false
            if (!success) {
                _errorMessage.value = "Failed to verify score"
            }
        }
    }

    fun loadCourtsForToday() {
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        loadCourtsForDate(todayStr)
    }

    fun loadCourtsForDate(dateStr: String) {
        viewModelScope.launch {
            repository.loadCourts(dateStr)
        }
    }

    fun updatePlayerProfile(
        name: String,
        level: Int,
        position: String,
        pin: String,
        city: String,
        preferredClubs: List<String>,
        avatar: String,
        prefPlaytime: Int,
        prefCourtType: String,
        onResult: (Boolean) -> Unit
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.updatePlayer(name, level, position, pin, city, preferredClubs, avatar, prefPlaytime, prefCourtType)
            _isLoading.value = false
            onResult(result.isSuccess)
            if (result.isSuccess) {
                refreshAllData()
            } else {
                _errorMessage.value = result.exceptionOrNull()?.message ?: "Failed to update profile"
            }
        }
    }

    fun updateBookingDetails(
        matchId: String,
        bookingUrl: String?,
        tikkieUrl: String?,
        onResult: (Boolean) -> Unit
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            val success = repository.updateBooking(matchId, bookingUrl, tikkieUrl)
            _isLoading.value = false
            onResult(success)
            if (!success) {
                _errorMessage.value = "Failed to update booking details"
            }
        }
    }

    fun claimBooking(matchId: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val (success, bookerName) = repository.claimBooking(matchId)
            _isLoading.value = false
            onResult(success, bookerName)
        }
    }

    fun confirmBooked(
        matchId: String,
        bookingUrl: String?,
        tikkieUrl: String?,
        onResult: (Boolean) -> Unit
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            val success = repository.confirmBooked(matchId, bookingUrl, tikkieUrl)
            _isLoading.value = false
            onResult(success)
            if (!success) {
                _errorMessage.value = "Failed to confirm booking"
            }
        }
    }

    fun toggleAvailableNow(available: Boolean) {
        viewModelScope.launch {
            repository.toggleAvailableNow(available)
        }
    }

    fun triggerUrgentMatch(onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val response = repository.triggerUrgentMatch()
            _isLoading.value = false
            onResult(response.success, response.message)
        }
    }
}

