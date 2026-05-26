import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = 3000;

// Peakz Clubs per City Dictionary
const CITIES_CLUBS = {
  'Groningen': ['Atoomweg', 'Euroborg', 'Suikerterrein'],
  'Amsterdam': ['Kauwgomballenkwartier', 'Olympiaplein', 'Sloterdijk', 'Zuidoost'],
  'Utrecht': ['Vechtsebanen', 'Zeehaenkade'],
  'Eindhoven': ['Beursgebouw', 'High Tech Campus', 'Vijfkamplaan'],
  'Apeldoorn': ['De Maten', 'Malkenschoten'],
  'Assen': ['Assen'],
  'Haarlem': ['Haarlem'],
  'Heemskerk': ['Heemskerk'],
  'Heerlen': ['Heerlen'],
  'Nijmegen': ['Nijmegen'],
  'Oisterwijk': ['Oisterwijk'],
  'Papendrecht': ['Papendrecht'],
  'Sittard': ['Sittard'],
  'Zutphen': ['Zutphen'],
  'Zwolle': ['Zwolle']
};

// Convert ELO rating to decimal Peakz Rating (1.0 to 10.0, lower is better)
const getPeakzRating = (elo) => {
  const rating = 10.0 - (elo - 800) / 150.0;
  return parseFloat(Math.max(1.0, Math.min(10.0, rating)).toFixed(1));
};

// Helper: Find a club overlapping in all players preferred lists
function findCommonClub(city, selectedPlayers) {
  const cityClubs = CITIES_CLUBS[city] || ['Peakz Court'];
  let common = [...cityClubs];
  for (const p of selectedPlayers) {
    if (p.preferred_clubs && p.preferred_clubs.length > 0) {
      common = common.filter(club => p.preferred_clubs.includes(club));
    }
  }
  if (common.length > 0) {
    return `Peakz Padel ${common[0]}`;
  }
  return `Peakz Padel ${cityClubs[0]}`;
}

// Helper: Calculate next calendar date for a given Dutch weekday name
function getNextDateForDay(dayName) {
  const dutchDays = {
    'zondag': 0,
    'maandag': 1,
    'dinsdag': 2,
    'woensdag': 3,
    'donderdag': 4,
    'vrijdag': 5,
    'zaterdag': 6
  };
  
  const targetDayOfWeek = dutchDays[dayName.toLowerCase()];
  if (targetDayOfWeek === undefined) return new Date().toISOString().split('T')[0];
  
  const resultDate = new Date();
  const currentDayOfWeek = resultDate.getDay();
  
  let distance = targetDayOfWeek - currentDayOfWeek;
  if (distance <= 0) {
    distance += 7; // Next week's occurrence
  }
  
  resultDate.setDate(resultDate.getDate() + distance);
  return resultDate.toISOString().split('T')[0];
}

const JWT_SECRET = process.env.JWT_SECRET || 'padel_secret_super_secure_key_1234';

// Middleware: Verify JWT authorization token and player access permissions
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    req.user = user; // user contains { id: playerId }

    // Authorization check: prevent player A from modifying player B's data (Melvin bypasses)
    const targetPlayerId = req.params.id || req.body.playerId || req.query.playerId || req.body.player_id;
    if (targetPlayerId && targetPlayerId !== req.user.id && req.user.id !== 'p-melvin') {
      return res.status(403).json({ error: 'Access denied: unauthorized resource access' });
    }

    next();
  });
};

// ----------------------------------------
// Players & Login Endpoints
// ----------------------------------------

app.post('/api/login', (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: 'Name and PIN are required' });
  }

  try {
    const player = db.prepare('SELECT * FROM players WHERE name = ? COLLATE NOCASE').get(name);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Verify hashed PIN
    const match = bcrypt.compareSync(pin, player.pin);
    if (!match) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    player.preferred_clubs = JSON.parse(player.preferred_clubs || '[]');
    player.peakz_rating = getPeakzRating(player.elo);
    player.peakz_rating_peak = getPeakzRating(player.elo_peak);
    
    // Generate JWT Token
    const token = jwt.sign({ id: player.id }, JWT_SECRET);
    
    return res.json({ player, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/players', (req, res) => {
  try {
    const players = db.prepare('SELECT id, name, level, position, sessions, hours, wins, games, avail_mode, city, preferred_clubs, elo, elo_peak, avatar, available_now, match_mode FROM players').all();
    players.forEach(p => {
      p.preferred_clubs = JSON.parse(p.preferred_clubs || '[]');
      p.peakz_rating = getPeakzRating(p.elo);
      p.peakz_rating_peak = getPeakzRating(p.elo_peak);
    });
    return res.json(players);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

const registerHandler = (req, res) => {
  const { name, level, position, pin } = req.body;
  if (!name || !level || !position || !pin) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if name is taken
    const existing = db.prepare('SELECT id FROM players WHERE name = ?').get(name);
    if (existing) {
      return res.status(409).json({ error: 'Player name already exists' });
    }

    const newId = 'p-' + uuidv4().slice(0, 8);
    
    // Hash PIN
    const salt = bcrypt.genSaltSync(10);
    const hashedPin = bcrypt.hashSync(pin, salt);

    // level is the selected Padel rating (e.g. 7.0)
    const ratingVal = parseInt(level) || 7;
    const dbLevel = 10 - ratingVal;
    const eloVal = 800 + 150 * dbLevel;

    db.prepare(`
      INSERT INTO players (id, name, level, position, pin, elo, elo_peak)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(newId, name, dbLevel, position, hashedPin, eloVal, eloVal);

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(newId);
    player.preferred_clubs = JSON.parse(player.preferred_clubs || '[]');
    
    // Generate JWT Token
    const token = jwt.sign({ id: player.id }, JWT_SECRET);

    return res.status(201).json({ player, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
};

app.post('/api/players', registerHandler);
app.post('/api/register', registerHandler);

// Update player profile/settings
app.put('/api/players/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, level, position, pin, city, preferred_clubs, avatar, pref_playtime, pref_court_type, match_mode } = req.body;

  if (!name || level === undefined || !pin || !city) {
    return res.status(400).json({ error: 'Name, level, pin, and city are required' });
  }

  try {
    const playerExists = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    if (!playerExists) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const nameConflict = db.prepare('SELECT id FROM players WHERE name = ? AND id != ? COLLATE NOCASE').get(name, id);
    if (nameConflict) {
      return res.status(409).json({ error: 'Player name already exists' });
    }

    const playtime = pref_playtime !== undefined ? parseInt(pref_playtime) : 90;
    const courtType = pref_court_type || 'double';
    const matchModeVal = (match_mode === 'friends' || match_mode === 'open') ? match_mode : (playerExists.match_mode || 'open');

    // Hash PIN only if it was changed to a new 4-digit code
    let savedPin = pin;
    if (pin && pin.length === 4) {
      const salt = bcrypt.genSaltSync(10);
      savedPin = bcrypt.hashSync(pin, salt);
    }

    const dbLevel = parseInt(level);
    let eloVal = playerExists.elo;
    let eloPeakVal = playerExists.elo_peak;

    // Recalculate ELO if level/rating was edited
    if (dbLevel !== playerExists.level) {
      eloVal = 800 + 150 * dbLevel;
      eloPeakVal = Math.max(eloVal, playerExists.elo_peak);
    }

    db.prepare(`
      UPDATE players
      SET name = ?, level = ?, position = ?, pin = ?, city = ?, preferred_clubs = ?, avatar = ?, pref_playtime = ?, pref_court_type = ?, elo = ?, elo_peak = ?, match_mode = ?
      WHERE id = ?
    `).run(name, dbLevel, position || playerExists.position, savedPin, city, JSON.stringify(preferred_clubs || []), avatar || 'avatar_01', playtime, courtType, eloVal, eloPeakVal, matchModeVal, id);

    const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    updatedPlayer.preferred_clubs = JSON.parse(updatedPlayer.preferred_clubs || '[]');
    updatedPlayer.peakz_rating = getPeakzRating(updatedPlayer.elo);
    updatedPlayer.peakz_rating_peak = getPeakzRating(updatedPlayer.elo_peak);
    return res.json(updatedPlayer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});


// Helper: Create notification and log in-app alert
function createNotification(playerId, message, type, linkId = null) {
  try {
    const id = 'n-' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO notifications (id, player_id, message, type, link_id, created_at, read)
      VALUES (?, ?, ?, ?, ?, datetime('now'), 0)
    `).run(id, playerId, message, type, linkId);

    const player = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
    console.log(`[IN-APP NOTIFICATION LOG] Sent to ${player?.name || playerId} [Type: ${type}]: "${message}" (Link: ${linkId})`);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// Middleware: Admin access verification
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.id !== 'p-melvin') {
    return res.status(403).json({ error: 'Access denied: admin access only' });
  }
  next();
};

// ----------------------------------------
// Friends Endpoints
// ----------------------------------------

// GET /api/friends — get your own friend list with online status
app.get('/api/friends', authenticateToken, (req, res) => {
  const playerId = req.user.id;
  try {
    const friends = db.prepare(`
      SELECT p.id, p.name, p.level, p.city, p.avatar, p.elo, p.available_now, p.match_mode,
             f.created_at
      FROM friends f
      JOIN players p ON p.id = f.friend_id
      WHERE f.player_id = ?
      ORDER BY p.name ASC
    `).all(playerId);
    friends.forEach(f => {
      f.padel_rating = (10.0 - f.level).toFixed(1);
    });
    return res.json(friends);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/friends — add a friend
app.post('/api/friends', authenticateToken, (req, res) => {
  const playerId = req.user.id;
  const { friend_id } = req.body;
  if (!friend_id) return res.status(400).json({ error: 'friend_id is required' });
  if (friend_id === playerId) return res.status(400).json({ error: 'Cannot add yourself as a friend' });

  try {
    const friend = db.prepare('SELECT id FROM players WHERE id = ?').get(friend_id);
    if (!friend) return res.status(404).json({ error: 'Player not found' });

    db.prepare('INSERT OR IGNORE INTO friends (player_id, friend_id) VALUES (?, ?)').run(playerId, friend_id);
    return res.status(201).json({ success: true, friend_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/friends/:friend_id — remove a friend
app.delete('/api/friends/:friend_id', authenticateToken, (req, res) => {
  const playerId = req.user.id;
  const { friend_id } = req.params;
  try {
    db.prepare('DELETE FROM friends WHERE player_id = ? AND friend_id = ?').run(playerId, friend_id);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/players/search?q=naam — search players to add as friend
app.get('/api/players/search', authenticateToken, (req, res) => {
  const playerId = req.user.id;
  const q = (req.query.q || '').trim();
  if (q.length < 1) return res.json([]);
  try {
    const results = db.prepare(`
      SELECT id, name, level, city, avatar, elo, available_now
      FROM players
      WHERE id != ? AND name LIKE ?
      LIMIT 15
    `).all(playerId, `%${q}%`);
    results.forEach(p => {
      p.padel_rating = (10.0 - p.level).toFixed(1);
    });
    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ----------------------------------------
// Admin Endpoints (Melvin Only)
// ----------------------------------------

// GET all players with stats and ELO
app.get('/api/admin/players', authenticateToken, requireAdmin, (req, res) => {
  try {
    const players = db.prepare('SELECT id, name, level, position, sessions, hours, wins, games, avail_mode, city, preferred_clubs, elo, elo_peak, avatar, available_now FROM players').all();
    players.forEach(p => {
      p.preferred_clubs = JSON.parse(p.preferred_clubs || '[]');
      p.peakz_rating = getPeakzRating(p.elo);
      p.peakz_rating_peak = getPeakzRating(p.elo_peak);
    });
    return res.json(players);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// CREATE a player manually
app.post('/api/admin/players', authenticateToken, requireAdmin, (req, res) => {
  const { name, level, position, pin, city, preferred_clubs } = req.body;
  if (!name || level === undefined || !position || !pin || !city) {
    return res.status(400).json({ error: 'Name, level (rating), position, pin, and city are required' });
  }

  try {
    const existing = db.prepare('SELECT id FROM players WHERE name = ? COLLATE NOCASE').get(name);
    if (existing) {
      return res.status(409).json({ error: 'Player name already exists' });
    }

    const newId = 'p-' + uuidv4().slice(0, 8);
    const salt = bcrypt.genSaltSync(10);
    const hashedPin = bcrypt.hashSync(pin, salt);

    const ratingVal = parseInt(level) || 7;
    const dbLevel = 10 - ratingVal;
    const eloVal = 800 + 150 * dbLevel;

    db.prepare(`
      INSERT INTO players (id, name, level, position, pin, city, preferred_clubs, elo, elo_peak)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, name, dbLevel, position, hashedPin, city, JSON.stringify(preferred_clubs || []), eloVal, eloVal);

    const newPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(newId);
    newPlayer.preferred_clubs = JSON.parse(newPlayer.preferred_clubs || '[]');
    newPlayer.peakz_rating = getPeakzRating(newPlayer.elo);
    newPlayer.peakz_rating_peak = getPeakzRating(newPlayer.elo_peak);

    return res.status(201).json(newPlayer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// UPDATE player details
app.put('/api/admin/players/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, level, position, city, preferred_clubs, elo, avatar, pref_playtime, pref_court_type, wins, sessions, hours, games } = req.body;

  if (!name || level === undefined || !position || !city) {
    return res.status(400).json({ error: 'Name, level, position, and city are required' });
  }

  try {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const nameConflict = db.prepare('SELECT id FROM players WHERE name = ? AND id != ? COLLATE NOCASE').get(name, id);
    if (nameConflict) {
      return res.status(409).json({ error: 'Player name already exists' });
    }

    const dbLevel = parseInt(level);
    let eloVal = elo !== undefined ? parseInt(elo) : player.elo;

    if (dbLevel !== player.level) {
      eloVal = 800 + 150 * dbLevel;
    }

    db.prepare(`
      UPDATE players
      SET name = ?, level = ?, position = ?, city = ?, preferred_clubs = ?, elo = ?, elo_peak = ?, avatar = ?, pref_playtime = ?, pref_court_type = ?, wins = ?, sessions = ?, hours = ?, games = ?
      WHERE id = ?
    `).run(
      name,
      dbLevel,
      position,
      city,
      JSON.stringify(preferred_clubs || []),
      eloVal,
      Math.max(eloVal, player.elo_peak),
      avatar || player.avatar || 'avatar_01',
      pref_playtime !== undefined ? parseInt(pref_playtime) : player.pref_playtime,
      pref_court_type || player.pref_court_type || 'double',
      wins !== undefined ? parseInt(wins) : player.wins,
      sessions !== undefined ? parseInt(sessions) : player.sessions,
      hours !== undefined ? parseInt(hours) : player.hours,
      games !== undefined ? parseInt(games) : player.games,
      id
    );

    const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    updated.preferred_clubs = JSON.parse(updated.preferred_clubs || '[]');
    updated.peakz_rating = getPeakzRating(updated.elo);
    updated.peakz_rating_peak = getPeakzRating(updated.elo_peak);
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// RESET player PIN
app.put('/api/admin/players/:id/reset-pin', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  if (!pin || pin.length !== 4) {
    return res.status(400).json({ error: 'A 4-digit PIN is required' });
  }

  try {
    const playerExists = db.prepare('SELECT id FROM players WHERE id = ?').get(id);
    if (!playerExists) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPin = bcrypt.hashSync(pin, salt);

    db.prepare('UPDATE players SET pin = ? WHERE id = ?').run(hashedPin, id);
    return res.json({ success: true, message: 'PIN reset successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// DELETE player
app.delete('/api/admin/players/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  try {
    const playerExists = db.prepare('SELECT id FROM players WHERE id = ?').get(id);
    if (!playerExists) {
      return res.status(404).json({ error: 'Player not found' });
    }

    db.prepare('DELETE FROM players WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Player deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ----------------------------------------
// Notification Endpoints
// ----------------------------------------

// GET active notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
  const playerId = req.user.id;
  try {
    const list = db.prepare(`
      SELECT * FROM notifications 
      WHERE player_id = ? 
      ORDER BY created_at DESC 
      LIMIT 30
    `).all(playerId);
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Mark all notifications as read
app.post('/api/notifications/read-all', authenticateToken, (req, res) => {
  const playerId = req.user.id;
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE player_id = ?').run(playerId);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});


// ----------------------------------------
// Availability Endpoints
// ----------------------------------------

app.get('/api/players/:id/availability', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const availability = db.prepare('SELECT day_name, start_time, end_time, duration FROM player_availability WHERE player_id = ?').all(id);
    return res.json(availability);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/players/:id/availability', authenticateToken, (req, res) => {
  const { id } = req.params;
  const slots = req.body; // Array of { day_name, start_time, end_time, duration }

  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'Availability list must be an array' });
  }

  try {
    const playerExists = db.prepare('SELECT id FROM players WHERE id = ?').get(id);
    if (!playerExists) return res.status(404).json({ error: 'Player not found' });

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM player_availability WHERE player_id = ?').run(id);
      const insert = db.prepare(`
        INSERT INTO player_availability (player_id, day_name, start_time, end_time, duration)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const slot of slots) {
        insert.run(id, slot.day_name, slot.start_time, slot.end_time, slot.duration || 90);
      }
    });

    transaction();
    return res.json({ success: true, message: 'Weekly availability updated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ----------------------------------------
// One-time (Date-specific) Availability
// ----------------------------------------

// GET all future one-time slots for a player
app.get('/api/players/:id/availability/once', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const today = new Date().toISOString().split('T')[0];
    const slots = db.prepare(
      'SELECT date, start_time, end_time, duration FROM player_availability_once WHERE player_id = ? AND date >= ? ORDER BY date, start_time'
    ).all(id, today);
    return res.json(slots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT (replace) one-time slots — client sends full list of future date slots
app.put('/api/players/:id/availability/once', authenticateToken, (req, res) => {
  const { id } = req.params;
  const slots = req.body; // Array of { date, start_time, end_time, duration }

  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'Availability list must be an array' });
  }

  try {
    const playerExists = db.prepare('SELECT id FROM players WHERE id = ?').get(id);
    if (!playerExists) return res.status(404).json({ error: 'Player not found' });

    const today = new Date().toISOString().split('T')[0];

    const transaction = db.transaction(() => {
      // Only clear future slots — never touch past records
      db.prepare('DELETE FROM player_availability_once WHERE player_id = ? AND date >= ?').run(id, today);
      const insert = db.prepare(`
        INSERT INTO player_availability_once (player_id, date, start_time, end_time, duration)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const slot of slots) {
        if (slot.date >= today) {
          insert.run(id, slot.date, slot.start_time, slot.end_time, slot.duration || 90);
        }
      }
    });

    transaction();
    return res.json({ success: true, message: 'One-time availability updated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ----------------------------------------
// Matching Algorithm & Match Setup
// ----------------------------------------

app.post('/api/matches', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // --- WEEKLY recurring slots → convert day_name to next concrete date ---
    const weeklyAvails = db.prepare(`
      SELECT a.player_id, a.day_name, NULL as date_specific, a.start_time, a.end_time,
             p.level, p.name, p.rejected_slots, p.city, p.preferred_clubs
      FROM player_availability a
      JOIN players p ON a.player_id = p.id
    `).all();

    // --- ONE-TIME date-specific slots ---
    const onceAvails = db.prepare(`
      SELECT a.player_id, NULL as day_name, a.date as date_specific, a.start_time, a.end_time,
             p.level, p.name, p.rejected_slots, p.city, p.preferred_clubs
      FROM player_availability_once a
      JOIN players p ON a.player_id = p.id
      WHERE a.date >= ?
    `).all(today);

    // Build unified slot entries — each entry has a resolved concrete date
    const buildEntry = (row, resolvedDate) => ({
      player_id: row.player_id,
      name: row.name,
      level: row.level,
      city: row.city,
      preferred_clubs: JSON.parse(row.preferred_clubs || '[]'),
      rejected_slots: JSON.parse(row.rejected_slots || '[]'),
      start_time: row.start_time,
      end_time: row.end_time,
      resolved_date: resolvedDate
    });

    const allEntries = [];

    for (const row of weeklyAvails) {
      const resolvedDate = getNextDateForDay(row.day_name);
      allEntries.push(buildEntry(row, resolvedDate));
    }
    for (const row of onceAvails) {
      allEntries.push(buildEntry(row, row.date_specific));
    }

    // Group by city|date|start_time|end_time — deduplicate same player in same slot
    const slotsMap = {};
    const seenPlayerSlot = new Set(); // prevent double-counting if weekly AND once overlap
    for (const entry of allEntries) {
      const slotKey = `${entry.city}|${entry.resolved_date}|${entry.start_time}|${entry.end_time}`;
      const playerSlotKey = `${entry.player_id}|${slotKey}`;
      if (seenPlayerSlot.has(playerSlotKey)) continue;
      seenPlayerSlot.add(playerSlotKey);

      if (!slotsMap[slotKey]) {
        slotsMap[slotKey] = {
          city: entry.city,
          resolved_date: entry.resolved_date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          players: []
        };
      }
      slotsMap[slotKey].players.push(entry);
    }

    // 2. Find slots that have at least 4 available players
    let proposedMatch = null;

    for (const key of Object.keys(slotsMap)) {
      const slot = slotsMap[key];
      if (slot.players.length >= 4) {
        const nextDate = slot.resolved_date; // already a concrete YYYY-MM-DD date

        // Filter out players who previously rejected this exact date + time slot
        const eligiblePlayers = slot.players.filter(player => {
          const rejectedBefore = player.rejected_slots.some(
            rejected => rejected.date === nextDate && rejected.start === slot.start_time
          );
          return !rejectedBefore;
        });

        if (eligiblePlayers.length >= 4) {
          const duplicate = db.prepare(`
            SELECT id FROM matches
            WHERE date = ? AND start = ? AND status NOT IN ('cancelled', 'completed')
          `).get(nextDate, slot.start_time);

          if (duplicate) continue;

          eligiblePlayers.sort((a, b) => a.level - b.level);
          const selected = eligiblePlayers.slice(0, 4);

          // Team balancing: P0+P3 vs P1+P2 (equal average level)
          const team1 = [selected[0], selected[3]];
          const team2 = [selected[1], selected[2]];

          const matchId = 'm-' + uuidv4().slice(0, 8);
          const initialResponses = {};
          selected.forEach(p => { initialResponses[p.player_id] = 'pending'; });

          const proposedTeams = {
            team1: team1.map(p => p.player_id),
            team2: team2.map(p => p.player_id)
          };

          const commonClub = findCommonClub(slot.city, selected);
          const matchType = req.body?.match_type === 'ranked' ? 'ranked' : 'friendly';

          const insertMatch = db.prepare(`
            INSERT INTO matches (id, status, responses, date, start, end, proposed_teams, match_type, location)
            VALUES (?, 'proposed', ?, ?, ?, ?, ?, ?, ?)
          `);
          const insertMatchPlayer = db.prepare(`
            INSERT INTO match_players (match_id, player_id, team_number)
            VALUES (?, ?, ?)
          `);

          const transaction = db.transaction(() => {
            insertMatch.run(
              matchId,
              JSON.stringify(initialResponses),
              nextDate,
              slot.start_time,
              slot.end_time,
              JSON.stringify(proposedTeams),
              matchType,
              commonClub
            );
            team1.forEach(p => insertMatchPlayer.run(matchId, p.player_id, 1));
            team2.forEach(p => insertMatchPlayer.run(matchId, p.player_id, 2));
          });

          transaction();

          // Create notifications for the 4 players
          selected.forEach(p => {
            createNotification(
              p.player_id,
              `Nieuw wedstrijdvoorstel op ${nextDate} van ${slot.start_time} tot ${slot.end_time} bij ${commonClub.replace("Peakz Padel ", "Padel Club ")}!`,
              'proposal',
              matchId
            );
          });

          proposedMatch = {
            id: matchId,
            date: nextDate,
            start: slot.start_time,
            end: slot.end_time,
            location: commonClub,
            match_type: matchType,
            players: selected.map(p => ({ id: p.player_id, name: p.name, level: p.level })),
            proposed_teams: proposedTeams
          };
          break;
        }
      }
    }

    if (proposedMatch) {
      return res.status(201).json(proposedMatch);
    } else {
      return res.status(200).json({ message: 'No matching availability slots found at this time' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Get active proposed/confirmed/booked matches for a player
app.get('/api/matches/active', authenticateToken, (req, res) => {
  const { playerId } = req.query;
  if (!playerId) {
    return res.status(400).json({ error: 'playerId query param is required' });
  }

  try {
    const rawMatches = db.prepare(`
      SELECT m.* 
      FROM matches m
      JOIN match_players mp ON m.id = mp.match_id
      WHERE mp.player_id = ? AND m.status IN ('proposed', 'confirmed', 'booked')
      ORDER BY m.date ASC, m.start ASC
    `).all(playerId);

    const matches = rawMatches.map(m => {
      const players = db.prepare(`
        SELECT p.id, p.name, p.level, mp.team_number
        FROM match_players mp
        JOIN players p ON mp.player_id = p.id
        WHERE mp.match_id = ?
      `).all(m.id);

      // Resolve booker name from booking_claimed_by
      let bookerName = null;
      if (m.booking_claimed_by) {
        const booker = db.prepare('SELECT name FROM players WHERE id = ?').get(m.booking_claimed_by);
        bookerName = booker?.name || null;
      }

      return {
        ...m,
        responses: JSON.parse(m.responses),
        proposed_teams: JSON.parse(m.proposed_teams),
        score: m.score ? JSON.parse(m.score) : null,
        booker_name: bookerName,
        players
      };
    });

    return res.json(matches);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Vote response on match
app.post('/api/matches/:id/respond', (req, res) => {
  const { id } = req.params;
  const { playerId, response } = req.body; // response: 'accepted' or 'rejected'

  if (!playerId || !['accepted', 'rejected'].includes(response)) {
    return res.status(400).json({ error: 'playerId and valid response (accepted/rejected) are required' });
  }

  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'proposed') {
      return res.status(400).json({ error: 'Match is already finalized or cancelled' });
    }

    const responses = JSON.parse(match.responses);
    if (responses[playerId] === undefined) {
      return res.status(403).json({ error: 'Player is not part of this proposed match' });
    }

    responses[playerId] = response;

    let newStatus = 'proposed';

    if (response === 'rejected') {
      newStatus = 'cancelled';
      
      // Save this date/time in the player's rejected_slots
      const player = db.prepare('SELECT rejected_slots FROM players WHERE id = ?').get(playerId);
      const rejectedList = JSON.parse(player.rejected_slots || '[]');
      rejectedList.push({ date: match.date, start: match.start });
      db.prepare('UPDATE players SET rejected_slots = ? WHERE id = ?').run(
        JSON.stringify(rejectedList),
        playerId
      );
    } else {
      // Check if all players have accepted
      const allAccepted = Object.values(responses).every(resp => resp === 'accepted');
      if (allAccepted) {
        newStatus = 'confirmed';
        // No automatic booker assignment — booker race starts now
        // All 4 players will see the "I'll Book the Court!" button

        // Create a Session log
        const sessionId = 's-' + uuidv4().slice(0, 8);
        const playerIds = Object.keys(responses);
        db.prepare(`
          INSERT INTO sessions (id, date, players, match_id)
          VALUES (?, ?, ?, ?)
        `).run(sessionId, match.date, playerIds.join(','), id);
      }
    }

    db.prepare(`
      UPDATE matches
      SET status = ?, responses = ?
      WHERE id = ?
    `).run(newStatus, JSON.stringify(responses), id);

    // Fetch all participants to send notifications
    try {
      const participants = db.prepare('SELECT player_id FROM match_players WHERE match_id = ?').all(id).map(p => p.player_id);
      
      if (newStatus === 'cancelled') {
        const rejectingPlayer = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
        participants.forEach(pId => {
          if (pId !== playerId) {
            createNotification(
              pId,
              `Matchvoorstel voor ${match.date} ${match.start} is geannuleerd omdat ${rejectingPlayer?.name || 'een speler'} heeft geweigerd.`,
              'cancelled',
              id
            );
          }
        });
      } else if (newStatus === 'confirmed') {
        participants.forEach(pId => {
          createNotification(
            pId,
            `Iedereen heeft geaccepteerd! De wedstrijd op ${match.date} ${match.start} is bevestigd. Wie boekt de baan?`,
            'confirmed',
            id
          );
        });
      }
    } catch (notifErr) {
      console.error('Failed to notify players on match response:', notifErr);
    }

    return res.json({
      success: true,
      status: newStatus,
      responses
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Update match booking and Tikkie URL by designated booker
app.post('/api/matches/:id/booking', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { bookingUrl, tikkieUrl, playerId } = req.body;

  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }

  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    if (match.booking_claimed_by !== playerId) {
      return res.status(403).json({ error: 'Only the court claimer can update booking details' });
    }

    db.prepare('UPDATE matches SET booking_url = ?, tikkie_url = ? WHERE id = ?')
      .run(bookingUrl || null, tikkieUrl || null, id);

    return res.json({ success: true, booking_url: bookingUrl, tikkie_url: tikkieUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ----------------------------------------
// Booker Race Endpoints
// ----------------------------------------

// Step 1: Claim the booking role (first player to tap wins)
app.post('/api/matches/:id/claim-booking', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { player_id } = req.body;

  if (!player_id) {
    return res.status(400).json({ error: 'player_id is required' });
  }

  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'confirmed') return res.status(400).json({ error: 'Match is not in confirmed state' });

    // Atomic race: only sets if booking_claimed_by IS NULL
    const result = db.prepare(
      'UPDATE matches SET booking_claimed_by = ? WHERE id = ? AND booking_claimed_by IS NULL'
    ).run(player_id, id);

    if (result.changes > 0) {
      // This player won the race
      const player = db.prepare('SELECT name FROM players WHERE id = ?').get(player_id);
      
      // Notify other participants
      try {
        const participants = db.prepare('SELECT player_id FROM match_players WHERE match_id = ?').all(id).map(p => p.player_id);
        participants.forEach(pId => {
          if (pId !== player_id) {
            createNotification(
              pId,
              `${player?.name} gaat de baan boeken voor de wedstrijd op ${match.date} om ${match.start}.`,
              'claimed',
              id
            );
          }
        });
      } catch (notifErr) {
        console.error('Failed to notify players on booking claim:', notifErr);
      }

      return res.json({ success: true, booker_id: player_id, booker_name: player?.name });
    } else {
      // Someone else already claimed it
      const existingMatch = db.prepare('SELECT booking_claimed_by FROM matches WHERE id = ?').get(id);
      const booker = db.prepare('SELECT name FROM players WHERE id = ?').get(existingMatch.booking_claimed_by);
      return res.json({ success: false, booker_id: existingMatch.booking_claimed_by, booker_name: booker?.name, message: 'Already claimed' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Step 2: Booker confirms the court is booked (notifies all players)
app.post('/api/matches/:id/confirm-booked', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { player_id, booking_url, tikkie_url } = req.body;

  if (!player_id) {
    return res.status(400).json({ error: 'player_id is required' });
  }

  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.booking_claimed_by !== player_id) {
      return res.status(403).json({ error: 'Only the claimer can confirm the booking' });
    }

    // Transition status to 'booked' — all clients polling will see this
    db.prepare(
      "UPDATE matches SET status = 'booked', booking_url = ?, tikkie_url = ? WHERE id = ?"
    ).run(booking_url || null, tikkie_url || null, id);

    const booker = db.prepare('SELECT name FROM players WHERE id = ?').get(player_id);

    // Notify other participants
    try {
      const participants = db.prepare('SELECT player_id FROM match_players WHERE match_id = ?').all(id).map(p => p.player_id);
      participants.forEach(pId => {
        if (pId !== player_id) {
          createNotification(
            pId,
            `${booker?.name} heeft de baan geboekt voor ${match.date} ${match.start}! Bekijk de reservering en betaallink in de app.`,
            'booked',
            id
          );
        }
      });
    } catch (notifErr) {
      console.error('Failed to notify players on booking confirmation:', notifErr);
    }

    return res.json({
      success: true,
      status: 'booked',
      booker_name: booker?.name,
      booking_url: booking_url || null,
      tikkie_url: tikkie_url || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ----------------------------------------
// Scoring & Leaderboard Endpoints
// ----------------------------------------

// Submit match scores
app.post('/api/matches/:id/score', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { score, submitted_by } = req.body; 
  // score expected format: { sets: [[6,4], [4,6], [10,7]], team1_games: 2, team2_games: 1 }

  if (!score || !submitted_by) {
    return res.status(400).json({ error: 'Score details and submitted_by are required' });
  }

  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'confirmed') {
      return res.status(400).json({ error: 'Scores can only be submitted for confirmed matches' });
    }

    const proposedTeams = JSON.parse(match.proposed_teams);
    const allPlayers = [...proposedTeams.team1, ...proposedTeams.team2];
    if (!allPlayers.includes(submitted_by)) {
      return res.status(403).json({ error: 'Submitter must be one of the match players' });
    }

    // Determine who needs to verify: any player from the OPPOSING team
    const submitterTeam = proposedTeams.team1.includes(submitted_by) ? 1 : 2;
    const opponentTeamPlayers = submitterTeam === 1 ? proposedTeams.team2 : proposedTeams.team1;

    const scoreData = {
      ...score,
      status: 'pending',
      submitted_by,
      verify_by: opponentTeamPlayers // opponents who can verify the score
    };

    db.prepare('UPDATE matches SET score = ? WHERE id = ?').run(
      JSON.stringify(scoreData),
      id
    );

    // Notify opponents who need to verify
    try {
      const submitter = db.prepare('SELECT name FROM players WHERE id = ?').get(submitted_by);
      opponentTeamPlayers.forEach(pId => {
        createNotification(
          pId,
          `${submitter?.name} heeft de stand ingevoerd voor de wedstrijd op ${match.date}. Gelieve deze te bevestigen.`,
          'score_pending',
          id
        );
      });
    } catch (notifErr) {
      console.error('Failed to notify opponents on score submission:', notifErr);
    }

    return res.json({ success: true, message: 'Score submitted. Awaiting opponent verification.', score: scoreData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Verify scores
app.post('/api/matches/:id/verify', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { playerId, approved } = req.body;

  if (!playerId || approved === undefined) {
    return res.status(400).json({ error: 'playerId and approved (boolean) are required' });
  }

  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.score) {
      return res.status(400).json({ error: 'No score submitted for this match yet' });
    }

    const scoreData = JSON.parse(match.score);
    if (scoreData.status !== 'pending') {
      return res.status(400).json({ error: 'Score is already verified or rejected' });
    }

    if (!scoreData.verify_by.includes(playerId)) {
      return res.status(403).json({ error: 'You are not authorized to verify this score' });
    }

    if (approved) {
      scoreData.status = 'confirmed';
      const proposedTeams = JSON.parse(match.proposed_teams);
      const team1 = proposedTeams.team1;
      const team2 = proposedTeams.team2;

      // Determine winning team
      const team1Sets = scoreData.team1_games;
      const team2Sets = scoreData.team2_games;
      const t1Won = team1Sets > team2Sets;

      const transaction = db.transaction(() => {
        // Mark score as confirmed and match as completed
        db.prepare("UPDATE matches SET score = ?, status = 'completed' WHERE id = ?").run(
          JSON.stringify(scoreData), id
        );

        // --- ELO calculation (K=32, team ELO = average of pair) ---
        const K = 32;
        const eloCalc = (playerElos, opponentElos, isWin) => {
          const myAvg  = playerElos.reduce((a,b) => a+b, 0) / playerElos.length;
          const oppAvg = opponentElos.reduce((a,b) => a+b, 0) / opponentElos.length;
          const expected = 1 / (1 + Math.pow(10, (oppAvg - myAvg) / 400));
          const delta = Math.round(K * ((isWin ? 1 : 0) - expected));
          return delta;
        };

        const getElo = (pId) => db.prepare('SELECT elo FROM players WHERE id = ?').get(pId)?.elo || 1200;
        const team1Elos = team1.map(getElo);
        const team2Elos = team2.map(getElo);

        const delta1 = eloCalc(team1Elos, team2Elos, t1Won);
        const delta2 = eloCalc(team2Elos, team1Elos, !t1Won);

        // --- Idempotent stats + ELO updates ---
        const incrementStat = db.prepare(`
          INSERT INTO player_match_stats (player_id, match_id, wins_incremented, losses_incremented)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(player_id, match_id) DO NOTHING
        `);

        const updatePlayerStats = (pId, isWin, eloDelta) => {
          const statsCheck = db.prepare(`SELECT * FROM player_match_stats WHERE player_id = ? AND match_id = ?`).get(pId, id);
          if (!statsCheck) {
            incrementStat.run(pId, id, isWin ? 1 : 0, isWin ? 0 : 1);
            if (isWin) {
              db.prepare('UPDATE players SET wins = wins + 1, sessions = sessions + 1 WHERE id = ?').run(pId);
            } else {
              db.prepare('UPDATE players SET sessions = sessions + 1 WHERE id = ?').run(pId);
            }
            // Apply ELO delta, clamp at 100 floor, update peak
            db.prepare(`
              UPDATE players
              SET elo = MAX(100, elo + ?),
                  elo_peak = MAX(elo_peak, MAX(100, elo + ?))
              WHERE id = ?
            `).run(eloDelta, eloDelta, pId);

            // Update season stats
            const season = db.prepare(`SELECT id FROM seasons WHERE is_active = 1 LIMIT 1`).get();
            if (season) {
              const newElo = Math.max(100, (db.prepare('SELECT elo FROM players WHERE id = ?').get(pId)?.elo || 1200));
              db.prepare(`
                INSERT INTO player_season_stats (season_id, player_id, elo_start, elo_peak, elo_current, games_played, wins)
                VALUES (?, ?, ?, ?, ?, 1, ?)
                ON CONFLICT(season_id, player_id) DO UPDATE SET
                  elo_peak = MAX(elo_peak, ?),
                  elo_current = ?,
                  games_played = games_played + 1,
                  wins = wins + ?
              `).run(season.id, pId, newElo, newElo, newElo, isWin ? 1 : 0, newElo, newElo, isWin ? 1 : 0);
            }
          }
        };

        team1.forEach(pId => updatePlayerStats(pId, t1Won,  delta1));
        team2.forEach(pId => updatePlayerStats(pId, !t1Won, delta2));

        // --- Badge engine ---
        const awardBadgeIfNew = (pId, badgeId) => {
          const exists = db.prepare('SELECT id FROM badges WHERE player_id = ? AND badge_id = ?').get(pId, badgeId);
          if (!exists) {
            db.prepare('INSERT INTO badges (id, player_id, badge_id) VALUES (?, ?, ?)').run(`b-${uuidv4().slice(0,8)}`, pId, badgeId);
          }
        };

        const allMatchPlayers = [...team1, ...team2];
        allMatchPlayers.forEach(pId => {
          const p = db.prepare('SELECT * FROM players WHERE id = ?').get(pId);
          if (!p) return;
          const isWin = t1Won ? team1.includes(pId) : team2.includes(pId);

          // First win
          if (isWin && p.wins === 1) awardBadgeIfNew(pId, 'first_blood');
          // Milestones
          if (p.wins >= 10) awardBadgeIfNew(pId, 'machine');
          if (p.wins >= 25) awardBadgeIfNew(pId, 'legend');
          // Session addict
          if (p.sessions >= 20) awardBadgeIfNew(pId, 'padel_addict');
          // All-time ELO high (peak was just updated)
          if (p.elo >= p.elo_peak) awardBadgeIfNew(pId, 'all_time_high');
          // Clutch — win from a set down
          try {
            const sets = scoreData.sets || [];
            if (sets.length >= 2 && isWin) {
              const myTeamIdx = team1.includes(pId) ? 0 : 1;
              const firstSetLost = sets[0] ? sets[0][myTeamIdx] < sets[0][1 - myTeamIdx] : false;
              if (firstSetLost) awardBadgeIfNew(pId, 'clutch');
            }
          } catch(_) {}
          // Hat trick — check last 3 matches are wins
          const lastThree = db.prepare(`
            SELECT pms.wins_incremented FROM player_match_stats pms
            JOIN matches m ON pms.match_id = m.id
            WHERE pms.player_id = ? AND m.status = 'completed'
            ORDER BY m.date DESC LIMIT 3
          `).all(pId);
          if (lastThree.length === 3 && lastThree.every(r => r.wins_incremented === 1)) {
            awardBadgeIfNew(pId, 'hat_trick');
          }
          // Season climber (+100 ELO delta in current season)
          const season = db.prepare(`SELECT id FROM seasons WHERE is_active = 1 LIMIT 1`).get();
          if (season) {
            const ss = db.prepare('SELECT elo_start, elo_current FROM player_season_stats WHERE season_id = ? AND player_id = ?').get(season.id, pId);
            if (ss && (ss.elo_current - ss.elo_start) >= 100) awardBadgeIfNew(pId, 'climber');
          }
        });
      });

      transaction();

      // Notify all participants about score confirmation
      try {
        const verifier = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
        allMatchPlayers.forEach(pId => {
          createNotification(
            pId,
            `De uitslag van de wedstrijd op ${match.date} is goedgekeurd door ${verifier?.name}. Je rating is bijgewerkt!`,
            'score_confirmed',
            id
          );
        });
      } catch (notifErr) {
        console.error('Failed to notify players on score confirmation:', notifErr);
      }

      return res.json({ success: true, message: 'Score verified and rankings updated successfully', scoreStatus: 'confirmed' });
    } else {
      // Score rejected: reset it so it can be submitted again
      db.prepare('UPDATE matches SET score = NULL WHERE id = ?').run(id);

      // Notify all participants about score rejection
      try {
        const proposedTeams = JSON.parse(match.proposed_teams);
        const allPlayers = [...proposedTeams.team1, ...proposedTeams.team2];
        const verifier = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
        allPlayers.forEach(pId => {
          createNotification(
            pId,
            `De uitslag van de wedstrijd op ${match.date} is afgewezen door ${verifier?.name}. Gelieve de juiste stand opnieuw in te voeren.`,
            'score_rejected',
            id
          );
        });
      } catch (notifErr) {
        console.error('Failed to notify players on score rejection:', notifErr);
      }

      return res.json({ success: true, message: 'Score rejected. Re-submission required.', scoreStatus: 'rejected' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Dynamic Rankings Leaderboard (ELO-based)
app.get('/api/rankings', (req, res) => {
  try {
    const activeSeason = db.prepare('SELECT id FROM seasons WHERE is_active = 1 LIMIT 1').get();
    const seasonId = activeSeason ? activeSeason.id : null;

    const players = db.prepare(`
      SELECT p.*, 
             ss.elo_start, 
             ss.elo_current, 
             ss.elo_peak as season_elo_peak,
             ss.wins as season_wins,
             ss.games_played as season_games
      FROM players p
      LEFT JOIN player_season_stats ss ON p.id = ss.player_id AND ss.season_id = ?
    `).all(seasonId);
    
    const sortedBySeasonElo = [...players].sort((a, b) => {
      const aSeasonElo = a.elo_current !== null && a.elo_current !== undefined ? a.elo_current : a.elo;
      const bSeasonElo = b.elo_current !== null && b.elo_current !== undefined ? b.elo_current : b.elo;
      return bSeasonElo - aSeasonElo;
    });

    const rankings = players.map(p => {
      const wins = p.wins || 0;
      const sessions = p.sessions || 0;
      const losses = Math.max(0, sessions - wins);
      const winrate = sessions > 0 ? (wins / sessions) : 0;
      
      const sRank = sortedBySeasonElo.findIndex(sp => sp.id === p.id) + 1;
      const climberDelta = p.elo_current !== null && p.elo_start !== null ? (p.elo_current - p.elo_start) : 0;

      return {
        id: p.id,
        name: p.name,
        level: p.level,
        position: p.position,
        sessions,
        wins,
        losses,
        winrate: Math.round(winrate * 100),
        elo: p.elo,
        elo_peak: p.elo_peak,
        peakz_rating: getPeakzRating(p.elo),
        peakz_rating_peak: getPeakzRating(p.elo_peak),
        avatar: p.avatar,
        season_rank: sRank,
        climber_delta: climberDelta
      };
    });

    // Sort by ELO descending
    rankings.sort((a, b) => b.elo - a.elo);
    return res.json(rankings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// GET badges earned by a player
app.get('/api/players/:id/badges', (req, res) => {
  const { id } = req.params;
  try {
    const badges = db.prepare('SELECT badge_id, earned_at FROM badges WHERE player_id = ? ORDER BY earned_at DESC').all(id);
    return res.json(badges);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// GET current season details, stats leaderboard, and biggest climber
app.get('/api/seasons/current', (req, res) => {
  try {
    const activeSeason = db.prepare('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1').get();
    if (!activeSeason) {
      return res.status(404).json({ error: 'No active season found' });
    }
    
    const stats = db.prepare(`
      SELECT ss.*, p.name, p.avatar, p.elo as overall_elo
      FROM player_season_stats ss
      JOIN players p ON ss.player_id = p.id
      WHERE ss.season_id = ?
      ORDER BY ss.elo_current DESC
    `).all(activeSeason.id);

    const leaderboard = stats.map((s, idx) => ({
      rank: idx + 1,
      player_id: s.player_id,
      name: s.name,
      avatar: s.avatar,
      elo_start: s.elo_start,
      elo_current: s.elo_current,
      elo_peak: s.elo_peak,
      games_played: s.games_played,
      wins: s.wins,
      climber_delta: s.elo_current - s.elo_start,
      peakz_rating_start: getPeakzRating(s.elo_start),
      peakz_rating_current: getPeakzRating(s.elo_current),
      peakz_rating_peak: getPeakzRating(s.elo_peak),
      peakz_rating_climber_delta: parseFloat(((s.elo_current - s.elo_start) / 150.0).toFixed(1))
    }));

    let biggestClimber = null;
    if (leaderboard.length > 0) {
      const sortedByClimb = [...leaderboard].sort((a, b) => b.climber_delta - a.climber_delta);
      if (sortedByClimb[0].climber_delta > 0) {
        biggestClimber = sortedByClimb[0];
      }
    }

    return res.json({
      season: activeSeason,
      leaderboard,
      biggest_climber: biggestClimber
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST toggle available now status for urgent matching
app.post('/api/players/:id/available-now', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { available } = req.body; // boolean
  
  if (available === undefined) {
    return res.status(400).json({ error: 'available boolean is required' });
  }

  try {
    db.prepare('UPDATE players SET available_now = ? WHERE id = ?').run(available ? 1 : 0, id);
    return res.json({ success: true, player_id: id, available_now: available });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST trigger urgent match matching (Play Within The Hour)
app.post('/api/matches/urgent', authenticateToken, (req, res) => {
  const { player_id } = req.body;
  if (!player_id) {
    return res.status(400).json({ error: 'player_id is required' });
  }

  try {
    const requester = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
    if (!requester) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Set requester as available_now
    db.prepare('UPDATE players SET available_now = 1 WHERE id = ?').run(player_id);

    // force_open allows overriding friends mode for a single request
    const forceOpen = req.body.force_open === true;
    const matchMode = forceOpen ? 'open' : (requester.match_mode || 'open');

    let availableOthers = [];

    if (matchMode === 'friends') {
      // --- FRIENDS MODE: only match with friends who are live ---
      const friendIds = db.prepare('SELECT friend_id FROM friends WHERE player_id = ?')
        .all(player_id)
        .map(r => r.friend_id);

      if (friendIds.length > 0) {
        const placeholders = friendIds.map(() => '?').join(',');
        availableOthers = db.prepare(`
          SELECT * FROM players
          WHERE available_now = 1
            AND id IN (${placeholders})
        `).all(...friendIds);
      }

      if (availableOthers.length < 3) {
        const liveFriendCount = availableOthers.length;
        return res.status(200).json({
          success: false,
          status: 'no_friends_available',
          live_friend_count: liveFriendCount,
          message: `Slechts ${liveFriendCount} vriend(en) live. Minimaal 3 vrienden nodig voor een vrienden-match.`
        });
      }

    } else {
      // --- OPEN MODE: find anyone available at similar level, same city first ---
      const sameCityOthers = db.prepare(`
        SELECT * FROM players
        WHERE available_now = 1 AND id != ? AND city = ? AND ABS(level - ?) <= 3
      `).all(player_id, requester.city, requester.level);

      if (sameCityOthers.length >= 3) {
        availableOthers = sameCityOthers;
      } else {
        // Fallback: any city, wider level range
        availableOthers = db.prepare(`
          SELECT * FROM players
          WHERE available_now = 1 AND id != ? AND ABS(level - ?) <= 5
        `).all(player_id, requester.level);
      }
    }

    if (availableOthers.length >= 3) {
      // Sort to get players closest in level
      availableOthers.sort((a, b) => Math.abs(a.level - requester.level) - Math.abs(b.level - requester.level));
      const selected = [requester, ...availableOthers.slice(0, 3)];

      // Sort by ELO to balance teams
      selected.sort((a, b) => a.elo - b.elo);
      const team1 = [selected[0], selected[3]];
      const team2 = [selected[1], selected[2]];

      const matchId = 'm-' + uuidv4().slice(0, 8);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      
      const startTimeDate = new Date(now.getTime() + 10 * 60 * 1000);
      const startStr = startTimeDate.toTimeString().split(' ')[0].slice(0, 5);
      const endTimeDate = new Date(startTimeDate.getTime() + 90 * 60 * 1000);
      const endStr = endTimeDate.toTimeString().split(' ')[0].slice(0, 5);

      const initialResponses = {};
      selected.forEach(p => {
        initialResponses[p.id] = p.id === player_id ? 'accepted' : 'pending';
      });

      const proposedTeams = {
        team1: team1.map(p => p.id),
        team2: team2.map(p => p.id)
      };

      const commonClub = findCommonClub(requester.city, selected.map(p => ({
        preferred_clubs: JSON.parse(p.preferred_clubs || '[]')
      })));

      const insertMatch = db.prepare(`
        INSERT INTO matches (id, status, responses, date, start, end, proposed_teams, match_type, location)
        VALUES (?, 'proposed', ?, ?, ?, ?, ?, 'friendly', ?)
      `);
      const insertMatchPlayer = db.prepare(`
        INSERT INTO match_players (match_id, player_id, team_number)
        VALUES (?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        insertMatch.run(
          matchId,
          JSON.stringify(initialResponses),
          dateStr,
          startStr,
          endStr,
          JSON.stringify(proposedTeams),
          commonClub
        );
        team1.forEach(p => insertMatchPlayer.run(matchId, p.id, 1));
        team2.forEach(p => insertMatchPlayer.run(matchId, p.id, 2));

        // Reset available_now for the matched players
        selected.forEach(p => {
          db.prepare('UPDATE players SET available_now = 0 WHERE id = ?').run(p.id);
        });
      });

      transaction();

      // Notify the matched players
      const modeLabel = matchMode === 'friends' ? 'Vrienden' : 'Open';
      try {
        selected.forEach(p => {
          createNotification(
            p.id,
            `${modeLabel} Match gevonden! Vandaag ${startStr}–${endStr} bij ${commonClub.replace('Peakz Padel ', '')}. Accepteer of weiger.`,
            'proposal',
            matchId
          );
        });
      } catch (notifErr) {
        console.error('Failed to notify players on urgent match:', notifErr);
      }

      return res.status(201).json({
        success: true,
        match_mode: matchMode,
        match: {
          id: matchId,
          date: dateStr,
          start: startStr,
          end: endStr,
          location: commonClub,
          match_type: 'friendly',
          players: selected.map(p => ({ id: p.id, name: p.name, level: p.level })),
          proposed_teams: proposedTeams
        }
      });
    } else {
      return res.status(200).json({
        success: false,
        status: 'searching',
        match_mode: matchMode,
        message: 'Zoeken naar spelers... Je bent live gezet.'
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// GET weather proxy for outdoor courts
app.get('/api/weather', async (req, res) => {
  const { club, date } = req.query;
  if (!club || !date) {
    return res.status(400).json({ error: 'club and date query params are required' });
  }

  let coords = { lat: 53.2194, lon: 6.5665 }; // Default to Suikerterrein
  const clubLower = club.toLowerCase();
  if (clubLower.includes('atoomweg')) {
    coords = { lat: 53.2278, lon: 6.5397 };
  } else if (clubLower.includes('euroborg')) {
    coords = { lat: 53.2011, lon: 6.5829 };
  } else if (clubLower.includes('suikerterrein')) {
    coords = { lat: 53.2194, lon: 6.5665 };
  }

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,wind_speed_10m,weather_code`);
    if (!response.ok) {
      throw new Error('Open-Meteo API returned error');
    }
    const data = await response.json();
    
    const hourly = data.hourly;
    let totalTemp = 0;
    let totalWind = 0;
    let maxWeatherCode = 0;
    let count = 0;

    for (let i = 0; i < hourly.time.length; i++) {
      if (hourly.time[i].startsWith(date)) {
        const hourStr = hourly.time[i].split('T')[1];
        const hourVal = parseInt(hourStr.split(':')[0]);
        if (hourVal >= 17 && hourVal <= 22) {
          totalTemp += hourly.temperature_2m[i];
          totalWind += hourly.wind_speed_10m[i];
          maxWeatherCode = Math.max(maxWeatherCode, hourly.weather_code[i]);
          count++;
        }
      }
    }

    let temp = 15;
    let wind = 15;
    let weatherCode = 0;

    if (count > 0) {
      temp = Math.round(totalTemp / count);
      wind = Math.round(totalWind / count);
      weatherCode = maxWeatherCode;
    } else {
      const seed = date.split('-').reduce((acc, val) => acc + parseInt(val), 0);
      temp = 10 + (seed % 15);
      wind = 5 + (seed % 25);
      weatherCode = seed % 3 === 0 ? 51 : 3;
    }

    const isPlayable = temp > 8 && wind < 40 && weatherCode < 50;

    return res.json({
      club,
      date,
      temperature: temp,
      wind_speed: wind,
      weather_code: weatherCode,
      is_playable: isPlayable
    });
  } catch (err) {
    console.error('Weather error:', err);
    return res.json({
      club,
      date,
      temperature: 12,
      wind_speed: 15,
      weather_code: 3,
      is_playable: true,
      mocked: true
    });
  }
});

// In-memory cache for weather info to avoid hitting Open-Meteo rate limits
const weatherCache = {}; // key: "lat_lon_date" -> { data: weatherInfo, expiry: timestamp }

// Peakz Courts Finder
app.get('/api/courts', async (req, res) => {
  const { date, city, playtime: reqPlaytime, court_type: reqCourtType } = req.query; // YYYY-MM-DD
  if (!date) {
    return res.status(400).json({ error: 'date query param is required' });
  }

  // Get current date and time in Dutch timezone (where courts are located)
  const tzOptions = { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const formatter = new Intl.DateTimeFormat('sv-SE', tzOptions);
  const [todayStr, currentTimeStr] = formatter.format(new Date()).split(' ');
  const [currentHour, currentMin] = currentTimeStr.split(':').map(Number);

  const playtime = reqPlaytime ? parseInt(reqPlaytime) : 90;
  const court_type = reqCourtType || 'double';

  // Helper to calculate price based on time, playtime, and court type
  const getPeakzCourtPrice = (timeSlot, pTime, cType) => {
    const [hourStr, minStr] = timeSlot.split(':');
    const hour = parseInt(hourStr) + parseInt(minStr) / 60;
    
    const isPeak = hour >= 17 && hour <= 20.5;
    const isLateTransition = hour > 20.5;
    const isEarlyTransition = hour >= 15.5 && hour < 17;
    
    if (cType === 'single') {
      let ratePerHour = 18;
      if (isPeak) {
        ratePerHour = 26;
      } else if (isEarlyTransition) {
        ratePerHour = 22;
      } else if (isLateTransition) {
        ratePerHour = 20;
      }
      const rawPrice = ratePerHour * (pTime / 60);
      return `€${rawPrice.toFixed(2).replace('.', ',')}`;
    } else {
      if (pTime === 90) {
        if (isPeak) return '€57,00';
        if (timeSlot === '21:00') return '€50,50';
        if (timeSlot === '21:30') return '€44,00';
        if (timeSlot === '16:00') return '€47,00';
        if (timeSlot === '16:30') return '€53,50';
        if (timeSlot === '15:30') return '€40,50';
        return '€37,50';
      } else if (pTime === 60) {
        if (isPeak) return '€38,00';
        if (timeSlot === '21:00') return '€34,00';
        if (timeSlot === '21:30') return '€30,00';
        return '€25,00';
      } else {
        if (isPeak) return '€76,00';
        if (timeSlot === '21:00') return '€68,00';
        if (timeSlot === '21:30') return '€60,00';
        return '€50,00';
      }
    }
  };

  const selectedCity = city || 'Groningen';
  const locations = CITIES_CLUBS[selectedCity] || ['Peakz Court'];
  const times = ['17:00', '18:30', '19:30', '20:00', '21:00', '21:30'];
  
  const results = [];
  for (const loc of locations) {
    let isOutdoor = false;
    if (loc === 'Suikerterrein' || loc === 'Sloterdijk' || loc === 'Kauwgomballenkwartier' || loc === 'Olympiaplein' || loc === 'Malkenschoten' || loc === 'High Tech Campus') {
      isOutdoor = true;
    }
    let weatherInfo = null;

    if (isOutdoor) {
      let coords = { lat: 53.2194, lon: 6.5665 };
      if (loc === 'Atoomweg') coords = { lat: 53.2278, lon: 6.5397 };
      else if (loc === 'Euroborg') coords = { lat: 53.2011, lon: 6.5829 };
      else if (loc === 'Sloterdijk') coords = { lat: 52.3888, lon: 4.8398 };
      else if (loc === 'Kauwgomballenkwartier') coords = { lat: 52.3361, lon: 4.9089 };
      else if (loc === 'Olympiaplein') coords = { lat: 52.3486, lon: 4.8726 };
      else if (loc === 'Malkenschoten') coords = { lat: 52.1852, lon: 5.9734 };
      else if (loc === 'High Tech Campus') coords = { lat: 51.4112, lon: 5.4608 };

      const cacheKey = `${coords.lat}_${coords.lon}_${date}`;
      const cached = weatherCache[cacheKey];

      if (cached && Date.now() < cached.expiry) {
        weatherInfo = cached.data;
      } else {
        try {
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,wind_speed_10m,weather_code`);
          if (response.ok) {
            const data = await response.json();
            const hourly = data.hourly;
            let totalTemp = 0;
            let totalWind = 0;
            let maxWeatherCode = 0;
            let count = 0;

            for (let i = 0; i < hourly.time.length; i++) {
              if (hourly.time[i].startsWith(date)) {
                totalTemp += hourly.temperature_2m[i];
                totalWind += hourly.wind_speed_10m[i];
                maxWeatherCode = Math.max(maxWeatherCode, hourly.weather_code[i]);
                count++;
              }
            }

            if (count > 0) {
              const temp = Math.round(totalTemp / count);
              const wind = Math.round(totalWind / count);
              const isPlayable = temp > 8 && wind < 40 && maxWeatherCode < 50;
              weatherInfo = {
                temperature: temp,
                wind_speed: wind,
                weather_code: maxWeatherCode,
                is_playable: isPlayable
              };
              
              // Cache for 15 minutes
              weatherCache[cacheKey] = {
                data: weatherInfo,
                expiry: Date.now() + 15 * 60 * 1000
              };
            }
          }
        } catch (e) {
          console.error(`Failed to fetch weather for ${loc}:`, e);
        }
      }

      if (!weatherInfo) {
        weatherInfo = {
          temperature: 12,
          wind_speed: 15,
          weather_code: 3,
          is_playable: true
        };
      }
    }

    let availableTimes = [...times];
    if (date === todayStr) {
      availableTimes = times.filter(t => {
        const [h, m] = t.split(':').map(Number);
        return (h > currentHour) || (h === currentHour && m > currentMin);
      });
    } else if (date < todayStr) {
      availableTimes = [];
    }

    const openSlots = availableTimes.filter(() => Math.random() > 0.4);
    openSlots.forEach(time => {
      results.push({
        location: `Peakz Padel ${loc}`,
        time,
        date,
        courtType: `${court_type === 'single' ? 'Single' : 'Double'} (${playtime} min) - ${isOutdoor ? 'Outdoor' : 'Indoor'}`,
        isOutdoor,
        price: getPeakzCourtPrice(time, playtime, court_type),
        weather: weatherInfo
      });
    });
  }

  return res.json(results);
});

// Serve React build output static files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the React SPA for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Padel Planner API running at http://localhost:${PORT}`);
});

