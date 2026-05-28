import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'padel_planner.db');

console.log(`Connecting to SQLite database at: ${dbPath}`);
const db = new Database(dbPath);

// Enable WAL mode for 10x write throughput (essential for concurrent users)
db.pragma('journal_mode = WAL');
// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 5,
    position TEXT NOT NULL DEFAULT 'Beide',
    telegram_id TEXT,
    pin TEXT NOT NULL,
    sessions INTEGER NOT NULL DEFAULT 0,
    hours INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    games INTEGER NOT NULL DEFAULT 0,
    avail_mode TEXT NOT NULL DEFAULT 'flex',
    availability_temp TEXT,
    rejected_slots TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS player_availability (
    player_id TEXT,
    day_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 90,
    PRIMARY KEY (player_id, day_name, start_time),
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
  );

  -- One-time / temporary availability for a specific date
  CREATE TABLE IF NOT EXISTS player_availability_once (
    player_id TEXT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 90,
    PRIMARY KEY (player_id, date, start_time),
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'proposed',
    responses TEXT NOT NULL DEFAULT '{}',
    date TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    score TEXT,
    proposed_teams TEXT NOT NULL DEFAULT '{}',
    match_type TEXT NOT NULL DEFAULT 'friendly',
    booker_id TEXT,
    booker_name TEXT
  );

  CREATE TABLE IF NOT EXISTS match_players (
    match_id TEXT,
    player_id TEXT,
    team_number INTEGER,
    PRIMARY KEY (match_id, player_id),
    FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    players TEXT NOT NULL,
    match_id TEXT,
    FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS player_match_stats (
    player_id TEXT,
    match_id TEXT,
    wins_incremented INTEGER NOT NULL DEFAULT 0,
    losses_incremented INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (player_id, match_id),
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
  );
`);

// Run migrations to add city and preferred_clubs if they don't exist
try {
  db.prepare("ALTER TABLE players ADD COLUMN city TEXT NOT NULL DEFAULT 'Groningen'").run();
  console.log("Added column 'city' to players table.");
} catch (e) {
  // Column already exists, ignore
}

try {
  db.prepare("ALTER TABLE players ADD COLUMN preferred_clubs TEXT NOT NULL DEFAULT '[]'").run();
  console.log("Added column 'preferred_clubs' to players table.");
} catch (e) {
  // Column already exists, ignore
}

try {
  db.prepare("ALTER TABLE matches ADD COLUMN location TEXT NOT NULL DEFAULT 'Peakz Padel Euroborg'").run();
  console.log("Added column 'location' to matches table.");
} catch (e) {
  // Column already exists, ignore
}

try {
  db.prepare("ALTER TABLE matches ADD COLUMN booking_url TEXT").run();
  console.log("Added column 'booking_url' to matches table.");
} catch (e) {
  // Column already exists, ignore
}

try {
  db.prepare("ALTER TABLE matches ADD COLUMN tikkie_url TEXT").run();
  console.log("Added column 'tikkie_url' to matches table.");
} catch (e) {
  // Column already exists, ignore
}

try {
  db.prepare("ALTER TABLE matches ADD COLUMN booking_claimed_by TEXT").run();
  console.log("Added column 'booking_claimed_by' to matches table.");
} catch (e) {
  // Column already exists, ignore
}

// --- New feature columns ---
try { db.prepare("ALTER TABLE players ADD COLUMN elo INTEGER NOT NULL DEFAULT 1200").run(); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN elo_peak INTEGER NOT NULL DEFAULT 1200").run(); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN avatar TEXT NOT NULL DEFAULT 'avatar_01'").run(); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN available_now INTEGER NOT NULL DEFAULT 0").run(); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN pref_playtime INTEGER NOT NULL DEFAULT 90").run(); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN pref_court_type TEXT NOT NULL DEFAULT 'double'").run(); } catch(e) {}
try { db.prepare("ALTER TABLE notifications ADD COLUMN link_id TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN match_mode TEXT NOT NULL DEFAULT 'open'").run(); console.log("Added column 'match_mode' to players."); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN pref_match_type TEXT NOT NULL DEFAULT 'ranked'").run(); console.log("Added column 'pref_match_type' to players."); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN recovery_code TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN recovery_expires TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE players ADD COLUMN allow_large_skill_gap INTEGER NOT NULL DEFAULT 1").run(); console.log("Added column 'allow_large_skill_gap' to players."); } catch(e) {}


// Create indexes to optimize matchmaking and queries
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_avail_player ON player_availability(player_id)").run(); } catch(e) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_avail_once_player_date ON player_availability_once(player_id, date)").run(); } catch(e) {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date)").run(); } catch(e) {}

// Backfill ELO from existing wins/sessions so returning players keep their standing
db.prepare(`
  UPDATE players
  SET elo = 1000 + (wins * 25) - (MAX(0, sessions - wins) * 20) + (level * 10),
      elo_peak = 1000 + (wins * 25) - (MAX(0, sessions - wins) * 20) + (level * 10)
  WHERE elo = 1200 AND sessions > 0
`).run();

// Badges, notifications, friends tables
db.exec(`
  CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS friends (
    player_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (player_id, friend_id),
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES players (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (sender_id, receiver_id),
    FOREIGN KEY (sender_id) REFERENCES players (id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES players (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    read INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS player_season_stats (
    season_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    elo_start INTEGER NOT NULL DEFAULT 1200,
    elo_peak INTEGER NOT NULL DEFAULT 1200,
    elo_current INTEGER NOT NULL DEFAULT 1200,
    games_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (season_id, player_id),
    FOREIGN KEY (season_id) REFERENCES seasons (id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    player_id TEXT,
    subscription TEXT NOT NULL,
    PRIMARY KEY (player_id, subscription),
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
  );
`);

// Seed initial season if none exist
const seasonCount = db.prepare('SELECT COUNT(*) as c FROM seasons').get().c;
if (seasonCount === 0) {
  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  const endDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split('T')[0];
  db.prepare("INSERT INTO seasons (id, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, 1)")
    .run('s-001', 'Season 1', startDate, endDate);
  console.log(`Seeded Season 1: ${startDate} → ${endDate}`);
}

// Helper to seed data if empty
const playerCount = db.prepare('SELECT COUNT(*) as count FROM players').get().count;

if (playerCount === 0) {
  console.log('Seeding initial database...');

  // Seed players
  const insertPlayer = db.prepare(`
    INSERT INTO players (id, name, level, position, pin, wins, sessions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const salt = bcrypt.genSaltSync(10);
  insertPlayer.run('p-melvin', 'Melvin', 7, 'Beide', bcrypt.hashSync('1111', salt), 12, 18);
  insertPlayer.run('p-koen', 'Koen', 6, 'Links', bcrypt.hashSync('2222', salt), 10, 16);
  insertPlayer.run('p-daan', 'Daan', 5, 'Rechts', bcrypt.hashSync('3333', salt), 8, 15);
  insertPlayer.run('p-bas', 'Bas', 5, 'Beide', bcrypt.hashSync('4444', salt), 7, 14);
  insertPlayer.run('p-lucas', 'Lucas', 4, 'Links', bcrypt.hashSync('5555', salt), 4, 10);
  insertPlayer.run('p-sophie', 'Sophie', 6, 'Rechts', bcrypt.hashSync('6666', salt), 9, 14);

  // Seed weekly availability
  const insertAvail = db.prepare(`
    INSERT INTO player_availability (player_id, day_name, start_time, end_time, duration)
    VALUES (?, ?, ?, ?, ?)
  `);

  // We need 4 players to overlap to trigger matches. Let's make Monday 19:30 overlapping for Melvin, Koen, Daan, Bas
  insertAvail.run('p-melvin', 'maandag', '19:30', '21:00', 90);
  insertAvail.run('p-koen', 'maandag', '19:30', '21:00', 90);
  insertAvail.run('p-daan', 'maandag', '19:30', '21:00', 90);
  insertAvail.run('p-bas', 'maandag', '19:30', '21:00', 90);

  // Tuesday overlapping for Melvin, Koen, Sophie, Bas
  insertAvail.run('p-melvin', 'dinsdag', '20:00', '21:30', 90);
  insertAvail.run('p-koen', 'dinsdag', '20:00', '21:30', 90);
  insertAvail.run('p-sophie', 'dinsdag', '20:00', '21:30', 90);
  insertAvail.run('p-bas', 'dinsdag', '20:00', '21:30', 90);

  // Extra random availabilities
  insertAvail.run('p-lucas', 'woensdag', '18:00', '19:30', 90);
  insertAvail.run('p-daan', 'woensdag', '18:00', '19:30', 90);

  console.log('Database seeded successfully.');
}

// Migration: Hash any plaintext PINs (4-digit codes) in the database
try {
  const allPlayers = db.prepare('SELECT id, pin FROM players').all();
  for (const p of allPlayers) {
    if (p.pin && p.pin.length === 4) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(p.pin, salt);
      db.prepare('UPDATE players SET pin = ? WHERE id = ?').run(hash, p.id);
      console.log(`Migrated/hashed PIN for player: ${p.id}`);
    }
  }
} catch (err) {
  console.error('Failed to run PIN hashing migration:', err);
}

export default db;
