import React, { useState, useEffect } from 'react';
import { User, LogOut, Check, Sliders, ChevronDown } from 'lucide-react';
import { translate } from '../utils/i18n';

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

    const lvlInt = parseInt(level) || 5;
    const dbLevel = (10 - lvlInt).toString(); // inverse mapping

    try {
      const response = await fetch(`/api/players/${activePlayer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          level: parseInt(dbLevel),
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

  const availableClubs = CITIES_CLUBS[city] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Profile Card details */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--color-primary)' }}>
            {t('profileDetails')}
          </h3>
          
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
              {t('playerName')}
            </label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
              {t('pinCode')}
            </label>
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
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
              {t('city')}
            </label>
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
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Language / Taal
            </label>
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

          {/* Playtime */}
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              {t('preferredPlaytime')}
            </label>
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
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              {t('preferredCourtType')}
            </label>
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
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              {t('avatarAccent')}
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {avatarOptions.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setAvatar(opt.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
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
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                {t('preferredClubs')}
              </label>
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
      
    </div>
  );
}
