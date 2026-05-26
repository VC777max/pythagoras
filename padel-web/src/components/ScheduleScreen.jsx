import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, CalendarDays } from 'lucide-react';

export default function ScheduleScreen({ activePlayer, token }) {
  const [recurringAvails, setRecurringAvails] = useState([]);
  const [onceAvails, setOnceAvails] = useState([]);
  const [loading, setLoading] = useState(false);

  // One-time slot fields
  const [onceDate, setOnceDate] = useState('');
  const [onceStart, setOnceStart] = useState('19:30');
  const [onceEnd, setOnceEnd] = useState('21:00');

  const DAYS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  const TIME_SLOTS = [
    { start: '17:00', end: '18:30' },
    { start: '18:00', end: '19:30' },
    { start: '19:30', end: '21:00' },
    { start: '20:00', end: '21:30' },
    { start: '21:00', end: '22:30' }
  ];

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

  const isSlotSelected = (day, start, end) => {
    return recurringAvails.some(a => a.day_name === day && a.start_time === start && a.end_time === end);
  };

  const handleToggleSlot = async (day, start, end) => {
    setLoading(true);
    const selected = isSlotSelected(day, start, end);
    let updatedSlots;
    if (selected) {
      updatedSlots = recurringAvails.filter(a => !(a.day_name === day && a.start_time === start));
    } else {
      updatedSlots = [...recurringAvails, { day_name: day, start_time: start, end_time: end, duration: 90 }];
    }

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
      duration: 90
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Weekly availability */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} /> Weekly Availability
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          Set your recurring weekly play times slots. Matchmaker runs automatically on overlaps.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {DAYS.map(day => (
            <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                {day}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {TIME_SLOTS.map(slot => {
                  const active = isSlotSelected(day, slot.start, slot.end);
                  return (
                    <button
                      key={slot.start}
                      onClick={() => handleToggleSlot(day, slot.start, slot.end)}
                      disabled={loading}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: active ? 'var(--color-primary)' : 'var(--color-border-glass)',
                        background: active ? 'rgba(212, 255, 0, 0.1)' : 'rgba(0,0,0,0.15)',
                        color: active ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {slot.start}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date specific / one-time availability */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={16} /> Specific Date Availability
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          Add temporary availability for a specific day only (e.g. holiday play).
        </p>

        {/* Add Slot Form */}
        <form onSubmit={handleAddOnceSlot} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Date</label>
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
            <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Start</label>
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
            <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>End</label>
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
            No date-specific slots added.
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
