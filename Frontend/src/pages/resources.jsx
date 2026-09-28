import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoTCM from '../assets/logoTCM.png';
import sun from '../assets/SUN.png';
import dark from '../assets/dark.png';
import './resources.css';
import { useTheme } from '../context/ThemeContext';

const CODE_TO_COLUMN = {
  a: 'apex',
  x: 'xeno',
  e: 'echo',
  w: 'warden',
  z: 'zion',
};

function Resources() {
  const [quarters, setQuarters] = useState([]);
  const [resourcesData, setResourcesData] = useState([]);
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  const [retentionRate, setRetentionRate] = useState(0.3);
  const [thresholdError, setThresholdError] = useState(null);
  const QUARTER_NAMES = {
    a: 'Apex',
    x: 'Xeno',
    e: 'Echo',
    w: 'Warden',
    z: 'Zion',
  };

  // Récupération des données user
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Chargement des données des quartiers au démarrage
  useEffect(() => {
    fetch('/api/disasters/quarters', {
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) throw new Error('Quarter loading error');
        return res.json();
      })
      .then((data) => setQuarters(data))
      .catch((err) => console.error('Error API /quarters:', err));
  }, []);

  // Chargement de l'inventaire de chaque quartier
  useEffect(() => {
    if (quarters.length === 0) return;

    const fetchAllInventories = async () => {
      try {
        const results = await Promise.all(
          quarters.map((q) =>
            fetch(`/api/inventories/quarter/${q.id}`, {
              headers: getAuthHeaders()
            })
              .then((res) => {
                if (!res.ok) throw new Error('Inventory loading error');
                return res.json();
              })
              .then((items) => ({ quarter: q, items }))
          )
        );

        // Regroupement par ressource
        const resourceMap = {};

        results.forEach(({ quarter, items }) => {
          const columnKey = CODE_TO_COLUMN[quarter.code?.toLowerCase()];

          items.forEach((item) => {
            if (!resourceMap[item.resource_name]) {
              resourceMap[item.resource_name] = {
                name: item.resource_name,
                apex: { current: 0, initial: 0 },
                xeno: { current: 0, initial: 0 },
                echo: { current: 0, initial: 0 },
                warden: { current: 0, initial: 0 },
                zion: { current: 0, initial: 0 },
              };
            }

            if (columnKey) {
              resourceMap[item.resource_name][columnKey] = {
                current: item.current_quantity,
                initial: item.initial_quantity,
              };
            }
          });
        });

        setResourcesData(Object.values(resourceMap));
      } catch (err) {
        console.error('Error API /inventories:', err);
      }
    };

    fetchAllInventories();
  }, [quarters]);

  // Calcul du niveau global
  const globalDisasterLevel = quarters.length > 0
    ? (quarters.reduce((sum, q) => sum + (q.disaster_level || 0), 0) / quarters.length).toFixed(1)
    : 0;

  const globalLevelRounded = quarters.length > 0
    ? Math.round(quarters.reduce((sum, q) => sum + (q.disaster_level || 0), 0) / quarters.length)
    : 0;

  const getLevelLabel = (level) => {
  const labels = {
    1: 'Watch',
    2: 'Alert',
    3: 'Emergency',
    4: 'Critical',
    5: 'Catastrophic',
  };
  return labels[Math.round(Number(level))] || 'N/A';
};

const getLevelColor = (level) => {
  const colors = {
    1: '#2ecc71',
    2: '#a3d977',
    3: '#f1c40f',
    4: '#e67e22',
    5: '#e74c3c',
  };
  return colors[Math.round(Number(level))] || '#999999';
};

const getRetentionThreshold = (initialQuantity) => {
  if (initialQuantity == null) return '...';
  return Math.ceil(initialQuantity * retentionRate);
};

useEffect(() => {
  fetch('/api/disasters', { headers: getAuthHeaders() })
    .then((res) => res.json())
    .then((data) => setRetentionRate(Number(data.retention_rate)))
    .catch((err) => console.error('rentention rate loading error :', err));
}, []);

const handleLowerThreshold = async () => {
  if (user.role !== 'CD') return;

  setThresholdError(null);
  const ancien = retentionRate;
  setRetentionRate(0.15);

  try {
    const res = await fetch('/api/disasters/retention-rate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rate: 0.15 }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'rate upadte error');
    }
  } catch (err) {
    console.error('Error API /disasters/retention-rate:', err);
    setThresholdError(err.message);
    setRetentionRate(ancien);
  }
};

const handleRaiseThreshold = async () => {
  if (user.role !== 'CD') return;

  setThresholdError(null);
  const ancien = retentionRate;
  setRetentionRate(0.3);

  try {
    const res = await fetch('/api/disasters/retention-rate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rate: 0.3 }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'ate upadte error');
    }
  } catch (err) {
    console.error('Error API /disasters/retention-rate:', err);
    setThresholdError(err.message);
    setRetentionRate(ancien);
  }
};

useEffect(() => {
    if (retentionRate === 0.15 && globalLevelRounded !== 5) {
      handleRaiseThreshold();
    }
  }, [globalLevelRounded, retentionRate]);

  return (
    <div className={`page ${darkMode ? 'dark' : ''}`}>
      {/* Navbar */}
      <div className="navbar">
        <div className="txttcm">TCM</div>

        <div className="linelogo">
          <img
            src={logoTCM}
            alt="Logo TCM"
            className="logo-tcm"
            onClick={() => navigate('/index')}
          />
        </div>

        <div className="lineburger">
          <button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <img src={sun} alt="Sun icon" className="theme-icon" />
            ) : (
              <img src={dark} alt="Moon icon" className="theme-icon" />
            )}
          </button>

          <button
            className={`burger-btn ${menuOuvert ? 'is-open' : ''}`}
            onClick={() => setMenuOuvert(!menuOuvert)}
          >
            <span className="burger-line" />
            <span className="burger-line" />
            <span className="burger-line" />
          </button>

          <nav className={`menu-panel ${menuOuvert ? 'is-open' : ''}`}>
            <ul className="menu-list">
              <li><a href="/resources">Resources</a></li>
              <li><a href="/transfers">Transfers</a></li>
              <li><a href="/index">Map</a></li>
              <li><a href="/calendrier">Calendar</a></li>
              <li>
                <a onClick={handleLogout}>
                  Log out
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* contenu principal */}
      <main className="resources-main">
        <div className="all">
          <div className="txtresources">
            <h1>Resources</h1>
            <h2>
              Global Disaster level : <span style={{ color: getLevelColor(globalDisasterLevel) }}>{getLevelLabel(globalDisasterLevel)}</span>
            </h2>
            <div className="quarter-levels">
              {['a', 'x', 'e', 'w', 'z'].map((code) => {
                const level = quarters.find((q) => q.code?.toLowerCase() === code)?.disaster_level;
                return (
                  <h3 key={code}>
                    {QUARTER_NAMES[code]} : <span style={{ color: level ? getLevelColor(level) : undefined }}>{level ?? '...'}</span>
                  </h3>
                );
              })}
            </div>
          </div>

          {/* tableau */}
          <div className="grid-rectangle">
            {/* 1ère ligne */}
            <div className="grid-row grid-header">
              <div className="grid-col">Resources</div>
              <div className="grid-col">Apex</div>
              <div className="grid-col">Xeno</div>
              <div className="grid-col">Echo</div>
              <div className="grid-col">Warden</div>
              <div className="grid-col">Zion</div>
            </div>

            {/* Génération des 10 rangés */}
            {Array.from({ length: 10 }).map((_, rowIndex) => {
              const row = resourcesData[rowIndex];
              return (
                <div className="grid-row" key={rowIndex}>
                  <div className="grid-col">{row ? row.name : ''}</div>
                  {['apex', 'xeno', 'echo', 'warden', 'zion'].map((col) => (
                    <div className="grid-col" key={col}>
                      {row ? (<>
                          {row[col].current}{' '}
                          <span className="initial-threshold">
                          &nbsp;| {getRetentionThreshold(row[col].initial)}
                          </span></>
                      ) : ''}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {user.role === 'CD' && (
            <div className="lowerbtnn">
              <p className="threshold-rate">
                Current retention rate : {Math.round(retentionRate * 100)}%
              </p>
              <div className="threshold-buttons">
                <button onClick={handleLowerThreshold} disabled={retentionRate === 0.15}>
                  Lower treshold
                </button>
                <button onClick={handleRaiseThreshold} disabled={retentionRate === 0.3}>
                  Raise treshold
                </button>
              </div>
              {thresholdError && <p className="threshold-error">{thresholdError}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Resources;