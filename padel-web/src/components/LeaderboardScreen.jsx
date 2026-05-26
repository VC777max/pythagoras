import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, Trophy, TrendingUp, Sparkles } from 'lucide-react';

export default function LeaderboardScreen({ activePlayer }) {
  const [seasonInfo, setSeasonInfo] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [biggestClimber, setBiggestClimber] = useState(null);
  const [myBadges, setMyBadges] = useState([]);

  // Map avatar IDs to initials color borders
  const avatarColors = {
    avatar_01: '#47ff75',
    avatar_02: '#47e6ff',
    avatar_03: '#b547ff',
    avatar_04: '#ff9d47',
    avatar_05: '#ff4747'
  };

  // Badge metadata mapping
  const badgeMeta = {
    first_blood: { name: 'First Blood', desc: 'First Match Win', icon: '🩸' },
    hat_trick: { name: 'Hat Trick', desc: '3 Win Streak', icon: '🎩' },
    machine: { name: 'The Machine', desc: '10 Match Wins', icon: '🤖' },
    legend: { name: 'Legend', desc: '25 Match Wins', icon: '🏆' },
    climber: { name: 'Climber', desc: 'Climb 100+ Rating Points', icon: '🧗' },
    season_king: { name: 'Season King', desc: '#1 ELO Rank at Season End', icon: '👑' },
    all_time_high: { name: 'All-Time High', desc: 'New ELO Peak Score', icon: '📈' },
    padel_addict: { name: 'Padel Addict', desc: 'Played 20 Sessions', icon: '🔥' },
    social: { name: 'Social Star', desc: 'Played with 10 players', icon: '🤝' },
    clutch: { name: 'Clutch King', desc: 'Win after losing first set', icon: '⚡' }
  };

  const loadData = async () => {
    try {
      const resSeason = await fetch('/api/seasons/current');
      if (resSeason.ok) {
        const data = await resSeason.json();
        setSeasonInfo(data.season);
        setLeaderboard(data.leaderboard);
        setBiggestClimber(data.biggest_climber);
      }
      const resBadges = await fetch(`/api/players/${activePlayer.id}/badges`);
      if (resBadges.ok) {
        setMyBadges(await resBadges.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [activePlayer.id]);

  const getPeakzRating = (elo) => {
    const r = 10.0 - (elo - 800) / 150.0;
    return Math.max(1.0, Math.min(10.0, r)).toFixed(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Season Summary Widget */}
      {seasonInfo && (
        <div className="glass-panel" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(212,255,0,0.05) 0%, rgba(30,34,47,0.45) 100%)', border: '1px solid rgba(212, 255, 0, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge-chip primary" style={{ fontSize: '9px', fontWeight: '800' }}>ACTIVE SEASON</span>
              <h3 style={{ fontSize: '16px', fontWeight: '900', marginTop: '4px' }}>{seasonInfo.name}</h3>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Ends on {seasonInfo.end_date}
              </p>
            </div>
            <Trophy size={36} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
          </div>
          
          {/* Biggest Climber delta card */}
          {biggestClimber && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border-glass)', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Biggest Climber: <strong style={{ color: '#fff' }}>{biggestClimber.name}</strong> (Climbed {biggestClimber.peakz_rating_climber_delta || biggestClimber.climber_delta} points closer to 1.0)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Badges Collection */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={15} style={{ color: 'var(--color-primary)' }} />
          My Earned Badges
        </h3>
        
        {myBadges.length === 0 ? (
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px 0' }}>
            No badges unlocked yet. Keep playing to earn fun badges!
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', justifyContent: 'center' }}>
            {myBadges.map(b => {
              const meta = badgeMeta[b.badge_id] || { name: b.badge_id, desc: 'Achievement unlocked', icon: '🏅' };
              return (
                <div key={b.badge_id} title={`${meta.name}: ${meta.desc}`} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '10px',
                  padding: '10px 4px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '20px' }}>{meta.icon}</span>
                  <span style={{ fontSize: '8px', color: 'var(--color-text-muted)', fontWeight: '700', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                    {meta.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div>
        <h3 className="header-title" style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
          Season Rankings
        </h3>
        
        <div className="glass-panel" style={{ padding: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* Header Row */}
            <div style={{ display: 'flex', padding: '10px 8px', borderBottom: '1px solid var(--color-border-glass)', fontSize: '10px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              <div style={{ width: '40px' }}>Rank</div>
              <div style={{ flex: 1 }}>Player</div>
              <div style={{ width: '80px', textAlign: 'right' }}>Peakz Rating</div>
              <div style={{ width: '60px', textAlign: 'right' }}>Record</div>
            </div>

            {/* Players Rows */}
            {leaderboard.map((player, index) => {
              const borderCol = avatarColors[player.avatar] || 'rgba(255,255,255,0.2)';
              const isMe = player.player_id === activePlayer.id;

              return (
                <div key={player.player_id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 8px',
                  borderBottom: index < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: isMe ? 'rgba(212, 255, 0, 0.04)' : 'transparent',
                  borderRadius: isMe ? '6px' : '0'
                }}>
                  <div style={{ width: '40px', fontWeight: '800', fontSize: '14px', color: index === 0 ? 'var(--color-primary)' : 'inherit' }}>
                    #{index + 1}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${borderCol}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '800'
                    }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: isMe ? '800' : '500' }}>
                      {player.name} {isMe && '(You)'}
                    </span>
                  </div>
                  <div style={{ width: '80px', textAlign: 'right', fontWeight: '800', color: 'var(--color-primary)', fontSize: '13px' }}>
                    {getPeakzRating(player.elo_current || player.elo)}
                  </div>
                  <div style={{ width: '60px', textAlign: 'right', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {player.wins}W - {player.games_played - player.wins}L
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>

    </div>
  );
}
