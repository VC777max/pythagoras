import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, Clock, MapPin, Trophy, Settings as SettingsIcon } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import ScheduleScreen from './components/ScheduleScreen';
import CourtsScreen from './components/CourtsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import SettingsScreen from './components/SettingsScreen';
import { getLanguage, setLanguage, translate } from './utils/i18n';

export default function App() {
  const [activePlayer, setActivePlayer] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState(getLanguage());

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
    <div className="container">
      
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
