import React, { useState, useEffect } from 'react';
import { Award, Calendar, Zap, CheckCircle2, User, ExternalLink, Link2, DollarSign, Users, Wifi } from 'lucide-react';
import { translate } from '../utils/i18n';

export default function HomeScreen({ activePlayer, token, onRefreshPlayer, language }) {
  const [activeMatches, setActiveMatches] = useState([]);
  const [urgentLoading, setUrgentLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [tikkieUrl, setTikkieUrl] = useState(''); // kept for backward compatibility if needed, or we can just comment it out
  const [confirmingId, setConfirmingId] = useState(null);
  const [liveFriendCount, setLiveFriendCount] = useState(0);
  const [noFriendsAvailable, setNoFriendsAvailable] = useState(false);
  const [liveDuration, setLiveDuration] = useState('');

  const t = (key, replacements) => translate(key, language, replacements);

  // Helper to calculate Padel Rating from ELO
  const getPeakzRating = (elo) => {
    const r = 10.0 - (elo - 800) / 150.0;
    return Math.max(1.0, Math.min(10.0, r)).toFixed(1);
  };

  const loadActiveMatches = async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/matches/active?playerId=${activePlayer.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveMatches(data);
      }
    } catch (e) {
      console.error('Failed to load active matches:', e);
    }
  };

  useEffect(() => {
    loadActiveMatches();
    const interval = setInterval(loadActiveMatches, 10000);
    return () => clearInterval(interval);
  }, [activePlayer.id, token]);

  useEffect(() => {
    if (activePlayer.available_now !== 1) {
      setLiveDuration('');
      return;
    }
    if (!localStorage.getItem('live_since')) {
      localStorage.setItem('live_since', Date.now().toString());
    }
    const updateTimer = () => {
      const start = parseInt(localStorage.getItem('live_since') || Date.now().toString());
      const diffMs = Date.now() - start;
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setLiveDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePlayer.available_now]);

  const handleToggleUrgent = async () => {
    setUrgentLoading(true);
    setNoFriendsAvailable(false);
    const newStatus = activePlayer.available_now === 1 ? 0 : 1;
    try {
      if (newStatus === 1) {
        localStorage.setItem('live_since', Date.now().toString());
        // Going live — trigger matchmaker
        const response = await fetch('/api/matches/urgent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ player_id: activePlayer.id })
        });
        const data = await response.json();
        if (data.status === 'no_friends_available') {
          setNoFriendsAvailable(true);
        }
        onRefreshPlayer();
        loadActiveMatches();
      } else {
        localStorage.removeItem('live_since');
        // Going offline
        await fetch(`/api/players/${activePlayer.id}/available-now`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ available: 0 })
        });
        onRefreshPlayer();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUrgentLoading(false);
    }
  };

  // Load live friends count
  useEffect(() => {
    const fetchFriends = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/friends', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const friends = await res.json();
          setLiveFriendCount(friends.filter(f => f.available_now).length);
        }
      } catch (e) { console.error(e); }
    };
    fetchFriends();
    const interval = setInterval(fetchFriends, 15000);
    return () => clearInterval(interval);
  }, [token]);


  const handleRespondMatch = async (matchId, responseVal) => {
    try {
      const response = await fetch(`/api/matches/${matchId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ playerId: activePlayer.id, response: responseVal })
      });
      if (response.ok) {
        loadActiveMatches();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaimBooking = async (matchId) => {
    setClaimingId(matchId);
    try {
      const response = await fetch(`/api/matches/${matchId}/claim-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ player_id: activePlayer.id })
      });
      if (response.ok) {
        loadActiveMatches();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClaimingId(null);
    }
  };

  const handleConfirmBooked = async (matchId) => {
    setConfirmingId(matchId);
    try {
      const matchObj = activeMatches.find(m => m.id === matchId);
      const cleanLoc = matchObj.location.replace("Peakz Padel ", "");
      const encodedLoc = encodeURIComponent(cleanLoc);
      const playtime = activePlayer.pref_playtime || 90;
      const typeId = activePlayer.pref_court_type === "single" ? 10 : 13;
      const generatedBookingUrl = `https://www.peakzpadel.nl/reserveren/court-booking/reservation?daypart=---&date=${matchObj.date}&location=${encodedLoc}&playingTimes=${playtime}&courtTypeIds=${typeId}`;

      const response = await fetch(`/api/matches/${matchId}/confirm-booked`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          player_id: activePlayer.id,
          booking_url: generatedBookingUrl,
          tikkie_url: null
        })
      });
      if (response.ok) {
        loadActiveMatches();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Player Header Card */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'var(--color-primary)',
          color: 'var(--color-bg-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: '900'
        }}>
          {activePlayer.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>{activePlayer.name}</h2>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <span className="badge-chip primary">
              <Award size={10} /> {t('rating')}: {getPeakzRating(activePlayer.elo)}
            </span>
            <span className="badge-chip">
              {activePlayer.city}
            </span>
          </div>
        </div>
      </div>

      {/* Play Within The Hour Urgent Toggle */}
      <div className="glass-panel" style={{ padding: '16px', border: activePlayer.available_now === 1 ? '1px dashed var(--color-primary)' : '1px solid var(--color-border-glass)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ paddingRight: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} style={{ color: activePlayer.available_now === 1 ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
              {t('liveHourTitle')}
              {activePlayer.available_now === 1 && liveDuration && (
                <span style={{ fontSize: '10px', background: 'rgba(212,255,0,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-primary)', fontWeight: '700' }}>
                  {liveDuration}
                </span>
              )}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
              {t('liveHourSub', { city: activePlayer.city })}
            </p>
            {/* Match mode indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              {activePlayer.match_mode === 'friends'
                ? <><Users size={10} style={{ color: 'var(--color-primary)' }} /><span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '700' }}>{t('matchModeFriends')}</span></>
                : <><Wifi size={10} style={{ color: 'var(--color-text-muted)' }} /><span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{t('matchModeOpen')}</span></>}
              {activePlayer.match_mode === 'friends' && liveFriendCount > 0 && (
                <span style={{ fontSize: '10px', background: 'rgba(71,255,117,0.1)', border: '1px solid rgba(71,255,117,0.3)', borderRadius: '8px', padding: '1px 6px', color: '#47ff75' }}>
                  {t('friendsOnline', { count: liveFriendCount })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleToggleUrgent}
            disabled={urgentLoading}
            style={{
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activePlayer.available_now === 1 ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
              color: activePlayer.available_now === 1 ? 'var(--color-bg-dark)' : 'var(--color-text-primary)',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {activePlayer.available_now === 1 ? t('liveHourActive') : t('liveHourGoLive')}
          </button>
        </div>

        {/* No friends available fallback */}
        {noFriendsAvailable && activePlayer.match_mode === 'friends' && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(255,165,0,0.06)',
            border: '1px solid rgba(255,165,0,0.25)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <p style={{ fontSize: '12px', color: '#ffb347', lineHeight: '1.5', margin: 0 }}>
              {t('noFriendsAvailable', { count: liveFriendCount })}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={async () => {
                  setNoFriendsAvailable(false);
                  setUrgentLoading(true);
                  try {
                    const res = await fetch('/api/matches/urgent', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ player_id: activePlayer.id, force_open: true })
                    });
                    await res.json();
                    onRefreshPlayer();
                    loadActiveMatches();
                  } catch(e) { console.error(e); }
                  setUrgentLoading(false);
                }}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,165,0,0.4)', background: 'rgba(255,165,0,0.1)', color: '#ffb347', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                {t('switchToOpen')}
              </button>
              <button
                type="button"
                onClick={() => setNoFriendsAvailable(false)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border-glass)', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '11px', cursor: 'pointer' }}
              >
                {t('keepWaiting')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Matches List */}
      <div>
        <h3 className="header-title" style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
          {t('activeMatchesTitle')}
        </h3>
        
        {activeMatches.length === 0 ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Calendar size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
            <p style={{ fontSize: '13px' }}>{t('noActiveMatches')}</p>
            <p style={{ fontSize: '11px', marginTop: '2px' }}>{t('checkBackLater')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeMatches.map(match => {
              const iAmClaimer = match.booking_claimed_by === activePlayer.id;
              const hasBooker = match.booking_claimed_by != null;
              const isBooked = match.status === 'booked';
              const cleanLocation = match.location.replace("Peakz Padel ", "Padel Club ");

              return (
                <div key={match.id} className="glass-panel" style={{ padding: '16px', position: 'relative', overflow: 'hidden' }}>
                  
                  {/* Status Indicator Bar */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: isBooked ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.15)'
                  }} />

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '800' }}>{cleanLocation}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {match.date} • {match.start} - {match.end}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                      <span className={`badge-chip ${isBooked ? 'primary' : ''}`} style={{ fontSize: '9px' }}>
                        {match.status.toUpperCase()}
                      </span>
                      {match.match_type && (
                        <span className="badge-chip" style={{ fontSize: '9px', background: match.match_type === 'ranked' ? 'rgba(255,165,0,0.1)' : 'rgba(71,255,117,0.1)', color: match.match_type === 'ranked' ? '#ffb347' : '#47ff75', border: '1px solid currentColor' }}>
                          {match.match_type.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Team Members */}
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px' }}>TEAM 1</div>
                      {match.players.filter(p => p.team_number === 1).map(p => (
                        <div key={p.id} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={10} /> {p.name}
                          </span>
                          {match.status === 'proposed' && (
                            <span style={{ fontSize: '11px' }}>
                              {match.responses[p.id] === 'accepted' ? '✅' : '⏳'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px' }}>TEAM 2</div>
                      {match.players.filter(p => p.team_number === 2).map(p => (
                        <div key={p.id} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={10} /> {p.name}
                          </span>
                          {match.status === 'proposed' && (
                            <span style={{ fontSize: '11px' }}>
                              {match.responses[p.id] === 'accepted' ? '✅' : '⏳'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proposed match flow */}
                  {match.status === 'proposed' && (
                    <div style={{ marginTop: '12px' }}>
                      {match.responses[activePlayer.id] === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-primary"
                            onClick={() => handleRespondMatch(match.id, 'accepted')}
                            style={{ flex: 1, padding: '8px 0', fontSize: '12px', background: 'var(--color-primary)', color: '#0f111a', fontWeight: '700', cursor: 'pointer' }}
                          >
                            {t('accept')}
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => handleRespondMatch(match.id, 'rejected')}
                            style={{ flex: 1, padding: '8px 0', fontSize: '12px', borderColor: 'var(--color-danger)', color: 'var(--color-danger)', cursor: 'pointer' }}
                          >
                            {t('decline')}
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--color-border-glass)', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={14} style={{ color: 'var(--color-primary)' }} />
                          <span>{language === 'nl' ? 'Je hebt geaccepteerd! Wachten op anderen...' : 'You accepted! Waiting for others...'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Booker flow logic (Only for confirmed status) */}
                  {match.status === 'confirmed' && (
                    <div style={{ marginTop: '10px' }}>
                      {!hasBooker ? (
                        <button
                          className="btn-primary"
                          onClick={() => handleClaimBooking(match.id)}
                          disabled={claimingId === match.id}
                        >
                          {t('illBook')}
                        </button>
                      ) : iAmClaimer ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 71, 71, 0.05)', border: '1px solid rgba(255, 71, 71, 0.2)', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--color-danger)', letterSpacing: '0.05em' }}>
                            {t('yourTurn')}
                          </div>
                          
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              const cleanLoc = match.location.replace("Peakz Padel ", "");
                              const encodedLoc = encodeURIComponent(cleanLoc);
                              const playtime = activePlayer.pref_playtime || 90;
                              const typeId = activePlayer.pref_court_type === "single" ? 10 : 13;
                              const targetUrl = `https://www.peakzpadel.nl/reserveren/court-booking/reservation?daypart=---&date=${match.date}&location=${encodedLoc}&playingTimes=${playtime}&courtTypeIds=${typeId}`;
                              window.open(targetUrl, '_blank');
                            }}
                            style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px', padding: '10px' }}
                          >
                            <ExternalLink size={14} /> {t('openBooking')}
                          </button>

                          <button
                            className="btn-primary"
                            onClick={() => handleConfirmBooked(match.id)}
                            disabled={confirmingId === match.id}
                            style={{ fontSize: '12px', padding: '10px', background: 'var(--color-primary)' }}
                          >
                            {t('confirmBooked')}
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--color-border-glass)', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={14} style={{ color: 'var(--color-primary)' }} />
                          <span>{t('waitingForBooker')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isBooked && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      {match.booking_url && (
                        <button
                          className="btn-secondary"
                          onClick={() => window.open(match.booking_url, '_blank')}
                          style={{ flex: 1, padding: '8px 0', fontSize: '11px', gap: '4px' }}
                        >
                          <Link2 size={12} /> {t('viewReservation')}
                        </button>
                      )}
                      {/* Tikkie button removed */}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
