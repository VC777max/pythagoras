import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Wind, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { translate } from '../utils/i18n';

export default function CourtsScreen({ activePlayer, language }) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(false);

  const t = (key, replacements) => translate(key, language, replacements);

  // Generate target dates (Today, Tomorrow, +2 Days)
  const getDates = () => {
    const dates = [];
    const daysKey = ['today', 'tomorrow', 'plus2Days'];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push({
        label: t(daysKey[i]),
        formatted: `${yyyy}-${mm}-${dd}`
      });
    }
    return dates;
  };

  const datesList = getDates();

  const loadCourts = async (dateStr) => {
    setLoading(true);
    const city = activePlayer.city || 'Groningen';
    const playtime = activePlayer.pref_playtime || 90;
    const courtType = activePlayer.pref_court_type || 'double';

    try {
      const response = await fetch(`/api/courts?date=${dateStr}&city=${city}&playtime=${playtime}&court_type=${courtType}`);
      if (response.ok) {
        const data = await response.json();
        setCourts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourts(datesList[selectedTab].formatted);
  }, [selectedTab, activePlayer.pref_playtime, activePlayer.pref_court_type, activePlayer.city]);

  const getWeatherIcon = (code) => {
    if (code >= 50) return <CloudRain size={14} style={{ color: 'var(--color-danger)' }} />;
    return <Sun size={14} style={{ color: 'var(--color-primary)' }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Date selector tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {datesList.map((dt, idx) => (
          <button
            key={dt.formatted}
            onClick={() => setSelectedTab(idx)}
            style={{
              padding: '12px 0',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: selectedTab === idx ? 'var(--color-primary)' : 'var(--color-border-glass)',
              background: selectedTab === idx ? 'rgba(212, 255, 0, 0.1)' : 'rgba(22, 25, 35, 0.45)',
              color: selectedTab === idx ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-header)',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.2s ease'
            }}
          >
            {dt.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="header-title" style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {t('availableCourtsIn', { city: activePlayer.city || 'Groningen' })}
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '700' }}>
          {t('filters')}: {activePlayer.pref_playtime}m • {activePlayer.pref_court_type === 'single' ? 'Single' : 'Double'}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          {t('searchingCourts')}
        </div>
      ) : courts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: '13px' }}>{t('noCourtsFound')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {courts.map((court, index) => {
            const cleanLoc = court.location.replace("Peakz Padel ", "");
            const encodedLoc = encodeURIComponent(cleanLoc);
            const playtime = activePlayer.pref_playtime || 90;
            const typeId = activePlayer.pref_court_type === "single" ? 10 : 13;
            const bookUrl = `https://www.peakzpadel.nl/reserveren/court-booking/reservation?daypart=---&date=${court.date}&location=${encodedLoc}&playingTimes=${playtime}&courtTypeIds=${typeId}`;
            const displayLocation = court.location.replace("Peakz Padel ", "Padel Club ");

            return (
              <div key={index} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800' }}>{displayLocation}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {court.time} • {court.courtType}
                  </span>
                  
                  {/* Weather Info */}
                  {court.weather && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getWeatherIcon(court.weather.weather_code)} {court.weather.temperature}°C
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Wind size={12} /> {court.weather.wind_speed} km/h
                      </span>
                      
                      {!court.weather.is_playable && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-danger)', fontWeight: '700' }}>
                          <AlertTriangle size={11} /> {t('weatherRisk')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--color-primary)' }}>
                    {court.price}
                  </span>
                  <button
                    onClick={() => window.open(bookUrl, '_blank')}
                    className="btn-primary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      width: 'auto',
                      gap: '4px'
                    }}
                  >
                    {t('bookBtn')} <ExternalLink size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
