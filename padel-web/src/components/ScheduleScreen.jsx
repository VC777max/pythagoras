import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, CalendarDays, CheckCircle2 } from 'lucide-react';
import { translate } from '../utils/i18n';

export default function ScheduleScreen({ activePlayer, token, language }) {
  const [recurringAvails, setRecurringAvails] = useState([]);
  const [onceAvails, setOnceAvails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // One-time slot fields
  const [onceDate, setOnceDate] = useState('');
  const [onceStart, setOnceStart] = useState('19:30');
  const [onceEnd, setOnceEnd] = useState('21:00');

  const t = (key, replacements) => translate(key, language, replacements);

  const DAYS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  
  // Generate 30-minute start times from 08:00 to 22:30
  const START_TIMES = [];
  for (let h = 8; h <= 22; h++) {
    START_TIMES.push(`${String(h).padStart(2, '0')}:00`);
    START_TIMES.push(`${String(h).padStart(2, '0')}:30`);
  }

  const addMinutesToTime = (timeStr, minutes) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const loadAvailability = async () => {
    if (!token) return;
    try {
      const resRec = await fetch(`/api/players/${activePlayer.id}/availability`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resOnce = await fetch(`/api/players/${activePlayer.id}/availability/once`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRec.ok && resOnce.ok) {
        setRecurringAvails(await resRec.json());
        setOnceAvails(await resOnce.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [activePlayer.id, token]);

  const triggerSaveToast = () => {
    setShowSaveToast(true);
    setTimeout(() => {
      setShowSaveToast(false);
    }, 2000);
  };

  const handleAddSlot = async (day, startTime) => {
    setLoading(true);
    const playtime = activePlayer.pref_playtime || 90;
    const endTime = addMinutesToTime(startTime, playtime);
    
    const newSlot = {
      day_name: day,
      start_time: startTime,
      end_time: endTime,
      duration: playtime
    };

    const updatedSlots = [...recurringAvails, newSlot];

    try {
      const response = await fetch(`/api/players/${activePlayer.id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedSlots)
      });
      if (response.ok) {
        await loadAvailability();
        triggerSaveToast();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSlot = async (day, startTime) => {
    setLoading(true);
    const updatedSlots = recurringAvails.filter(a => !(a.day_name === day && a.start_time === startTime));

    try {
      const response = await fetch(`/api/players/${activePlayer.id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedSlots)
      });
      if (response.ok) {
        await loadAvailability();
        triggerSaveToast();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOnceSlot = async (e) => {
    e.preventDefault();
    if (!onceDate || !onceStart || !onceEnd) return;

    const newSlot = {
      date: onceDate,
      start_time: onceStart,
      end_time: onceEnd,
      duration: activePlayer.pref_playtime || 90
    };
    const updatedSlots = [...onceAvails, newSlot];

    try {
      const response = await fetch(`/api/players/${activePlayer.id}/availability/once`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedSlots)
      });
      if (response.ok) {
        setOnceDate('');
        await loadAvailability();
        triggerSaveToast();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteOnceSlot = async (date, start) => {
    const updatedSlots = onceAvails.filter(s => !(s.date === date && s.start_time === start));
    try {
      const response = await fetch(`/api/players/${activePlayer.id}/availability/once`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedSlots)
      });
      if (response.ok) {
        await loadAvailability();
        triggerSaveToast();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      
      {/* Floating Save Toast */}
      {showSaveToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(71, 255, 117, 0.95)',
          color: 'var(--color-bg-dark)',
          fontWeight: '800',
          fontSize: '12px',
          padding: '10px 20px',
          borderRadius: '50px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(71, 255, 117, 0.3)',
          zIndex: 1000,
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={16} />
          {t('autoSaved')}
        </div>
      )}

      {/* Weekly availability */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} /> {t('weeklyAvailTitle')}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          {t('weeklyAvailSub')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {DAYS.map(day => {
            const daySlots = recurringAvails.filter(a => a.day_name === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
            return (
              <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    {day}
                  </span>
                  
                  {/* Inline Add dropdown */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddSlot(day, e.target.value);
                        e.target.value = ''; // reset select
                      }
                    }}
                    disabled={loading}
                    className="input-field"
                    style={{
                      width: 'auto',
                      padding: '4px 10px',
                      fontSize: '10px',
                      height: 'auto',
                      cursor: 'pointer',
                      border: '1px solid var(--color-border-glass)',
                      background: 'rgba(255,255,255,0.04)'
                    }}
                  >
                    <option value="">+ {t('addSlot')}</option>
                    {START_TIMES.map(tStr => {
                      const isSelected = daySlots.some(s => s.start_time === tStr);
                      if (isSelected) return null;
                      return <option key={tStr} value={tStr}>{tStr}</option>;
                    })}
                  </select>
                </div>

                {/* Selected Slots List */}
                {daySlots.length === 0 ? (
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', paddingLeft: '4px' }}>
                    -
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    {daySlots.map(slot => (
                      <div
                        key={slot.start_time}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-primary)',
                          background: 'rgba(212, 255, 0, 0.08)',
                          color: 'var(--color-primary)',
                          fontSize: '11px',
                          fontWeight: '800'
                        }}
                      >
                        <span>{slot.start_time} - {slot.end_time}</span>
                        <button
                          onClick={() => handleRemoveSlot(day, slot.start_time)}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            padding: 0,
                            alignItems: 'center',
                            opacity: 0.8
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Date specific / one-time availability */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={16} /> {t('specificAvailTitle')}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          {t('specificAvailSub')}
        </p>

        {/* Add Slot Form */}
        <form onSubmit={handleAddOnceSlot} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('date')}</label>
            <input
              type="date"
              className="input-field"
              value={onceDate}
              onChange={(e) => setOnceDate(e.target.value)}
              style={{ padding: '8px', fontSize: '12px' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('start')}</label>
            <input
              type="time"
              className="input-field"
              value={onceStart}
              onChange={(e) => setOnceStart(e.target.value)}
              style={{ padding: '8px', fontSize: '12px' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('end')}</label>
            <input
              type="time"
              className="input-field"
              value={onceEnd}
              onChange={(e) => setOnceEnd(e.target.value)}
              style={{ padding: '8px', fontSize: '12px' }}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '10px', minWidth: '40px', display: 'flex', justifyContent: 'center' }}>
            <Plus size={16} />
          </button>
        </form>

        {/* List of Once Slots */}
        {onceAvails.length === 0 ? (
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px 0' }}>
            {t('noSpecificSlots')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {onceAvails.map(a => (
              <div key={`${a.date}_${a.start_time}`} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.03)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-glass)'
              }}>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ fontWeight: '700' }}>{a.date}</span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                    {a.start_time} - {a.end_time}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteOnceSlot(a.date, a.start_time)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    opacity: 0.8
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
