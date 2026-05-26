package com.example.padelplanner.ui.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.padelplanner.MainActivity
import com.example.padelplanner.data.ApiClient
import com.example.padelplanner.data.Player
import kotlinx.serialization.json.Json

class MatchNotificationWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val apiClient = ApiClient()
    private val json = Json { ignoreUnknownKeys = true }
    private val prefs = context.getSharedPreferences("padel_prefs", Context.MODE_PRIVATE)

    override suspend fun doWork(): Result {
        // Read logged in player
        val playerJson = prefs.getString("active_player", null) ?: return Result.success()
        val player = try {
            json.decodeFromString<Player>(playerJson)
        } catch (e: Exception) {
            return Result.success()
        }

        try {
            // Fetch active matches
            val activeMatches = apiClient.getActiveMatches(player.id)
            
            for (match in activeMatches) {
                val lastStatus = prefs.getString("match_status_${match.id}", null)
                val currentStatus = match.status

                if (lastStatus != currentStatus) {
                    // Status changed or new match
                    if (lastStatus == null && currentStatus == "proposed") {
                        // New match proposed
                        showNotification(
                            matchId = match.id.hashCode(),
                            title = "New Match Proposed",
                            content = "A padel match is proposed for ${match.date} from ${match.start} to ${match.end}."
                        )
                    } else if (lastStatus == "proposed" && currentStatus == "confirmed") {
                        // Match confirmed
                        showNotification(
                            matchId = match.id.hashCode(),
                            title = "Match Confirmed",
                            content = "Your padel match on ${match.date} at ${match.start} is confirmed! Booker is ${match.booker_name ?: "unknown"}."
                        )
                    }
                    
                    // Save new status
                    prefs.edit().putString("match_status_${match.id}", currentStatus).apply()
                }
            }
            
            return Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            return Result.retry()
        }
    }

    private fun showNotification(matchId: Int, title: String, content: String) {
        val channelId = "padel_matches"
        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Match Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications about proposed and confirmed matches"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            applicationContext,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(applicationContext, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        try {
            notificationManager.notify(matchId, builder.build())
        } catch (e: SecurityException) {
            // Permission missing
        }
    }
}
