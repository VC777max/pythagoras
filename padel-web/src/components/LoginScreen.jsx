import React, { useState } from 'react';
import { ShieldCheck, UserPlus, LogIn, Award } from 'lucide-react';
import { translate } from '../utils/i18n';

export default function LoginScreen({ onLoginSuccess, language, onChangeLanguage }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [level, setLevel] = useState('7'); // Default Padel rating 7
  const [position, setPosition] = useState('Beide');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

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
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                {t('ratingLabel')}
              </label>
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
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
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

    </div>
  );
}
