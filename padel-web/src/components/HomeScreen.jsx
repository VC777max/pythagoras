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

  // Score Entry States
  const [enteringScoreMatchId, setEnteringScoreMatchId] = useState(null);
  const [set1Team1, setSet1Team1] = useState('');
  const [set1Team2, setSet1Team2] = useState('');
  const [set2Team1, setSet2Team1] = useState('');
  const [set2Team2, setSet2Team2] = useState('');
  const [set3Team1, setSet3Team1] = useState('');
  const [set3Team2, setSet3Team2] = useState('');
  const [scoreError, setScoreError] = useState('');
  const [submittingScoreId, setSubmittingScoreId] = useState(null);
  const [verifyingMatchId, setVerifyingMatchId] = useState(null);

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

  const handleSubmitScore = async (matchId) => {
    const s1t1 = parseInt(set1Team1);
    const s1t2 = parseInt(set1Team2);
    const s2t1 = parseInt(set2Team1);
    const s2t2 = parseInt(set2Team2);

    if (isNaN(s1t1) || isNaN(s1t2) || isNaN(s2t1) || isNaN(s2t2)) {
      setScoreError(language === 'nl' ? 'Vul minstens Set 1 en Set 2 in.' : 'Please fill in at least Set 1 and Set 2.');
      return;
    }

    let team1Sets = 0;
    let team2Sets = 0;
    const sets = [];

    if (s1t1 > s1t2) team1Sets++;
    else if (s1t2 > s1t1) team2Sets++;
    sets.push([s1t1, s1t2]);

    if (s2t1 > s2t2) team1Sets++;
    else if (s2t2 > s2t1) team2Sets++;
    sets.push([s2t1, s2t2]);

    const s3t1 = parseInt(set3Team1);
    const s3t2 = parseInt(set3Team2);
    if (!isNaN(s3t1) && !isNaN(s3t2)) {
      if (s3t1 > s3t2) team1Sets++;
      else if (s3t2 > s3t1) team2Sets++;
      sets.push([s3t1, s3t2]);
    } else if (team1Sets === 1 && team2Sets === 1) {
      setScoreError(language === 'nl' ? 'Set 3 is verplicht bij een gelijke stand (1-1).' : 'Set 3 is required when sets are tied 1-1.');
      return;
    }

    if (team1Sets === team2Sets) {
      setScoreError(language === 'nl' ? 'Er moet een winnaar zijn.' : 'There must be a clear winning team.');
      return;
    }

    setSubmittingScoreId(matchId);
    setScoreError('');

    try {
      const response = await fetch(`/api/matches/${matchId}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submitted_by: activePlayer.id,
          score: {
            sets,
            team1_games: team1Sets,
            team2_games: team2Sets
          }
        })
      });
      if (response.ok) {
        setEnteringScoreMatchId(null);
        setSet1Team1('');
        setSet1Team2('');
        setSet2Team1('');
        setSet2Team2('');
        setSet3Team1('');
        setSet3Team2('');
        loadActiveMatches();
      } else {
        const data = await response.json();
        setScoreError(data.error || 'Failed to submit score');
      }
    } catch (e) {
      console.error(e);
      setScoreError('Network error');
    } finally {
      setSubmittingScoreId(null);
    }
  };

  const handleVerifyScore = async (matchId, approved) => {
    setVerifyingMatchId(matchId);
    try {
      const response = await fetch(`/api/matches/${matchId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          playerId: activePlayer.id,
          approved
        })
      });
      if (response.ok) {
        loadActiveMatches();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifyingMatchId(null);
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

                  {/* Score Submission & Verification Section */}
                  {(match.status === 'booked' || match.status === 'confirmed') && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                      {!match.score ? (
                        /* No score submitted yet */
                        enteringScoreMatchId === match.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary)' }}>
                              {t('enterScore')}
                            </div>
                            
                            {/* Score Inputs */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {/* Set 1 */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{t('set1')}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    placeholder="T1"
                                    value={set1Team1}
                                    onChange={(e) => setSet1Team1(e.target.value)}
                                    style={{ width: '45px', padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border-glass)', borderRadius: '4px', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                                  />
                                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>-</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    placeholder="T2"
                                    value={set1Team2}
                                    onChange={(e) => setSet1Team2(e.target.value)}
                                    style={{ width: '45px', padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border-glass)', borderRadius: '4px', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                                  />
                                </div>
                              </div>

                              {/* Set 2 */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{t('set2')}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    placeholder="T1"
                                    value={set2Team1}
                                    onChange={(e) => setSet2Team1(e.target.value)}
                                    style={{ width: '45px', padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border-glass)', borderRadius: '4px', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                                  />
                                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>-</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    placeholder="T2"
                                    value={set2Team2}
                                    onChange={(e) => setSet2Team2(e.target.value)}
                                    style={{ width: '45px', padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border-glass)', borderRadius: '4px', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                                  />
                                </div>
                              </div>

                              {/* Set 3 */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{t('set3')}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    placeholder="T1"
                                    value={set3Team1}
                                    onChange={(e) => setSet3Team1(e.target.value)}
                                    style={{ width: '45px', padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border-glass)', borderRadius: '4px', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                                  />
                                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>-</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    placeholder="T2"
                                    value={set3Team2}
                                    onChange={(e) => setSet3Team2(e.target.value)}
                                    style={{ width: '45px', padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border-glass)', borderRadius: '4px', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Error Msg */}
                            {scoreError && (
                              <div style={{ fontSize: '10px', color: 'var(--color-danger)', marginTop: '4px' }}>
                                {scoreError}
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handleSubmitScore(match.id)}
                                disabled={submittingScoreId === match.id}
                                style={{ flex: 1, padding: '6px 0', fontSize: '11px' }}
                              >
                                {t('submitScore')}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => {
                                  setEnteringScoreMatchId(null);
                                  setScoreError('');
                                }}
                                style={{ flex: 1, padding: '6px 0', fontSize: '11px' }}
                              >
                                {t('cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setEnteringScoreMatchId(match.id);
                              setSet1Team1('');
                              setSet1Team2('');
                              setSet2Team1('');
                              setSet2Team2('');
                              setSet3Team1('');
                              setSet3Team2('');
                              setScoreError('');
                            }}
                            style={{ width: '100%', padding: '8px 0', fontSize: '11px' }}
                          >
                            {t('enterScore')}
                          </button>
                        )
                      ) : (
                        /* Score exists and is pending or confirmed */
                        match.score.status === 'pending' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#ffb347', textAlign: 'center' }}>
                              {language === 'nl' ? 'Ingevoerde Stand (bevestiging vereist):' : 'Submitted Score (verification pending):'}
                            </div>
                            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '13px', fontWeight: '900', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '4px' }}>
                              {match.score.sets.map((s, idx) => (
                                <span key={idx} style={{ color: 'var(--color-text-primary)' }}>
                                  {s[0]}-{s[1]}
                                </span>
                              ))}
                            </div>
                            
                            {match.score.verify_by.includes(activePlayer.id) ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                  {t('verifyOpponentScore')}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => handleVerifyScore(match.id, true)}
                                    disabled={verifyingMatchId === match.id}
                                    style={{ flex: 1, padding: '6px 0', fontSize: '11px', background: 'var(--color-primary)', color: '#0f111a' }}
                                  >
                                    {t('approve')}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => handleVerifyScore(match.id, false)}
                                    disabled={verifyingMatchId === match.id}
                                    style={{ flex: 1, padding: '6px 0', fontSize: '11px', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                                  >
                                    {t('reject')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                                {t('waitingForVerification')}
                              </div>
                            )}
                          </div>
                        )
                      )}
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
