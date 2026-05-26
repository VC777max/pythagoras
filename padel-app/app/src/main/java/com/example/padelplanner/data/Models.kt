package com.example.padelplanner.data

import kotlinx.serialization.Serializable

@Serializable
data class Player(
    val id: String,
    val name: String,
    val level: Int,
    val position: String,
    val telegram_id: String? = null,
    val pin: String,
    val sessions: Int = 0,
    val hours: Int = 0,
    val wins: Int = 0,
    val games: Int = 0,
    val avail_mode: String = "flex",
    val rejected_slots: String = "[]",
    val city: String = "Groningen",
    val preferred_clubs: List<String> = emptyList(),
    val elo: Int = 1200,
    val elo_peak: Int = 1200,
    val avatar: String = "avatar_01",
    val available_now: Int = 0,
    val peakz_rating: Double = 7.3,
    val peakz_rating_peak: Double = 7.3,
    val pref_playtime: Int = 90,
    val pref_court_type: String = "double"
)

@Serializable
data class Availability(
    val day_name: String,
    val start_time: String,
    val end_time: String,
    val duration: Int = 90
)

// One-time / date-specific availability slot
@Serializable
data class OnceAvailability(
    val date: String,       // YYYY-MM-DD
    val start_time: String,
    val end_time: String,
    val duration: Int = 90
)

@Serializable
data class MatchPlayerInfo(
    val id: String,
    val name: String,
    val level: Int,
    val team_number: Int
)

@Serializable
data class ProposedTeams(
    val team1: List<String>,
    val team2: List<String>
)

@Serializable
data class SetScore(
    val sets: List<List<Int>> = emptyList(), // e.g. [[6, 4], [7, 5]]
    val team1_games: Int = 0,
    val team2_games: Int = 0,
    val status: String = "pending",
    val submitted_by: String? = null,
    val verify_by: List<String> = emptyList()
)

@Serializable
data class Match(
    val id: String,
    val status: String, // proposed, confirmed, booked, cancelled, completed
    val responses: Map<String, String>, // playerId -> pending/accepted/rejected
    val date: String,
    val start: String,
    val end: String,
    val score: SetScore? = null,
    val proposed_teams: ProposedTeams,
    val match_type: String = "friendly",
    val booker_id: String? = null,
    val booker_name: String? = null,
    val booking_claimed_by: String? = null,
    val players: List<MatchPlayerInfo> = emptyList(),
    val location: String = "Peakz Padel Euroborg",
    val booking_url: String? = null,
    val tikkie_url: String? = null
)

@Serializable
data class RankedPlayer(
    val id: String,
    val name: String,
    val level: Int,
    val position: String,
    val sessions: Int,
    val wins: Int,
    val losses: Int,
    val winrate: Int,
    val elo: Int,
    val elo_peak: Int,
    val avatar: String,
    val season_rank: Int,
    val climber_delta: Int,
    val peakz_rating: Double = 7.3,
    val peakz_rating_peak: Double = 7.3,
    val pref_playtime: Int = 90,
    val pref_court_type: String = "double"
)

@Serializable
data class WeatherInfo(
    val temperature: Int,
    val wind_speed: Int,
    val weather_code: Int,
    val is_playable: Boolean
)

@Serializable
data class Court(
    val location: String,
    val time: String,
    val date: String,
    val courtType: String,
    val price: String,
    val isOutdoor: Boolean = false,
    val weather: WeatherInfo? = null
)

@Serializable
data class Badge(
    val badge_id: String,
    val earned_at: String
)

@Serializable
data class SeasonInfo(
    val id: String,
    val name: String,
    val start_date: String,
    val end_date: String,
    val is_active: Int
)

@Serializable
data class SeasonLeaderboardEntry(
    val rank: Int,
    val player_id: String,
    val name: String,
    val avatar: String,
    val elo_start: Int,
    val elo_current: Int,
    val elo_peak: Int,
    val games_played: Int,
    val wins: Int,
    val climber_delta: Int,
    val peakz_rating_start: Double = 7.3,
    val peakz_rating_current: Double = 7.3,
    val peakz_rating_peak: Double = 7.3,
    val peakz_rating_climber_delta: Double = 0.0
)

@Serializable
data class CurrentSeasonResponse(
    val season: SeasonInfo,
    val leaderboard: List<SeasonLeaderboardEntry>,
    val biggest_climber: SeasonLeaderboardEntry? = null
)

@Serializable
data class LoginRequest(
    val name: String,
    val pin: String
)

@Serializable
data class RegisterRequest(
    val name: String,
    val level: Int,
    val position: String,
    val pin: String
)

@Serializable
data class RespondRequest(
    val playerId: String,
    val response: String // accepted, rejected
)

@Serializable
data class ScoreRequest(
    val score: SetScore,
    val submitted_by: String
)

@Serializable
data class VerifyRequest(
    val playerId: String,
    val approved: Boolean
)

@Serializable
data class UpdateProfileRequest(
    val name: String,
    val level: Int,
    val position: String,
    val pin: String,
    val city: String,
    val preferred_clubs: List<String>,
    val avatar: String = "avatar_01",
    val pref_playtime: Int = 90,
    val pref_court_type: String = "double"
)

@Serializable
data class UpdateBookingRequest(
    val playerId: String,
    val bookingUrl: String?,
    val tikkieUrl: String?
)

@Serializable
data class ClaimBookingRequest(
    val player_id: String
)

@Serializable
data class ConfirmBookedRequest(
    val player_id: String,
    val booking_url: String? = null,
    val tikkie_url: String? = null
)

@Serializable
data class TriggerMatchRequest(
    val match_type: String = "friendly"
)

@Serializable
data class AvailableNowRequest(
    val available: Boolean
)

@Serializable
data class UrgentMatchRequest(
    val player_id: String
)

@Serializable
data class UrgentMatchResponse(
    val success: Boolean,
    val match: Match? = null,
    val message: String? = null
)

