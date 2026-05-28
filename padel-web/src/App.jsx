import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, Clock, MapPin, Trophy, Settings as SettingsIcon, Bell, Check } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import ScheduleScreen from './components/ScheduleScreen';
import CourtsScreen from './components/CourtsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import SettingsScreen from './components/SettingsScreen';
import { getLanguage, setLanguage, translate } from './utils/i18n';
import HeroFuturistic from './components/ui/HeroFuturistic';

export default function App() {
  const [activePlayer, setActivePlayer] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState(getLanguage());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Load player and token from localStorage on mount
  useEffect(() => {
    const savedPlayer = localStorage.getItem('padel_active_player');
    const savedToken = localStorage.getItem('padel_auth_token');
    if (savedPlayer && savedToken) {
      try {
        setActivePlayer(JSON.parse(savedPlayer));
        setToken(savedToken);
      } catch (e) {
        localStorage.removeItem('padel_active_player');
        localStorage.removeItem('padel_auth_token');
      }
    }
    setLoading(false);
  }, []);

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => n.read === 0).length);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        loadNotifications();
      }
    } catch (e) {
      console.error('Failed to mark notifications as read:', e);
    }
  };

  useEffect(() => {
    if (token) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      
      // Register Web Push
      const registerPushNotifications = async (authToken) => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.warn('Push messaging is not supported in this browser.');
          return;
        }
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          let permission = Notification.permission;
          if (permission === 'default') {
            permission = await Notification.requestPermission();
          }
          if (permission !== 'granted') return;

          const keyRes = await fetch('/api/vapid-public-key');
          if (!keyRes.ok) return;
          const { publicKey } = await keyRes.json();

          const urlBase64ToUint8Array = (base64String) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
          };

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });

          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ subscription })
          });
          console.log('[PUSH] Web Push subscription registered.');
        } catch (err) {
          console.error('Failed to register push notifications:', err);
        }
      };

      registerPushNotifications(token);

      return () => clearInterval(interval);
    }
  }, [token]);

  const handleLoginSuccess = (data) => {
    setActivePlayer(data.player);
    setToken(data.token);
    localStorage.setItem('padel_active_player', JSON.stringify(data.player));
    localStorage.setItem('padel_auth_token', data.token);
  };

  const handleLogout = () => {
    setActivePlayer(null);
    setToken(null);
    localStorage.removeItem('padel_active_player');
    localStorage.removeItem('padel_auth_token');
    setActiveTab('home');
  };

  const refreshPlayer = async () => {
    if (!activePlayer || !token) return;
    try {
      const response = await fetch(`/api/players`);
      if (response.ok) {
        const playersList = await response.json();
        const freshData = playersList.find(p => p.id === activePlayer.id);
        if (freshData) {
          setActivePlayer(freshData);
          localStorage.setItem('padel_active_player', JSON.stringify(freshData));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeLanguage = (lang) => {
    setLanguage(lang);
    setLanguageState(lang);
  };

  const t = (key, replacements) => translate(key, language, replacements);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-dark)',
        color: 'var(--color-text-muted)',
        fontSize: '14px'
      }}>
        Loading Padel Matcher...
      </div>
    );
  }

  if (showSplash && (!activePlayer || !token)) {
    return (
      <HeroFuturistic language={language} onExplore={() => setShowSplash(false)} />
    );
  }

  if (!activePlayer || !token) {
    return (
      <div className="container" style={{ justifyContent: 'center' }}>
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          language={language} 
          onChangeLanguage={handleChangeLanguage} 
        />
      </div>
    );
  }

  return (
    <div className="container" style={{ position: 'relative' }}>
      
      {/* Top Header with App Name and Notification Bell */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 4px',
        borderBottom: '1px solid var(--color-border-glass)',
        marginBottom: '16px',
        position: 'relative'
      }}>
        <h1 className="header-title" style={{ fontSize: '18px', color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
          Padel Matcher
        </h1>
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) {
                // Fetch latest notifications on open
                loadNotifications();
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border-glass)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            <Bell size={18} />
          </button>
          
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--color-danger)',
              color: '#fff',
              fontSize: '8px',
              fontWeight: '900',
              borderRadius: '10px',
              padding: '2px 5px',
              border: '2px solid var(--color-bg-dark)',
              pointerEvents: 'none'
            }}>
              {unreadCount}
            </span>
          )}

          {/* Notifications Dropdown menu */}
          {showNotifications && (
            <div className="glass-panel" style={{
              position: 'absolute',
              top: '44px',
              right: 0,
              width: '285px',
              maxHeight: '380px',
              overflowY: 'auto',
              zIndex: 1000,
              background: 'rgba(15, 17, 26, 0.95)',
              border: '1px solid var(--color-border-glass)',
              borderRadius: '10px',
              padding: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                  {t('notificationsTitle')}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      fontSize: '10px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {t('markAllRead')}
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '300px' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    {t('noNotifications')}
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (notif.read === 0) {
                          fetch(`/api/notifications/read-all`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                          }).then(() => loadNotifications());
                        }
                        setActiveTab('home');
                        setShowNotifications(false);
                      }}
                      style={{
                        padding: '10px',
                        background: notif.read === 0 ? 'rgba(212,255,0,0.05)' : 'rgba(255,255,255,0.02)',
                        border: '1px solid',
                        borderColor: notif.read === 0 ? 'rgba(212,255,0,0.15)' : 'var(--color-border-glass)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '11px', lineHeight: '1.4', color: notif.read === 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)', textAlign: 'left' }}>
                        {notif.message}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '8px', color: 'var(--color-text-muted)' }}>
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {notif.read === 0 && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Tab content switcher */}
      <div style={{ flex: 1, paddingBottom: '30px' }}>
        {activeTab === 'home' && (
          <HomeScreen 
            activePlayer={activePlayer} 
            token={token} 
            onRefreshPlayer={refreshPlayer} 
            language={language}
          />
        )}
        
        {activeTab === 'schedule' && (
          <ScheduleScreen 
            activePlayer={activePlayer} 
            token={token} 
            language={language}
          />
        )}
        
        {activeTab === 'courts' && (
          <CourtsScreen 
            activePlayer={activePlayer} 
            language={language}
          />
        )}
        
        {activeTab === 'leaderboard' && (
          <LeaderboardScreen 
            activePlayer={activePlayer} 
            language={language}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsScreen
            activePlayer={activePlayer}
            token={token}
            onLogout={handleLogout}
            onRefreshPlayer={refreshPlayer}
            language={language}
            onChangeLanguage={handleChangeLanguage}
          />
        )}
      </div>

      {/* Persistent Bottom Nav Bar */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <HomeIcon size={18} />
          <span>{t('home')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Clock size={18} />
          <span>{t('schedule')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'courts' ? 'active' : ''}`}
          onClick={() => setActiveTab('courts')}
        >
          <MapPin size={18} />
          <span>{t('courts')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Trophy size={18} />
          <span>{t('leaderboard')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={18} />
          <span>{t('settings')}</span>
        </button>
      </nav>

    </div>
  );
}
