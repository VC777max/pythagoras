import React, { useState } from 'react';
import { ShieldCheck, UserPlus, LogIn, Award, BarChart2, Check, X } from 'lucide-react';
import { translate } from '../utils/i18n';

// ─── Speelsterkte Calculator ────────────────────────────────────────────────
function calcPadelRating(q1, q2, q3, q4) {
  const raw = q1 * 1.5 + q2 * 2.0 + q3 * 1.25 + q4 * 1.75;
  const rating = 9.0 - (raw / 10.5) * 8.0;
  return Math.round(rating * 2) / 2;
}

export default function LoginScreen({ onLoginSuccess, language, onChangeLanguage }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [level, setLevel] = useState('7'); // Default Padel rating 7
  const [position, setPosition] = useState('Beide');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [cq1, setCq1] = useState(-1);
  const [cq2, setCq2] = useState(-1);
  const [cq3, setCq3] = useState(-1);
  const [cq4, setCq4] = useState(-1);
  const [calcResult, setCalcResult] = useState(null);

  const t = (key) => translate(key, language);

  // rating selections for registration
  const ratingOptions = [
    { value: '9', label: '9.0 - Absolute Beginner' },
    { value: '8', label: '8.0 - Advanced Beginner' },
    { value: '7', label: '7.0 - Starter' },
    { value: '6', label: '6.0 - Intermediate' },
    { value: '5', label: '5.0 - Advanced Intermediate' },
    { value: '4', label: '4.0 - Advanced' },
    { value: '3', label: '3.0 - Highly Advanced' },
    { value: '2', label: '2.0 - Expert' },
    { value: '1', label: '1.0 - Pro / Elite' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) {
      setError(t('fillAllFields'));
      return;
    }
    setError('');
    setLoading(true);

    const url = isRegistering ? '/api/register' : '/api/login';
    const payload = isRegistering 
      ? { name, pin, level: parseInt(level), position }
      : { name, pin };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server request failed');
      }
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', width: '100%', marginTop: '40px', position: 'relative' }}>
      
      {/* Language Switcher in Login Screen top-right */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
        <button
          onClick={() => onChangeLanguage('nl')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '11px',
            fontWeight: language === 'nl' ? '900' : '400',
            color: language === 'nl' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            cursor: 'pointer'
          }}
        >
          NL
        </button>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>|</span>
        <button
          onClick={() => onChangeLanguage('en')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '11px',
            fontWeight: language === 'en' ? '900' : '400',
            color: language === 'en' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            cursor: 'pointer'
          }}
        >
          EN
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div className="pulse-primary" style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(212, 255, 0, 0.1)',
          border: '2px solid var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px auto'
        }}>
          <ShieldCheck size={28} style={{ color: 'var(--color-primary)' }} />
        </div>
        <h2 className="header-title" style={{ fontSize: '20px', color: 'var(--color-text-primary)' }}>
          {isRegistering ? t('loginHeaderCreate') : t('loginHeaderAccess')}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          {isRegistering ? t('loginSubCreate') : t('loginSubAccess')}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            {t('playerName')}
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Melvin"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              {t('pinCode')}
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {t('forgotPin')}
            </button>
          </div>
          <input
            type="password"
            maxLength={4}
            pattern="[0-9]*"
            inputMode="numeric"
            className="input-field"
            placeholder="••••"
            style={{ letterSpacing: '8px', textAlign: 'center' }}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            disabled={loading}
          />
        </div>

        {isRegistering && (
          <>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  {t('ratingLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => { setShowCalc(true); setCalcResult(null); setCq1(-1); setCq2(-1); setCq3(-1); setCq4(-1); }}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--color-primary)', fontSize: '10px',
                    fontWeight: '700', cursor: 'pointer', textDecoration: 'underline'
                  }}
                >
                  {t('calculateRatingLink')}
                </button>
              </div>
              <select
                className="input-field"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                disabled={loading}
              >
                {ratingOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                {t('preferredSide')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['Links', 'Rechts', 'Beide'].map(pos => (
                  <button
                    key={pos}
                    type="button"
                    className={`btn-secondary ${position === pos ? 'active-pos' : ''}`}
                    style={{
                      padding: '10px 0',
                      fontSize: '12px',
                      textTransform: 'none',
                      backgroundColor: position === pos ? 'rgba(212, 255, 0, 0.1)' : 'transparent',
                      borderColor: position === pos ? 'var(--color-primary)' : 'var(--color-border-glass)',
                      color: position === pos ? 'var(--color-primary)' : 'var(--color-text-primary)'
                    }}
                    onClick={() => setPosition(pos)}
                    disabled={loading}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <div style={{
            background: 'rgba(255, 71, 71, 0.1)',
            border: '1px solid var(--color-danger)',
            borderRadius: '6px',
            color: 'var(--color-danger)',
            fontSize: '12px',
            padding: '10px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? (
            t('processing')
          ) : isRegistering ? (
            <>
              <UserPlus size={16} /> {t('registerButton')}
            </>
          ) : (
            <>
              <LogIn size={16} /> {t('loginButton')}
            </>
          )}
        </button>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            disabled={loading}
          >
            {isRegistering ? t('signInLink') : t('signUpLink')}
          </button>
        </div>
      </form>

      {/* Forgot PIN Modal popup */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ padding: '24px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px' }}>{t('forgotPin')}</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
              {t('forgotPinMessage')}
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 24px', margin: '0 auto' }}
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* ── Speelsterkte Calculator Modal ── */}
      {showCalc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 20000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '480px',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px',
            background: 'rgba(15,17,26,0.97)',
            border: '1px solid var(--color-border-glass)',
            display: 'flex', flexDirection: 'column', gap: '14px',
            maxHeight: '88vh', overflowY: 'auto'
          }}>
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
                onClick={() => setShowCalc(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {[
              { q: cq1, setter: setCq1, label: t('qRacket'), opts: [t('qRacket_opt0'), t('qRacket_opt1'), t('qRacket_opt2')] },
              { q: cq2, setter: setCq2, label: t('qPadel'), opts: [t('qPadel_opt0'), t('qPadel_opt1'), t('qPadel_opt2'), t('qPadel_opt3')] },
              { q: cq3, setter: setCq3, label: t('qGlass'), opts: [t('qGlass_opt0'), t('qGlass_opt1'), t('qGlass_opt2')] },
              { q: cq4, setter: setCq4, label: t('qStrokes'), opts: [t('qStrokes_opt0'), t('qStrokes_opt1'), t('qStrokes_opt2')] }
            ].map((question, qi) => (
              <div key={qi} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border-glass)',
                borderRadius: '10px', padding: '14px'
              }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 10px 0' }}>
                  {question.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {question.opts.map((opt, oi) => {
                    const sel = question.q === oi;
                    return (
                      <button key={oi} type="button" onClick={() => question.setter(oi)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 12px',
                          borderRadius: '7px', border: '1px solid',
                          borderColor: sel ? 'var(--color-primary)' : 'var(--color-border-glass)',
                          background: sel ? 'rgba(212,255,0,0.08)' : 'rgba(255,255,255,0.02)',
                          color: sel ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s ease',
                          display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                      >
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${sel ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)'}`,
                          background: sel ? 'var(--color-primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {sel && <Check size={10} style={{ color: '#0f111a' }} />}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {calcResult !== null ? (
              <div style={{
                background: 'rgba(212,255,0,0.07)', border: '1px solid rgba(212,255,0,0.25)',
                borderRadius: '10px', padding: '16px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  {t('calcResult').replace('{rating}', '')}
                </div>
                <div style={{ fontSize: '42px', fontWeight: '900', color: 'var(--color-primary)', lineHeight: '1' }}>
                  {calcResult.toFixed(1)}
                </div>
                <button
                  type="button" className="btn-primary"
                  onClick={() => {
                    setLevel(String(Math.round(calcResult)));
                    setShowCalc(false);
                  }}
                  style={{ marginTop: '14px', width: '100%' }}
                >
                  {t('useRating')}
                </button>
              </div>
            ) : (
              <button
                type="button" className="btn-primary"
                onClick={() => {
                  if (cq1 >= 0 && cq2 >= 0 && cq3 >= 0 && cq4 >= 0) {
                    setCalcResult(calcPadelRating(cq1, cq2, cq3, cq4));
                  }
                }}
                disabled={!(cq1 >= 0 && cq2 >= 0 && cq3 >= 0 && cq4 >= 0)}
                style={{ opacity: (cq1 >= 0 && cq2 >= 0 && cq3 >= 0 && cq4 >= 0) ? 1 : 0.4 }}
              >
                {language === 'nl' ? 'Bereken Mijn Rating' : 'Calculate My Rating'}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
