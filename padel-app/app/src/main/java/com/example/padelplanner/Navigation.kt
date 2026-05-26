package com.example.padelplanner

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.padelplanner.ui.PadelViewModel
import com.example.padelplanner.ui.main.MainScreen

@Composable
fun MainNavigation(viewModel: PadelViewModel) {
  val backStack = rememberNavBackStack(Main)

  NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider =
      entryProvider {
        entry<Main> {
          MainScreen(
            viewModel = viewModel, 
            onItemClick = { navKey -> backStack.add(navKey) }, 
            modifier = Modifier.safeDrawingPadding()
          )
        }
      },
  )
}
