package com.example.padelplanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.padelplanner.data.Match
import com.example.padelplanner.data.SetScore
import com.example.padelplanner.ui.PadelViewModel
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoreScreen(
    viewModel: PadelViewModel,
    modifier: Modifier = Modifier
) {
    val activePlayer by viewModel.activePlayer.collectAsState()
    val activeMatches by viewModel.activeMatches.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current

    var selectedMatchForScore by remember { mutableStateOf<Match?>(null) }

    val pendingVerifications = remember(activeMatches, activePlayer) {
        activeMatches.filter { m ->
            m.score != null && m.score.status == "pending" && m.score.verify_by.contains(activePlayer?.id)
        }
    }

    val confirmedMatches = remember(activeMatches) {
        activeMatches.filter { m ->
            m.status == "confirmed" && m.score == null
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Match Scores", fontWeight = FontWeight.ExtraBold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        modifier = modifier
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                // Score Verifications
                if (pendingVerifications.isNotEmpty()) {
                    item {
                        Text(
                            text = "Pending Your Verification",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    items(pendingVerifications) { match ->
                        VerificationCard(
                            match = match,
                            onVerify = { approved ->
                                viewModel.verifyScore(match.id, approved)
                                val msg = if (approved) "Score confirmed!" else "Score rejected."
                                Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }

                // Confirmed Matches needing score
                item {
                    Text(
                        text = "Recent Confirmed Games",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                if (confirmedMatches.isEmpty()) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No games awaiting score entry.",
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                } else {
                    items(confirmedMatches) { match ->
                        ConfirmedMatchScoreRow(
                            match = match,
                            onSubmitClick = { selectedMatchForScore = match }
                        )
                    }
                }
            }

            // Score Entry Dialog
            selectedMatchForScore?.let { match ->
                ScoreEntryDialog(
                    match = match,
                    onDismiss = { selectedMatchForScore = null },
                    onSubmit = { scoreVal ->
                        viewModel.submitScore(match.id, scoreVal)
                        selectedMatchForScore = null
                        Toast.makeText(context, "Score submitted! Awaiting verification.", Toast.LENGTH_LONG).show()
                    }
                )
            }

            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter),
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun VerificationCard(match: Match, onVerify: (Boolean) -> Unit) {
    val score = match.score ?: return

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "${match.date} • Verification Request",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.secondary
            )
            Spacer(modifier = Modifier.height(8.dp))

            val team1Names = match.players.filter { it.team_number == 1 }.joinToString(" & ") { it.name }
            val team2Names = match.players.filter { it.team_number == 2 }.joinToString(" & ") { it.name }

            val scoreStr = score.sets.joinToString(", ") { "${it[0]}-${it[1]}" }

            Text(
                text = "$team1Names  vs  $team2Names",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "Submitted Score: $scoreStr",
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 15.sp,
                modifier = Modifier.padding(vertical = 10.dp)
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = { onVerify(true) },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Approve", color = MaterialTheme.colorScheme.onPrimary, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                }

                Button(
                    onClick = { onVerify(false) },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onTertiary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Reject", color = MaterialTheme.colorScheme.onTertiary, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

@Composable
fun ConfirmedMatchScoreRow(match: Match, onSubmitClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${match.date} • ${match.start}",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(4.dp))
                val team1Names = match.players.filter { it.team_number == 1 }.joinToString(" & ") { it.name }
                val team2Names = match.players.filter { it.team_number == 2 }.joinToString(" & ") { it.name }
                Text(
                    text = "$team1Names  vs\n$team2Names",
                    fontSize = 13.sp,
                    lineHeight = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            Button(
                onClick = onSubmitClick,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Enter Score", color = MaterialTheme.colorScheme.onSecondary, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
    }
}

@Composable
fun ScoreEntryDialog(
    match: Match,
    onDismiss: () -> Unit,
    onSubmit: (SetScore) -> Unit
) {
    var t1Set1 by remember { mutableStateOf("") }
    var t2Set1 by remember { mutableStateOf("") }
    var t1Set2 by remember { mutableStateOf("") }
    var t2Set2 by remember { mutableStateOf("") }
    var t1Set3 by remember { mutableStateOf("") }
    var t2Set3 by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Submit Match Score", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                val team1Names = match.players.filter { it.team_number == 1 }.joinToString(" & ") { it.name }
                val team2Names = match.players.filter { it.team_number == 2 }.joinToString(" & ") { it.name }

                Text("T1: $team1Names", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Text("T2: $team2Names", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)

                Spacer(modifier = Modifier.height(8.dp))

                // Set 1 Row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Set 1: ", modifier = Modifier.width(50.dp), fontWeight = FontWeight.ExtraBold)
                    OutlinedTextField(
                        value = t1Set1,
                        onValueChange = { t1Set1 = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("T1") }
                    )
                    Text("-")
                    OutlinedTextField(
                        value = t2Set1,
                        onValueChange = { t2Set1 = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("T2") }
                    )
                }

                // Set 2 Row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Set 2: ", modifier = Modifier.width(50.dp), fontWeight = FontWeight.ExtraBold)
                    OutlinedTextField(
                        value = t1Set2,
                        onValueChange = { t1Set2 = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("T1") }
                    )
                    Text("-")
                    OutlinedTextField(
                        value = t2Set2,
                        onValueChange = { t2Set2 = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("T2") }
                    )
                }

                // Set 3 (Tiebreak) Row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Set 3: ", modifier = Modifier.width(50.dp), fontWeight = FontWeight.ExtraBold)
                    OutlinedTextField(
                        value = t1Set3,
                        onValueChange = { t1Set3 = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("T1") }
                    )
                    Text("-")
                    OutlinedTextField(
                        value = t2Set3,
                        onValueChange = { t2Set3 = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("T2") }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val s1_1 = t1Set1.toIntOrNull() ?: 0
                    val s1_2 = t2Set1.toIntOrNull() ?: 0
                    val s2_1 = t1Set2.toIntOrNull() ?: 0
                    val s2_2 = t2Set2.toIntOrNull() ?: 0
                    
                    val setsList = mutableListOf(listOf(s1_1, s1_2), listOf(s2_1, s2_2))
                    
                    val s3_1 = t1Set3.toIntOrNull()
                    val s3_2 = t2Set3.toIntOrNull()
                    if (s3_1 != null && s3_2 != null) {
                        setsList.add(listOf(s3_1, s3_2))
                    }

                    var t1SetsWon = 0
                    var t2SetsWon = 0
                    
                    if (s1_1 > s1_2) t1SetsWon++ else t2SetsWon++
                    if (s2_1 > s2_2) t1SetsWon++ else t2SetsWon++
                    
                    if (s3_1 != null && s3_2 != null) {
                        if (s3_1 > s3_2) t1SetsWon++ else t2SetsWon++
                    }

                    val score = SetScore(
                        sets = setsList,
                        team1_games = t1SetsWon,
                        team2_games = t2SetsWon
                    )
                    onSubmit(score)
                },
                enabled = t1Set1.isNotBlank() && t2Set1.isNotBlank() && t1Set2.isNotBlank() && t2Set2.isNotBlank(),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Submit Score", fontWeight = FontWeight.ExtraBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", fontWeight = FontWeight.Bold)
            }
        }
    )
}
