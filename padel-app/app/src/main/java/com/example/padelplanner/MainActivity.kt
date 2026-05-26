package com.example.padelplanner

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.example.padelplanner.data.PadelRepository
import com.example.padelplanner.theme.PadelPlannerTheme
import com.example.padelplanner.ui.PadelViewModel
import com.example.padelplanner.ui.notifications.MatchNotificationWorker
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Request notification permission for Android 13+
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
      }
    }

    // Schedule WorkManager polling for match notifications
    val workRequest = PeriodicWorkRequestBuilder<MatchNotificationWorker>(15, TimeUnit.MINUTES)
      .setConstraints(
        Constraints.Builder()
          .setRequiredNetworkType(NetworkType.CONNECTED)
          .build()
      )
      .build()

    WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
      "match_sync",
      ExistingPeriodicWorkPolicy.KEEP,
      workRequest
    )

    val repository = PadelRepository(applicationContext)
    val viewModel = PadelViewModel(repository)

    enableEdgeToEdge()
    setContent {
      PadelPlannerTheme { 
        Surface(
          modifier = Modifier.fillMaxSize(), 
          color = MaterialTheme.colorScheme.background
        ) { 
          MainNavigation(viewModel) 
        } 
      }
    }
  }
}
