import React, { useState, useEffect } from 'react';
import { Award, Calendar, Zap, CheckCircle2, User, ExternalLink, Link2, DollarSign } from 'lucide-react';

export default function HomeScreen({ activePlayer, token, onRefreshPlayer }) {
  const [activeMatches, setActiveMatches] = useState([]);
  const [urgentLoading, setUrgentLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [tikkieUrl, setTikkieUrl] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);

  // Helper to calculate Peakz Rating from ELO
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
    // Refresh match list every 10 seconds
    const interval = setInterval(loadActiveMatches, 10000);
    return () => clearInterval(interval);
  }, [activePlayer.id, token]);

  const handleToggleUrgent = async () => {
    setUrgentLoading(true);
    const newStatus = activePlayer.available_now === 1 ? 0 : 1;
    try {
      const response = await fetch(`/api/players/${activePlayer.id}/available-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ available: newStatus })
      });
      if (response.ok) {
        onRefreshPlayer();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUrgentLoading(false);
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
      // Find the match to get details
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
          tikkie_url: tikkieUrl.trim() || null
        })
      });
      if (response.ok) {
        setTikkieUrl('');
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
              <Award size={10} /> Peakz Rating: {getPeakzRating(activePlayer.elo)}
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
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} style={{ color: activePlayer.available_now === 1 ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
              Play Within The Hour
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Toggle on to match instantly with active players at {activePlayer.city} clubs.
            </p>
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
              transition: 'all 0.2s ease'
            }}
          >
            {activePlayer.available_now === 1 ? 'ACTIVE' : 'GO LIVE'}
          </button>
        </div>
      </div>

      {/* Matches List */}
      <div>
        <h3 className="header-title" style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
          My Active Matches
        </h3>
        
        {activeMatches.length === 0 ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Calendar size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
            <p style={{ fontSize: '13px' }}>No active or upcoming matches matches.</p>
            <p style={{ fontSize: '11px', marginTop: '2px' }}>Check back later or adjust your availability.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeMatches.map(match => {
              const iAmClaimer = match.booking_claimed_by === activePlayer.id;
              const hasBooker = match.booking_claimed_by != null;
              const isBooked = match.status === 'booked';

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
                      <h4 style={{ fontSize: '14px', fontWeight: '800' }}>{match.location}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {match.date} • {match.start} - {match.end}
                      </p>
                    </div>
                    <span className={`badge-chip ${isBooked ? 'primary' : ''}`} style={{ fontSize: '9px' }}>
                      {match.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Team Members */}
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px' }}>TEAM 1</div>
                      {match.players.filter(p => p.team_number === 1).map(p => (
                        <div key={p.id} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
                          <User size={10} /> {p.name}
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px' }}>TEAM 2</div>
                      {match.players.filter(p => p.team_number === 2).map(p => (
                        <div key={p.id} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
                          <User size={10} /> {p.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Booker flow logic */}
                  {!isBooked && (
                    <div style={{ marginTop: '10px' }}>
                      {!hasBooker ? (
                        <button
                          className="btn-primary"
                          onClick={() => handleClaimBooking(match.id)}
                          disabled={claimingId === match.id}
                        >
                          I'll Book the Court!
                        </button>
                      ) : iAmClaimer ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 71, 71, 0.05)', border: '1px solid rgba(255, 71, 71, 0.2)', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--color-danger)', letterSpacing: '0.05em' }}>
                            YOUR TURN TO BOOK THE COURT
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
                            <ExternalLink size={14} /> Open Peakz Booking Page
                          </button>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                            <label style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '700' }}>Tikkie Payment Link (Optional)</label>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="https://tikkie.me/pay/..."
                              value={tikkieUrl}
                              onChange={(e) => setTikkieUrl(e.target.value)}
                              style={{ padding: '8px 12px', fontSize: '12px' }}
                            />
                          </div>

                          <button
                            className="btn-primary"
                            onClick={() => handleConfirmBooked(match.id)}
                            disabled={confirmingId === match.id}
                            style={{ fontSize: '12px', padding: '10px', background: 'var(--color-primary)' }}
                          >
                            Confirm Court Booked!
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--color-border-glass)', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={14} style={{ color: 'var(--color-primary)' }} />
                          <span>Waiting for booker to complete court booking...</span>
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
                          <Link2 size={12} /> View Reservation
                        </button>
                      )}
                      {match.tikkie_url && (
                        <button
                          className="btn-primary"
                          onClick={() => window.open(match.tikkie_url, '_blank')}
                          style={{ flex: 1, padding: '8px 0', fontSize: '11px', gap: '4px', background: '#30c553', color: '#fff' }}
                        >
                          <DollarSign size={12} /> Pay Booker (Tikkie)
                        </button>
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
