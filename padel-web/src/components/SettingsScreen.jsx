import React, { useState, useEffect, useCallback } from 'react';
import { User, LogOut, Check, Sliders, ChevronDown, Search, ShieldAlert, Trash2, Key, X, Plus, BarChart2, Users, UserPlus, UserMinus, Wifi, Award, CheckCircle2 } from 'lucide-react';
import { translate } from '../utils/i18n';

// ─── Speelsterkte Rating Calculator Logic ──────────────────────────────────
function calcPadelRating(q1, q2, q3, q4) {
  // q1: 0=none, 1=recreational, 2=competitive racket sport
  // q2: 0=beginner, 1=occasional, 2=weekly, 3=competitive/tournaments
  // q3: 0=avoids glass, 1=can keep rally going, 2=masters glass
  // q4: 0=basic, 1=lob+bandeja, 2=smash+vibora+chiquita
  const raw = q1 * 1.5 + q2 * 2.0 + q3 * 1.25 + q4 * 1.75;
  // raw ranges from 0 to 10.5 → map to 1.0-9.0 (lower = better in NL system)
  const rating = 9.0 - (raw / 10.5) * 8.0;
  return Math.round(rating * 2) / 2; // round to nearest 0.5
}

export default function SettingsScreen({ activePlayer, token, onLogout, onRefreshPlayer, language, onChangeLanguage, isNewPlayer, onClearNewPlayer }) {
  const [name, setName] = useState(activePlayer.name);
  const [pin, setPin] = useState('');
  const [city, setCity] = useState(activePlayer.city || 'Groningen');
  const [level, setLevel] = useState((10 - activePlayer.level).toString()); // Rating selector mapping
  const [position, setPosition] = useState(activePlayer.position || 'Beide');
  const [avatar, setAvatar] = useState(activePlayer.avatar || 'avatar_01');
  const [prefPlaytime, setPrefPlaytime] = useState(activePlayer.pref_playtime || 90);
  const [prefCourtType, setPrefCourtType] = useState(activePlayer.pref_court_type || 'double');
  const [preferredClubs, setPreferredClubs] = useState(activePlayer.preferred_clubs || []);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Calculator states
  const [showCalculator, setShowCalculator] = useState(false);
  const [q1, setQ1] = useState(-1);
  const [q2, setQ2] = useState(-1);
  const [q3, setQ3] = useState(-1);
  const [q4, setQ4] = useState(-1);
  const [calculatedRating, setCalculatedRating] = useState(null);

  // Admin Panel states
  const [playersList, setPlayersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminPlayer, setSelectedAdminPlayer] = useState(null);
  
  // Admin Editing fields
  const [adminName, setAdminName] = useState('');
  const [adminLevel, setAdminLevel] = useState('7.0');
  const [adminPosition, setAdminPosition] = useState('Beide');
  const [adminCity, setAdminCity] = useState('Groningen');
  const [adminClubs, setAdminClubs] = useState([]);
  const [adminElo, setAdminElo] = useState(1200);
  const [adminWins, setAdminWins] = useState(0);
  const [adminSessions, setAdminSessions] = useState(0);
  const [adminHours, setAdminHours] = useState(0);
  const [adminGames, setAdminGames] = useState(0);
  const [adminPinReset, setAdminPinReset] = useState('');

  // Add new player manually states
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerLevel, setNewPlayerLevel] = useState('7.0');
  const [newPlayerPosition, setNewPlayerPosition] = useState('Beide');
  const [newPlayerPin, setNewPlayerPin] = useState('');
  const [newPlayerCity, setNewPlayerCity] = useState('Groningen');

  const [cityDropdown, setCityDropdown] = useState(false);

  // Friends & Match Mode states
  const [matchMode, setMatchMode] = useState(activePlayer.match_mode || 'open');
  const [prefMatchType, setPrefMatchType] = useState(activePlayer.pref_match_type || 'ranked');
  const [friendsList, setFriendsList] = useState([]);
  const [allowLargeSkillGap, setAllowLargeSkillGap] = useState(activePlayer.allow_large_skill_gap !== 0);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [friendMsg, setFriendMsg] = useState('');

  const t = (key) => translate(key, language);

  const CITIES_CLUBS = {
    Groningen: ['Atoomweg', 'Euroborg', 'Suikerterrein'],
    Amsterdam: ['Kauwgomballenkwartier', 'Olympiaplein', 'Sloterdijk', 'Zuidoost'],
    Utrecht: ['Vechtsebanen', 'Zeehaenkade'],
    Eindhoven: ['Beursgebouw', 'High Tech Campus', 'Vijfkamplaan'],
    Apeldoorn: ['De Maten', 'Malkenschoten'],
    Assen: ['Assen'],
    Haarlem: ['Haarlem'],
    Heemskerk: ['Heemskerk'],
    Heerlen: ['Heerlen'],
    Nijmegen: ['Nijmegen'],
    Oisterwijk: ['Oisterwijk'],
    Papendrecht: ['Papendrecht'],
    Sittard: ['Sittard'],
    Zutphen: ['Zutphen'],
    Zwolle: ['Zwolle']
  };

  const avatarOptions = [
    { id: 'avatar_01', color: '#47ff75', label: 'Neon Green' },
    { id: 'avatar_02', color: '#47e6ff', label: 'Neon Blue' },
    { id: 'avatar_03', color: '#b547ff', label: 'Neon Purple' },
    { id: 'avatar_04', color: '#ff9d47', label: 'Neon Orange' },
    { id: 'avatar_05', color: '#ff4747', label: 'Neon Red' }
  ];

  // Adjust preferred clubs list when city changes
  useEffect(() => {
    const validClubs = CITIES_CLUBS[city] || [];
    setPreferredClubs(prev => prev.filter(c => validClubs.includes(c)));
  }, [city]);

  const handleToggleClub = (club) => {
    if (preferredClubs.includes(club)) {
      setPreferredClubs(prev => prev.filter(c => c !== club));
    } else {
      setPreferredClubs(prev => [...prev, club]);
    }
  };

  // ── Friends API helpers ─────────────────────────────────────────────────
  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch('/api/friends', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setFriendsList(await res.json());
    } catch (e) { console.error(e); }
  }, [token]);

  const loadFriendRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/friends/requests', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setFriendRequests(await res.json());
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, [loadFriends, loadFriendRequests]);

  const handleFriendSearch = async (query) => {
    setFriendSearch(query);
    if (query.trim().length < 1) { setFriendSearchResults([]); return; }
    setFriendSearchLoading(true);
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setFriendSearchResults(await res.json());
    } catch (e) { console.error(e); }
    setFriendSearchLoading(false);
  };

  const handleAddFriend = async (friendId) => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ friend_id: friendId })
      });
      if (res.ok) {
        setFriendMsg(t('friendRequestSent'));
        setFriendSearch('');
        setFriendSearchResults([]);
        loadFriends();
        loadFriendRequests();
        setTimeout(() => setFriendMsg(''), 2500);
      }
    } catch (e) { console.error(e); }
  };

  const handleAcceptRequest = async (senderId) => {
    try {
      const res = await fetch(`/api/friends/requests/${senderId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFriendMsg(t('friendAdded'));
        setFriendSearch('');
        setFriendSearchResults([]);
        loadFriends();
        loadFriendRequests();
        setTimeout(() => setFriendMsg(''), 2500);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeclineRequest = async (senderId) => {
    try {
      const res = await fetch(`/api/friends/requests/${senderId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadFriendRequests();
      }
    } catch (e) { console.error(e); }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      const res = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFriendMsg(t('friendRemoved'));
        loadFriends();
        loadFriendRequests();
        setTimeout(() => setFriendMsg(''), 2500);
      }
    } catch (e) { console.error(e); }
  };
  // ────────────────────────────────────────────────────────────────────────


  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(t('fillAllFields'));
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const lvlFloat = parseFloat(level) || 5.0;
    const dbLevel = 10.0 - lvlFloat; // inverse mapping

    try {
      const response = await fetch(`/api/players/${activePlayer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          level: dbLevel,
          position,
          pin,
          city,
          preferred_clubs: preferredClubs,
          avatar,
          pref_playtime: parseInt(prefPlaytime),
          pref_court_type: prefCourtType,
          match_mode: matchMode,
          pref_match_type: prefMatchType,
          allow_large_skill_gap: allowLargeSkillGap ? 1 : 0
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('saveError'));
      }
      setSuccessMsg(t('saveSuccess'));
      onRefreshPlayer();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCalculatedRating = () => {
    if (calculatedRating !== null) {
      setLevel(calculatedRating.toFixed(1));
      setShowCalculator(false);
      setSuccessMsg('');
    }
  };

  const loadAdminPlayers = async () => {
    try {
      const response = await fetch('/api/admin/players', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlayersList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activePlayer.id === 'p-melvin') {
      loadAdminPlayers();
    }
  }, [activePlayer.id]);

  const handleAdminSelectPlayer = (p) => {
    setSelectedAdminPlayer(p);
    setAdminName(p.name);
    setAdminLevel((10.0 - p.level).toFixed(1));
    setAdminPosition(p.position);
    setAdminCity(p.city);
    setAdminClubs(p.preferred_clubs || []);
    setAdminElo(p.elo);
    setAdminWins(p.wins || 0);
    setAdminSessions(p.sessions || 0);
    setAdminHours(p.hours || 0);
    setAdminGames(p.games || 0);
    setAdminPinReset('');
  };

  const handleAdminSave = async (e) => {
    e.preventDefault();
    if (!adminName.trim()) return;

    const ratingVal = parseFloat(adminLevel) || 7.0;
    const dbLevel = 10.0 - ratingVal;

    try {
      const response = await fetch(`/api/admin/players/${selectedAdminPlayer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: adminName,
          level: dbLevel,
          position: adminPosition,
          city: adminCity,
          preferred_clubs: adminClubs,
          elo: adminElo,
          wins: adminWins,
          sessions: adminSessions,
          hours: adminHours,
          games: adminGames
        })
      });
      if (response.ok) {
        if (adminPinReset.trim().length === 4) {
          await fetch(`/api/admin/players/${selectedAdminPlayer.id}/reset-pin`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pin: adminPinReset })
          });
        }

        setSelectedAdminPlayer(null);
        loadAdminPlayers();
        onRefreshPlayer();
        setSuccessMsg(t('saveSuccess'));
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Failed to save player details');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to save player details');
    }
  };

  const handleAdminDelete = async () => {
    const confirmation = window.confirm(t('deletePlayerConfirm') || "Are you sure?");
    if (!confirmation) return;

    try {
      const response = await fetch(`/api/admin/players/${selectedAdminPlayer.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSelectedAdminPlayer(null);
        loadAdminPlayers();
        onRefreshPlayer();
        setSuccessMsg(t('saveSuccess'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim() || newPlayerPin.length !== 4) return;

    const ratingVal = parseFloat(newPlayerLevel) || 7.0;

    try {
      const response = await fetch('/api/admin/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newPlayerName,
          level: ratingVal,
          position: newPlayerPosition,
          pin: newPlayerPin,
          city: newPlayerCity,
          preferred_clubs: []
        })
      });
      if (response.ok) {
        setShowAddPlayerModal(false);
        setNewPlayerName('');
        setNewPlayerPin('');
        loadAdminPlayers();
        setSuccessMsg(t('playerCreated') || "Player created!");
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create player');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const availableClubs = CITIES_CLUBS[city] || [];

  // Questions definition
  const questions = [
    {
      key: 'q1', label: t('qRacket'), value: q1, setter: setQ1,
      options: [t('qRacket_opt0'), t('qRacket_opt1'), t('qRacket_opt2')]
    },
    {
      key: 'q2', label: t('qPadel'), value: q2, setter: setQ2,
      options: [t('qPadel_opt0'), t('qPadel_opt1'), t('qPadel_opt2'), t('qPadel_opt3')]
    },
    {
      key: 'q3', label: t('qGlass'), value: q3, setter: setQ3,
      options: [t('qGlass_opt0'), t('qGlass_opt1'), t('qGlass_opt2')]
    },
    {
      key: 'q4', label: t('qStrokes'), value: q4, setter: setQ4,
      options: [t('qStrokes_opt0'), t('qStrokes_opt1'), t('qStrokes_opt2')]
    }
  ];

  const allAnswered = q1 >= 0 && q2 >= 0 && q3 >= 0 && q4 >= 0;

  const handleCalculate = () => {
    if (allAnswered) {
      setCalculatedRating(calcPadelRating(q1, q2, q3, q4));
    }
  };

  const filteredPlayers = playersList.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--color-border-glass)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'var(--color-text-primary)',
    fontSize: '13px',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    marginBottom: '4px',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Speelsterkte Calculator Modal ── */}
      {showCalculator && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '480px',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px',
            background: 'rgba(15,17,26,0.97)',
            border: '1px solid var(--color-border-glass)',
            display: 'flex', flexDirection: 'column', gap: '16px',
            maxHeight: '85vh', overflowY: 'auto'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <BarChart2 size={18} style={{ color: 'var(--color-primary)' }} />
                  <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
                    {t('calcTitle')}
                  </h2>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: 0 }}>
                  {t('calcSub')}
                </p>
              </div>
              <button
                onClick={() => { setShowCalculator(false); setCalculatedRating(null); setQ1(-1); setQ2(-1); setQ3(-1); setQ4(-1); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Questions */}
            {questions.map((q, qi) => (
              <div key={q.key} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border-glass)',
                borderRadius: '10px',
                padding: '14px'
              }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '10px', margin: '0 0 10px 0' }}>
                  {q.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {q.options.map((opt, oi) => {
                    const selected = q.value === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => q.setter(oi)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: '7px',
                          border: '1px solid',
                          borderColor: selected ? 'var(--color-primary)' : 'var(--color-border-glass)',
                          background: selected ? 'rgba(212,255,0,0.08)' : 'rgba(255,255,255,0.02)',
                          color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '50%',
                          border: `2px solid ${selected ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)'}`,
                          background: selected ? 'var(--color-primary)' : 'transparent',
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {selected && <Check size={10} style={{ color: '#0f111a' }} />}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Result or Calculate button */}
            {calculatedRating !== null ? (
              <div style={{
                background: 'rgba(212,255,0,0.07)',
                border: '1px solid rgba(212,255,0,0.25)',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  {t('calcResult').replace('{rating}', '')}
                </div>
                <div style={{ fontSize: '42px', fontWeight: '900', color: 'var(--color-primary)', lineHeight: '1' }}>
                  {calculatedRating.toFixed(1)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {language === 'nl' ? 'Padel Rating (lager = sterker)' : 'Padel Rating (lower = stronger)'}
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleApplyCalculatedRating}
                  style={{ marginTop: '14px', width: '100%' }}
                >
                  {t('useRating')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={handleCalculate}
                disabled={!allAnswered}
                style={{ opacity: allAnswered ? 1 : 0.4 }}
              >
                {language === 'nl' ? 'Bereken Mijn Rating' : 'Calculate My Rating'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Admin Edit Player Modal ── */}
      {selectedAdminPlayer && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <form onSubmit={handleAdminSave} style={{
            width: '100%', maxWidth: '480px',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px',
            background: 'rgba(15,17,26,0.97)',
            border: '1px solid var(--color-border-glass)',
            display: 'flex', flexDirection: 'column', gap: '14px',
            maxHeight: '85vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
                {t('editPlayer')}: {selectedAdminPlayer.name}
              </h2>
              <button type="button" onClick={() => setSelectedAdminPlayer(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>{t('playerName')}</label>
                <input style={inputStyle} value={adminName} onChange={e => setAdminName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{language === 'nl' ? 'Padel Rating' : 'Padel Rating'}</label>
                <input style={inputStyle} type="number" min="1" max="9" step="0.5" value={adminLevel} onChange={e => setAdminLevel(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>ELO</label>
                <input style={inputStyle} type="number" value={adminElo} onChange={e => setAdminElo(parseInt(e.target.value))} />
              </div>
              <div>
                <label style={labelStyle}>{t('wins')}</label>
                <input style={inputStyle} type="number" min="0" value={adminWins} onChange={e => setAdminWins(parseInt(e.target.value))} />
              </div>
              <div>
                <label style={labelStyle}>{language === 'nl' ? 'Sessies' : 'Sessions'}</label>
                <input style={inputStyle} type="number" min="0" value={adminSessions} onChange={e => setAdminSessions(parseInt(e.target.value))} />
              </div>
              <div>
                <label style={labelStyle}>{language === 'nl' ? 'Uren' : 'Hours'}</label>
                <input style={inputStyle} type="number" min="0" value={adminHours} onChange={e => setAdminHours(parseFloat(e.target.value))} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t('city')}</label>
              <select style={inputStyle} value={adminCity} onChange={e => setAdminCity(e.target.value)}>
                {Object.keys(CITIES_CLUBS).sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t('resetPin')} ({t('newPin')})</label>
              <input
                style={inputStyle}
                type="password"
                maxLength={4}
                placeholder="••••"
                value={adminPinReset}
                onChange={e => setAdminPinReset(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, fontSize: '13px' }}>
                {t('saveSettings')}
              </button>
              <button
                type="button"
                onClick={handleAdminDelete}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-danger)',
                  background: 'rgba(255,71,71,0.08)',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                <Trash2 size={14} />
                {t('deletePlayer')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Add New Player Modal ── */}
      {showAddPlayerModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <form onSubmit={handleAdminAddPlayer} style={{
            width: '100%', maxWidth: '480px',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px',
            background: 'rgba(15,17,26,0.97)',
            border: '1px solid var(--color-border-glass)',
            display: 'flex', flexDirection: 'column', gap: '14px',
            maxHeight: '75vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
                {t('createPlayer')}
              </h2>
              <button type="button" onClick={() => setShowAddPlayerModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={labelStyle}>{t('playerName')}</label>
              <input style={inputStyle} required value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>{t('pinCode')}</label>
                <input
                  style={inputStyle}
                  type="password"
                  maxLength={4}
                  required
                  value={newPlayerPin}
                  onChange={e => setNewPlayerPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div>
                <label style={labelStyle}>{language === 'nl' ? 'Padel Rating' : 'Padel Rating'}</label>
                <input style={inputStyle} type="number" min="1" max="9" step="0.5" value={newPlayerLevel} onChange={e => setNewPlayerLevel(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t('city')}</label>
              <select style={inputStyle} value={newPlayerCity} onChange={e => setNewPlayerCity(e.target.value)}>
                {Object.keys(CITIES_CLUBS).sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t('preferredSide')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { key: 'Links', label: t('sideLeft') },
                  { key: 'Rechts', label: t('sideRight') },
                  { key: 'Beide', label: t('sideBoth') }
                ].map(pos => (
                  <button
                    key={pos.key}
                    type="button"
                    onClick={() => setNewPlayerPosition(pos.key)}
                    style={{
                      padding: '8px 0',
                      borderRadius: '7px',
                      border: '1px solid',
                      borderColor: newPlayerPosition === pos.key ? 'var(--color-primary)' : 'var(--color-border-glass)',
                      background: newPlayerPosition === pos.key ? 'rgba(212,255,0,0.08)' : 'transparent',
                      color: newPlayerPosition === pos.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary"
              disabled={!newPlayerName.trim() || newPlayerPin.length !== 4}>
              {t('createPlayer')}
            </button>
          </form>
        </div>
      )}

      {isNewPlayer && (
        <div className="glass-panel" style={{
          padding: '16px',
          background: 'rgba(212,255,0,0.08)',
          border: '1px solid var(--color-primary)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative'
        }}>
          <button 
            type="button" 
            onClick={onClearNewPlayer}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
          <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--color-primary)', margin: 0 }}>
            {language === 'nl' ? 'Welkom bij Padel Matcher!' : 'Welcome to Padel Matcher!'}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.4', paddingRight: '20px' }}>
            {language === 'nl' 
              ? 'Vul hieronder direct je voorkeuren in (zoals je favoriete stad, clubs en speeltijd) zodat de automatische matchmaker optimaal voor jou kan zoeken naar geschikte wedstrijden!'
              : 'Please enter your playing preferences below (such as your city, clubs, and preferred duration) so the automatic matchmaker can find the best matches for you!'}
          </p>
        </div>
      )}

      {/* ── Main Settings Form ── */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* ── Panel 1: Account & App ── */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
            {language === 'nl' ? 'Account & App-instellingen' : 'Account & App Settings'}
          </h3>
          
          <div>
            <label style={labelStyle}>{t('playerName')}</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label style={labelStyle}>{t('pinCode')}</label>
            <input
              type="password"
              maxLength={4}
              placeholder="****"
              className="input-field"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>

          {/* Language Selection */}
          <div>
            <label style={labelStyle}>Language / Taal</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onChangeLanguage('nl')}
                className={`btn-secondary ${language === 'nl' ? 'active-pos' : ''}`}
                style={{
                  padding: '8px 0',
                  fontSize: '12px',
                  backgroundColor: language === 'nl' ? 'rgba(212, 255, 0, 0.1)' : 'transparent',
                  borderColor: language === 'nl' ? 'var(--color-primary)' : 'var(--color-border-glass)',
                  color: language === 'nl' ? 'var(--color-primary)' : 'var(--color-text-primary)'
                }}
              >
                Nederlands
              </button>
              <button
                type="button"
                onClick={() => onChangeLanguage('en')}
                className={`btn-secondary ${language === 'en' ? 'active-pos' : ''}`}
                style={{
                  padding: '8px 0',
                  fontSize: '12px',
                  backgroundColor: language === 'en' ? 'rgba(212, 255, 0, 0.1)' : 'transparent',
                  borderColor: language === 'en' ? 'var(--color-primary)' : 'var(--color-border-glass)',
                  color: language === 'en' ? 'var(--color-primary)' : 'var(--color-text-primary)'
                }}
              >
                English
              </button>
            </div>
          </div>

          {/* Avatar Color Picker */}
          <div>
            <label style={labelStyle}>{t('avatarAccent')}</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {avatarOptions.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setAvatar(opt.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: opt.color + '33',
                    border: avatar === opt.id ? `3px solid ${opt.color}` : `1px solid var(--color-border-glass)`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {avatar === opt.id && <Check size={14} style={{ color: opt.color }} />}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Panel 2: Padel Profiel & Locatie ── */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
            {language === 'nl' ? 'Padel Profiel & Locatie' : 'Padel Profile & Location'}
          </h3>

          {/* Padel Rating with calculator button */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                {language === 'nl' ? 'Padel Rating (1.0 = sterk, 9.0 = beginner)' : 'Padel Rating (1.0 = strong, 9.0 = beginner)'}
              </label>
              <button
                type="button"
                onClick={() => { setShowCalculator(true); setCalculatedRating(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                {t('calculateRatingLink')}
              </button>
            </div>
            <input
              type="number"
              className="input-field"
              min="1"
              max="9"
              step="0.5"
              value={level}
              onChange={e => setLevel(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label style={labelStyle}>{t('preferredSide')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { key: 'Links', label: t('sideLeft') },
                { key: 'Rechts', label: t('sideRight') },
                { key: 'Beide', label: t('sideBoth') }
              ].map(pos => (
                <button
                  key={pos.key}
                  type="button"
                  onClick={() => setPosition(pos.key)}
                  className={`btn-secondary ${position === pos.key ? 'active-pos' : ''}`}
                  style={{
                    padding: '8px 0',
                    borderRadius: '7px',
                    border: '1px solid',
                    borderColor: position === pos.key ? 'var(--color-primary)' : 'var(--color-border-glass)',
                    background: position === pos.key ? 'rgba(212,255,0,0.08)' : 'transparent',
                    color: position === pos.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  disabled={loading}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* City dropdown */}
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>{t('city')}</label>
            <div
              onClick={() => setCityDropdown(!cityDropdown)}
              className="input-field"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <span>{city}</span>
              <ChevronDown size={14} />
            </div>
            {cityDropdown && (
              <div className="glass-panel" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '100%',
                zIndex: 10,
                marginTop: '4px',
                background: 'var(--color-bg-dark)',
                borderRadius: '8px',
                overflowY: 'auto',
                maxHeight: '220px',
                border: '1px solid var(--color-border-glass)'
              }}>
                {Object.keys(CITIES_CLUBS).sort().map(c => (
                  <div
                    key={c}
                    onClick={() => {
                      setCity(c);
                      setCityDropdown(false);
                    }}
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: city === c ? 'rgba(212,255,0,0.1)' : 'transparent',
                      color: city === c ? 'var(--color-primary)' : 'inherit',
                      borderBottom: '1px solid rgba(255,255,255,0.03)'
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preferred Clubs */}
          {availableClubs.length > 0 && (
            <div>
              <label style={labelStyle}>{t('preferredClubs')}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableClubs.map(club => {
                  const isChecked = preferredClubs.includes(club);
                  return (
                    <div
                      key={club}
                      onClick={() => handleToggleClub(club)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid var(--color-border-glass)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      <span>Padel Club {club}</span>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: isChecked ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)',
                        background: isChecked ? 'rgba(212,255,0,0.1)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isChecked && <Check size={12} style={{ color: 'var(--color-primary)' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preferred Playtime */}
          <div style={{ marginTop: '12px' }}>
            <label style={labelStyle}>
              {language === 'nl' ? 'Voorkeur Speeltijd' : 'Preferred Playtime'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { value: 60, label: '60 min' },
                { value: 90, label: '90 min' },
                { value: 120, label: '120 min' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrefPlaytime(opt.value)}
                  className={`btn-secondary ${prefPlaytime === opt.value ? 'active-pos' : ''}`}
                  style={{
                    padding: '8px 0',
                    borderRadius: '7px',
                    border: '1px solid',
                    borderColor: prefPlaytime === opt.value ? 'var(--color-primary)' : 'var(--color-border-glass)',
                    background: prefPlaytime === opt.value ? 'rgba(212,255,0,0.08)' : 'transparent',
                    color: prefPlaytime === opt.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  disabled={loading}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Match Type Voorkeur ── */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
            {language === 'nl' ? 'Match Type Voorkeur' : 'Match Type Preference'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { value: 'ranked', icon: <Award size={16} />, label: 'Ranked', sub: language === 'nl' ? 'Telt mee voor je Padel Rating.' : 'Affects your Padel Rating.' },
              { value: 'friendly', icon: <CheckCircle2 size={16} />, label: 'Friendly', sub: language === 'nl' ? 'Spelen voor de lol, geen rating.' : 'Play for fun, no rating.' }
            ].map(opt => {
              const active = prefMatchType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrefMatchType(opt.value)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border-glass)'}`,
                    background: active ? 'rgba(212,255,0,0.07)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '12px' }}>
                    {opt.icon} {opt.label}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Match Mode Toggle ── */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
            {t('matchModeLabel')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { value: 'friends', icon: <Users size={16} />, label: t('matchModeFriends'), sub: t('matchModeFriendsSub') },
              { value: 'open', icon: <Wifi size={16} />, label: t('matchModeOpen'), sub: t('matchModeOpenSub') }
            ].map(opt => {
              const active = matchMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMatchMode(opt.value)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border-glass)'}`,
                    background: active ? 'rgba(212,255,0,0.07)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '12px' }}>
                    {opt.icon} {opt.label}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>{opt.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Skill Gap Setting */}
          <div style={{
            marginTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: 'pointer'
          }} onClick={() => setAllowLargeSkillGap(!allowLargeSkillGap)}>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: allowLargeSkillGap ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)',
              background: allowLargeSkillGap ? 'rgba(212,255,0,0.1)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '1px'
            }}>
              {allowLargeSkillGap && <Check size={12} style={{ color: 'var(--color-primary)' }} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: allowLargeSkillGap ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                {t('allowLargeSkillGap')}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                {t('allowLargeSkillGapSub')}
              </span>
            </div>
          </div>
        </div>

        {/* ── Friends Section ── */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
            <Users size={16} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
              {t('friendsTitle')}
            </h3>
            {friendsList.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'rgba(212,255,0,0.1)', border: '1px solid rgba(212,255,0,0.2)', borderRadius: '10px', padding: '2px 8px', color: 'var(--color-primary)', fontWeight: '700' }}>
                {friendsList.length}
              </span>
            )}
          </div>

          {/* Success/info msg */}
          {friendMsg && (
            <div style={{ background: 'rgba(71,255,117,0.08)', border: '1px solid rgba(71,255,117,0.3)', borderRadius: '6px', color: '#47ff75', fontSize: '11px', padding: '8px 12px', textAlign: 'center' }}>
              {friendMsg}
            </div>
          )}

          {/* Search to add */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder={t('searchPlayers')}
              value={friendSearch}
              onChange={e => handleFriendSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '34px' }}
            />
          </div>

          {/* Search results dropdown */}
          {friendSearchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {friendSearchResults.map(p => {
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--color-border-glass)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{p.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{p.city} · ★ {p.padel_rating}</span>
                    </div>
                    {p.friendStatus === 'friends' && (
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        ✓ {language === 'nl' ? 'Al vrienden' : 'Already friends'}
                      </span>
                    )}
                    {p.friendStatus === 'sent' && (
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--color-border-glass)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontStyle: 'italic'
                      }}>
                        {t('friendRequestPending')}
                      </span>
                    )}
                    {p.friendStatus === 'received' && (
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(p.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                          background: 'rgba(212,255,0,0.08)', border: '1px solid rgba(212,255,0,0.3)',
                          color: 'var(--color-primary)', fontSize: '11px', fontWeight: '700'
                        }}
                      >
                        <UserPlus size={12} /> {t('acceptFriend')}
                      </button>
                    )}
                    {p.friendStatus === 'none' && (
                      <button
                        type="button"
                        onClick={() => handleAddFriend(p.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                          background: 'rgba(212,255,0,0.08)', border: '1px solid rgba(212,255,0,0.3)',
                          color: 'var(--color-primary)', fontSize: '11px', fontWeight: '700'
                        }}
                      >
                        <UserPlus size={12} /> {t('addFriend')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Incoming Friend Requests */}
          {friendRequests.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '4px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary)', margin: '4px 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('incomingFriendRequests')} ({friendRequests.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {friendRequests.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(212,255,0,0.03)',
                    border: '1px solid rgba(212,255,0,0.15)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{r.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{r.city} · ★ {r.padel_rating}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(r.id)}
                        style={{
                          padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                          background: 'var(--color-primary)', border: '1px solid var(--color-primary)',
                          color: '#0f111a', fontSize: '11px', fontWeight: '700'
                        }}
                      >
                        {t('acceptFriend')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(r.id)}
                        style={{
                          padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                          background: 'rgba(255,71,71,0.08)', border: '1px solid rgba(255,71,71,0.3)',
                          color: 'var(--color-danger)', fontSize: '11px', fontWeight: '700'
                        }}
                      >
                        {t('declineFriend')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current friends list */}
          {friendsList.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', padding: '16px 0' }}>
              {t('noFriends')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {friendsList.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Live indicator */}
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: f.available_now ? '#47ff75' : 'rgba(255,255,255,0.2)',
                      boxShadow: f.available_now ? '0 0 6px #47ff75' : 'none',
                      flexShrink: 0
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{f.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        {f.city} · ★ {f.padel_rating}
                        {f.available_now ? <span style={{ color: '#47ff75', marginLeft: '6px', fontWeight: '700' }}>● LIVE</span> : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                      background: 'rgba(255,71,71,0.06)', border: '1px solid rgba(255,71,71,0.25)',
                      color: 'var(--color-danger)', fontSize: '11px'
                    }}
                  >
                    <UserMinus size={12} /> {t('removeFriend')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>



        {/* Message Indicators */}
        {successMsg && (
          <div style={{ background: 'rgba(71, 255, 117, 0.1)', border: '1px solid #47ff75', borderRadius: '6px', color: '#47ff75', fontSize: '12px', padding: '10px', textAlign: 'center' }}>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ background: 'rgba(255, 71, 71, 0.1)', border: '1px solid var(--color-danger)', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '12px', padding: '10px', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t('saving') : t('saveSettings')}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="btn-secondary"
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
        >
          <LogOut size={14} /> {t('logOut')}
        </button>
      </form>

      {/* ── Admin Panel (only for p-melvin) ── */}
      {activePlayer.id === 'p-melvin' && (
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
                {t('adminPanel')}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => { setShowAddPlayerModal(true); setNewPlayerName(''); setNewPlayerPin(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'rgba(212,255,0,0.08)',
                border: '1px solid rgba(212,255,0,0.3)',
                borderRadius: '7px',
                padding: '6px 12px',
                color: 'var(--color-primary)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Plus size={13} /> {language === 'nl' ? 'Toevoegen' : 'Add Player'}
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)', pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder={t('adminSearchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                ...inputStyle,
                paddingLeft: '34px'
              }}
            />
          </div>

          {/* Players List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
            {filteredPlayers.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', padding: '20px 0' }}>
                {language === 'nl' ? 'Geen spelers gevonden' : 'No players found'}
              </div>
            ) : filteredPlayers.map(p => {
              const pRating = (10.0 - p.level).toFixed(1);
              return (
                <div
                  key={p.id}
                  onClick={() => handleAdminSelectPlayer(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--color-border-glass)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,255,0,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      {p.id} · {p.city}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '800',
                      color: 'var(--color-primary)'
                    }}>
                      ★ {pRating}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      ELO {p.elo} · {p.wins}W
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {filteredPlayers.length} {language === 'nl' ? 'spelers' : 'players'} · {language === 'nl' ? 'Klik om te wijzigen' : 'Click to edit'}
          </div>
        </div>
      )}
      
    </div>
  );
}
