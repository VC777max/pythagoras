import React, { useState, useEffect } from 'react';
import { User, LogOut, Check, Sliders, ChevronDown, Search, ShieldAlert, Trash2, Key, X, Plus, BarChart2 } from 'lucide-react';
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

export default function SettingsScreen({ activePlayer, token, onLogout, onRefreshPlayer, language, onChangeLanguage }) {
  const [name, setName] = useState(activePlayer.name);
  const [pin, setPin] = useState(activePlayer.pin);
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) {
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
          pref_court_type: prefCourtType
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
                {['Links', 'Rechts', 'Beide'].map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setNewPlayerPosition(pos)}
                    style={{
                      padding: '8px 0',
                      borderRadius: '7px',
                      border: '1px solid',
                      borderColor: newPlayerPosition === pos ? 'var(--color-primary)' : 'var(--color-border-glass)',
                      background: newPlayerPosition === pos ? 'rgba(212,255,0,0.08)' : 'transparent',
                      color: newPlayerPosition === pos ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {pos}
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

      {/* ── Main Settings Form ── */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Profile Card details */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
            {t('profileDetails')}
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
              className="input-field"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
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
                background: 'var(--color-card-bg)',
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

        </div>
 
        {/* Play Preferences */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
            {t('playPreferences')}
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

          {/* Playtime */}
          <div>
            <label style={labelStyle}>{t('preferredPlaytime')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[60, 90, 120].map(tVal => (
                <button
                  key={tVal}
                  type="button"
                  onClick={() => setPrefPlaytime(tVal)}
                  className={`btn-secondary ${prefPlaytime === tVal ? 'active-pos' : ''}`}
                  style={{
                    padding: '8px 0',
                    fontSize: '12px',
                    backgroundColor: prefPlaytime === tVal ? 'rgba(212, 255, 0, 0.1)' : 'transparent',
                    borderColor: prefPlaytime === tVal ? 'var(--color-primary)' : 'var(--color-border-glass)',
                    color: prefPlaytime === tVal ? 'var(--color-primary)' : 'var(--color-text-primary)'
                  }}
                >
                  {tVal} {t('min')}
                </button>
              ))}
            </div>
          </div>

          {/* Court type */}
          <div>
            <label style={labelStyle}>{t('preferredCourtType')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {['single', 'double'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPrefCourtType(type)}
                  className={`btn-secondary ${prefCourtType === type ? 'active-pos' : ''}`}
                  style={{
                    padding: '8px 0',
                    fontSize: '12px',
                    textTransform: 'capitalize',
                    backgroundColor: prefCourtType === type ? 'rgba(212, 255, 0, 0.1)' : 'transparent',
                    borderColor: prefCourtType === type ? 'var(--color-primary)' : 'var(--color-border-glass)',
                    color: prefCourtType === type ? 'var(--color-primary)' : 'var(--color-text-primary)'
                  }}
                >
                  {type}
                </button>
              ))}
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
