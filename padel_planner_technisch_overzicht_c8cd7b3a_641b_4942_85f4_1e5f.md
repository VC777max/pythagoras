# Padel Planner — Technisch Overzicht

_Voor Melvin — doorgestuurd naar een externe coding agent._

---

## 1. Wat is het?

Een **Telegram bot + REST API** die padelwedstrijden plant binnen een vaste groep spelers. De bot regelt registratie, beschikbaarheid, matchvoorstel (automatisch matchen op basis van beschikbaarheid en niveau), acceptatie/rejectie, scores invoeren, verificatie door tegenstander, en rankings per kwartaal.

Daarnaast is er een **web-frontend** (SPA) op `https://padel.iamdoingthings.com` voor beschikbaarheidsbeheer en een **Peakz scraper** (`padel-peakz.js`) die via Playwright baantijden checkt op Peakz Padel locaties in Groningen.

---

## 2. Tech Stack

| Laag | Technologie |
|---|---|
| **Backend API** | Node.js + Express (ES modules), poort 3000 |
| **Database** | SQLite via `better-sqlite3`, bestand: `/data/data.db` |
| **Bot** | `node-telegram-bot-api` (polling mode), poort 3001 |
| **Scraper** | Playwright + Chromium headless |
| **Deployment** | Docker (twee containers: `padel-api` + `padel-bot`, Docker network `padel-net`), draait op VPS |
| **Frontend** | Statische SPA in `/root/.openclaw/workspace-coding/public/` |

**Project structuur:**
- `/root/.openclaw/workspace-coding/padel-api/` — server.js + db.cjs
- `/root/.openclaw/workspace-coding/padel-bot/` — bot.js + padel-peakz.js
- `/root/.openclaw/workspace-coding/public/` — frontend

---

## 3. Database Schema

### Tabel `players`
| Kolom | Type | Opmerking |
|---|---|---|
| `id` | TEXT PK | Gegenereerd (timestamp + random) |
| `name` | TEXT | |
| `level` | INTEGER | 1-10, default 5 |
| `position` | TEXT | 'Links', 'Rechts', 'Beide' |
| `telegram_id` | TEXT | Koppelt aan Telegram user |
| `pin` | TEXT | 4-cijferige inlogcode |
| `sessions`, `hours`, `wins`, `games` | INTEGER | Stats |
| `avail_mode` | TEXT | 'flex' (standaard) |
| `availability_temp` | TEXT | JSON — week-specifieke beschikbaarheid |
| `rejected_slots` | TEXT | JSON — slots die speler heeft afgewezen |

### Tabel `player_availability`
Per dag-slots van een speler. Genormaliseerde wekelijkse beschikbaarheid.

| Kolom | Type |
|---|---|
| `player_id` | FK → players.id |
| `day_name` | TEXT ('maandag' t/m 'zondag') |
| `start_time` | TEXT ('HH:MM') |
| `end_time` | TEXT ('HH:MM') |
| `duration` | INTEGER (minuten, default 90) |

### Tabel `matches`
| Kolom | Type | Opmerking |
|---|---|---|
| `id` | TEXT PK | |
| `status` | TEXT | 'proposed' → 'confirmed' / 'cancelled' → 'completed' |
| `responses` | TEXT | JSON: `{ "playerId": "accepted" \| "rejected" }` |
| `date`, `start`, `end` | TEXT | Datum en tijdslot |
| `score` | TEXT | JSON: `{ team1: [...], team2: [...], score: "6-3, 6-4", sets: [...], status: "pending" \| "confirmed", submitted_by, verified_by: [...] }` |
| `proposed_teams` | TEXT | JSON: `{ team1: [...], team2: [...] }` |
| `match_type` | TEXT | 'friendly' (default) of 'ranked' |
| `booker_id`, `booker_name` | TEXT | Willekeurig gekozen speler die moet boeken |

### Tabel `match_players`
Junction table — welke speler zit in welke match, met optioneel teamnr en individuele score.

### Tabel `sessions`
Legacy log-tabel — opgeslagen speelsessies met datum, spelers, match_id. Wordt gebruikt voor stats berekening en koppeling match→session.

### Tabel `settings`
Key-value store (o.a. voor groepen).

### Tabel `player_match_stats`
Idempotentie-tabel — voorkomt dubbele win/loss updates bij opnieuw verifiëren van een score.

---

## 4. API Endpoints (Express)

### Players
| Method | Path | Doel |
|---|---|---|
| GET | `/api/players` | Alle spelers ophalen |
| POST | `/api/players` | Speler registreren (genereert id + pin) |
| POST | `/api/login` | Inloggen met pin + naam OF telegram_id |
| PUT | `/api/players/:id` | Speler updaten |
| PUT | `/api/players/:id/availability` | Beschikbaarheid zetten |

### Matches
| Method | Path | Doel |
|---|---|---|
| GET | `/api/matches` | Alle matches |
| POST | `/api/matches` | Match aanmaken |
| GET | `/api/matches/open` | Openstaande score-matches voor speler |
| POST | `/api/matches/:id/respond` | ✅/❌ reageren op match → zet status |
| POST | `/api/matches/:id/teams` | Teamindeling voorstellen |
| POST | `/api/matches/:id/type` | ranked/friendly zetten |
| POST | `/api/matches/:id/score` | Score indienen |
| POST | `/api/matches/:id/verify` | Score verifiëren (tegenstander) |

### Overige
| Method | Path | Doel |
|---|---|---|
| GET | `/api/stats` | Algemene stats |
| GET | `/api/rankings?season=Q2-2026` | Rankings per kwartaal |
| GET | `/api/matches/history?season=Q2-2026` | Match historie |
| GET | `/api/seasons` | Beschikbare kwartalen |
| GET | `/api/sessions` | Sessie-log |
| GET/POST/DELETE | `/api/groups` | Groepsbeheer |

---

## 5. Bot Flows (Telegram Commands)

### Flow 1: Registratie
```
/start → naam vragen → niveau (1-10) → positie (links/rechts/beide) → ✅ klaar (PIN gegenereerd)
```
State machine per user: `userState.set(chatId, { step: 'register_xxx', data: {...} })`

### Flow 2: Beschikbaarheid (/beschikbaar, /nu)
```
/beschikbaar → inline keyboard: vaste dag toevoegen / eenmalig / wissen
/nu → snel beschikbaar melden voor vandaag of latere dag
/nu di 18:00 → volgende dinsdag 18:00
```
Resultaten worden opgeslagen in `player_availability` tabel.
**Web-frontend** is de primary manier voor uitgebreid beschikbaarheidsbeheer.

### Flow 3: Match vinden (/match) — de belangrijkste flow
```
/match → bot zoekt overlapping availability voor komende 7 dagen
       → matched spelers op niveau (level ±1 of ±2 afhankelijk van winrate)
       → kiest teams op basis van niveau-balans
       → maakt match aan in DB met status=proposed
       → stuurt bericht naar alle 4 spelers met ✅/❌ knoppen
```

### Flow 4: Accepteren/Rejecten (callback handlers)
```
Speler klikt ✅ → POST /api/matches/:id/respond { player_id, response: "accepted" }
Speler klikt ❌ → POST /api/matches/:id/respond { player_id, response: "rejected" }

Als ALLE 4 geaccepteerd → match.status = "confirmed"
                          → kies random booker_id
                          → maak session aan in DB
                          → stuur notificatie naar groep

Als IEMAND rejected → match.status = "cancelled"
                    → rejected_slots opgeslagen in player record (voorkom her-voorstellen)
                    → stuur notificatie: match geannuleerd
```

### Flow 5: Score invoeren (/score)
```
/score → kies match (uit openstaande confirmed/completed)
       → voer sets in: "6-4 7-5" of "4-6 6-3 10-7"
       → kies teamgenoot
       → bot bepaalt winning/losing team
       → POST /api/matches/:id/score
       → stuurt verificatie-bericht naar één tegenstander
```

### Flow 6: Score verifiëren
```
Tegenstander krijgt inline keyboard: [✅ Ja, klopt!] [❌ Nee, corrigeer]
✅ → POST /api/matches/:id/verify → score.status = "confirmed"
    → Als ranked: update wins/losses in players tabel (idempotent via player_match_stats)

❌ → score geweigerd, speler kan opnieuw indienen
```

### Flow 7: Rankings (/rankings)
```
GET /api/rankings → per kwartaal alle confirmed ranked matches
                  → punten: 1000 + (wins*25) - (losses*20) + (adjusted_level*10)
                  → adjusted_level: base_level + winrate bonus
```

---

## 6. Kritieke Business Logic

### Match Matching Algoritme
1. Haal alle spelers met `availability` voor komende 7 dagen
2. Vind overlappende slots (minimaal 4 spelers op zelfde dag+tijd)
3. Sorteer op niveau, maak gebalanceerde teams (level som per team ≈ gelijk)
4. Exclude spelers die dit slot eerder gereject hebben (`rejected_slots`)

### Score Validatie
- Altijd minimaal 2 sets
- Bij 3e set: super tiebreak tot 10 (padel regel)
- Winnaar bepaald door meeste sets gewonnen
- **Verificatie vereist** — minstens 1 tegenstander moet bevestigen. Pas dan telt de score voor rankings.

### Rankings (per kwartaal)
- Alleen **ranked** matches met **confirmed** scores tellen mee
- Puntenberekening: `1000 + (wins × 25) − (losses × 20) + (adjustedLevel × 10)`
- `adjustedLevel` = base level + bonus obv winrate (>75% = +2, >60% = +1, <30% = −1)

### Rate Limiting (bot)
- Per chat: max 1 bericht/sec
- Groep: max 1 bericht/3 sec  
- Global: ~30/sec
- 429 errors → auto-retry na `retry_after`

---

## 7. Bekende Bugs & Open Issues (25 mei 2026)

### 🔴 Hoog — moet gefixt
1. **`rejected_slots` kolom mist in DB schema** — `updatePlayer()` crashed bij reject. Fix: kolom toevoegen in `CREATE TABLE` (staat nu alleen als ALTER TABLE migration).

2. **Dubbele `match_accept_` handler in bot.js** — twee callback handlers die beide de match proberen af te handelen, wat kan leiden tot dubbele state changes.

### 🟡 Medium
3. **Geen timeout op voting** — match blijft 30+ minuten in `acceptingMatch` hangen. Er is een cleanup interval maar die verwijdert alleen de `acceptingMatch` state, niet de match zelf.

4. **`acceptingMatch` implicit global** — variabele is niet expliciet gedeclareerd, kan memory leak of onverwacht gedrag veroorzaken.

5. **Geen speler check in vote callbacks** — iedereen met de callback_data kan stemmen, geen verificatie dat degene die klikt ook echt in de match zit.

6. **Race condition `acceptingMatch`** — bij gelijktijdige accept/reject kan de state corrupt raken. Een `finalizingMatches` Set is toegevoegd als semaphore maar nog niet overal toegepast.

7. **`updateMatch()` dubbele JSON serialisatie** — `score` en `responses` kunnen dubbel geserialiseerd worden in DB.

8. **`finalizeMatch()` error handling** — errors worden stilgeslikt of incompleet afgehandeld, waardoor een match half in confirmed/cancelled kan blijven hangen.

9. **Dubbele SIGTERM/SIGINT handlers** — server.js heeft twee process.on handlers die allebei `process.exit(0)` callen (potentieel dubbel afvuren van `db.close()`).

---

## 8. Deployment

Docker Compose (vermoedelijk), twee containers:
- `padel-api` — Node.js Express API op poort 3000
- `padel-bot` — Telegram bot op poort 3001, communiceert met API via `http://nova-padel-api:3000`

Docker network: `padel-net`

Database volume: `/data/data.db` (persistent)

---

## 9. Peakz Scraper (losse tool)

`padel-peakz.js` — CLI script dat via Playwright de Peakz Padel website scrapet:
```bash
node padel-peakz.js [datum] [locatie] [--json]
```
- 3 Groningen locaties: Atoomweg, Euroborg, Suikerterrein
- Retourneert beschikbare baantijden voor een specifieke datum
- Kan als losse tool gebruikt worden, niet direct gekoppeld aan de bot
