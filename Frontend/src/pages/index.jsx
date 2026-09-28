import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoTCM from '../assets/logoTCM.png';
import x from '../assets/x.png';
import a from '../assets/a.png';
import e from '../assets/e.png';
import w from '../assets/w.png';
import z from '../assets/z.png';
import sun from '../assets/SUN.png';
import dark from '../assets/dark.png';
import './index.css';
import { useTheme } from '../context/ThemeContext';

const zones = [
  { id: 'a', src: a },
  { id: 'e', src: e },
  { id: 'x', src: x },
  { id: 'w', src: w },
  { id: 'z', src: z },
];

const zonesInfo = {
  a: {
    titre: 'Zone Apex',
    sousTitre: 'North West Sector',
    points: ['Landlocked', 'Transfer possible with : E, W, X'],
    res: [],
    posX: '20%',
    posY: '35%'
  },
  e: {
    titre: 'Zone Echo',
    sousTitre: 'North East Sector',
    points: ['Bay', 'Transfer possible with : A, X, Sea'],
    posX: '75%',
    posY: '35%'
  },
  x: {
    titre: 'Zone Xeno',
    sousTitre: 'Center Sector',
    points: ['Bay (Central Hub)', 'Transfer possible with : A, E, W, Z, Sea'],
    posX: '65%',
    posY: '60%'
  },
  w: {
    titre: 'Zone Warden',
    sousTitre: 'South West Sector',
    points: ['Landlocked', 'Transfer possible with : A, X, Z'],
    posX: '20%',
    posY: '60%'
  },
  z: {
    titre: 'Zone Zion',
    sousTitre: 'South East Sector',
    points: ['Bay', 'Transfer possible with : W, X, Sea'],
    posX: '65%',
    posY: '75%'
  },
};

// Liste des zones
const alerteZones = ['a', 'e', 'x', 'z', 'w'];

function Landing() {
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  const [zoneActive, setZoneActive] = useState(null);
  const [panelPos, setPanelPos] = useState({ x: '50%', y: '50%' });
  const [quarters, setQuarters] = useState([]);
  const [inventaire, setInventaire] = useState([]);
  const [inventaireLoading, setInventaireLoading] = useState(false);
  const [inventaireError, setInventaireError] = useState(null);

  const mapRef = useRef(null);
  const canvasesRef = useRef({});

  // Récupération des données users
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

  // Chargement des données de tous les quartiers au démarrage
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

  useEffect(() => {
    zones.forEach(({ id, src }) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvasesRef.current[id] = {
          ctx,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
      };
    });
  }, []);

  const handleMapClick = (event) => {
    const mapEl = mapRef.current;
    if (!mapEl) return;

    const rect = mapEl.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const ordreTest = [...zones].reverse();

    for (const { id } of ordreTest) {
      const data = canvasesRef.current[id];
      if (!data) continue;

      const scaleX = data.width / rect.width;
      const scaleY = data.height / rect.height;
      const px = Math.floor(clickX * scaleX);
      const py = Math.floor(clickY * scaleY);

      if (px < 0 || py < 0 || px >= data.width || py >= data.height) continue;

      const pixel = data.ctx.getImageData(px, py, 1, 1).data;
      const alpha = pixel[3];

      if (alpha > 10) {
        setZoneActive(id);
        // Position définie dans zonesInfo
        const info = zonesInfo[id];
        setPanelPos({
          x: info.posX || '50%',
          y: info.posY || '50%',
        });
        return;
      }
    }
  };

  // Trouver le quartier sélectionné
  const currentQuarter = quarters.find(
    (q) =>
      q.code?.toString().toLowerCase() === zoneActive?.toString().toLowerCase() ||
      q.id?.toString() === zoneActive?.toString()
  );

  // Calcul du niveau global
  const globalDisasterLevel = quarters.length > 0
  ? (quarters.reduce((sum, q) => sum + (q.disaster_level || 0), 0) / quarters.length).toFixed(1)
  : 0;

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

  const getRoleLabel = (role) => {
    const roles = {
      QC: 'Quarter Coordinator (QC)',
      LC: 'Logistics Coordinator (LC)',
      CD: 'City Director (CD)',
    };
    return roles[role] || 'N/A';
  };

  const getScopeLabel = (role) => {
    const scopes = {
      QC: 'Single quarter',
      LC: 'Multi-quarter',
      CD: 'City-wide',
    };
    return scopes[role] || 'N/A';
  };

  useEffect(() => {
    if (!currentQuarter?.id) {
      setInventaire([]);
      return;
    }

    setInventaireLoading(true);
    setInventaireError(null);

    fetch(`/api/inventories/quarter/${currentQuarter.id}`, {
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) throw new Error('Inventory loading error');
        return res.json();
      })
      .then((data) => setInventaire(data))
      .catch((err) => {
        console.error('Error API /inventories:', err);
        setInventaireError("Inventory loading impossible");
      })
      .finally(() => setInventaireLoading(false));
  }, [currentQuarter?.id]);

  const handleSliderChange = async (code, newLevel) => {
    const quarter = quarters.find((q) => q.code?.toString().toLowerCase() === code);
    if (!quarter) return;

  const niveau = Number(newLevel);
  const ancienNiveau = quarter.disaster_level;

  // Mise à jour
  setQuarters((prev) =>
    prev.map((q) => (q.id === quarter.id ? { ...q, disaster_level: niveau } : q))
  );

  try {
    const res = await fetch(`/api/disasters/quarters/${quarter.id}/level`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newLevel: niveau }),
    });
    if (!res.ok) throw new Error('Level updating Error');
  } catch (err) {
    console.error('Error API /disasters/quarters/:id/level:', err);
    setQuarters((prev) =>
      prev.map((q) => (q.id === quarter.id ? { ...q, disaster_level: ancienNiveau } : q))
    );
  }
};

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
            style={{ cursor: 'pointer' }}
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
              <li><Link to="/resources">Resources</Link></li>
              <li><Link to="/transfers">Transfers</Link></li>
              <li><Link to="/index">Map</Link></li>
              <li><Link to="/calendrier">Calendar</Link></li>
              <li>
                <Link onClick={handleLogout}>
                  Log out
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Carte */}
      <div className={`map ${zoneActive ? 'is-dimmed' : ''}`} ref={mapRef} onClick={handleMapClick}>
        {zones.map((zone) => (
          <img
            key={zone.id}
            src={zone.src}
            className="map-piece"
            alt={`Zone ${zone.id.toUpperCase()}`}
          />
        ))}
      </div>
      {/* Zone */}
      <nav
        className={`zone-panel ${zoneActive ? 'is-open' : ''}`}
        style={{
          left: panelPos.x,
          top: panelPos.y,
        }}
      >
        {zoneActive && (
          <>
            <button
              className="zone-close-btn"
              onClick={() => setZoneActive(null)}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Titre et level */}
            <div className="zone-title-row">
              <h2>{zonesInfo[zoneActive].titre}</h2>
              <span className="zone-disaster-level" style={{ color: getLevelColor(currentQuarter?.disaster_level) }}>
                Disaster level : {currentQuarter ? currentQuarter.disaster_level : '...'}
              </span>
            </div>

            {/* infos */}
            {zonesInfo[zoneActive].points && (
              <ul className="zone-list">
                {zonesInfo[zoneActive].points.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}

            <div className="zone-inventory">
            <h3>Inventory</h3>
            {inventaireLoading && <p className="zone-inventory-status">Loading...</p>}
            {inventaireError && <p className="zone-inventory-status error">{inventaireError}</p>}
            {!inventaireLoading && !inventaireError && inventaire.length === 0 && (
              <p className="zone-inventory-status">No ressources</p>
            )}
            {!inventaireLoading && !inventaireError && inventaire.length > 0 && (
              <ul className="zone-inventory-list">
                {inventaire.map((item) => (
                  <li key={item.resource_type_id ?? item.resource_code}>
                    <span>{item.resource_name}</span>
                    <span className="zone-inventory-qty">
                      {item.current_quantity ?? item.stock ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </>
        )}
      </nav>

      <div className="box">
        <div className="info">
          <p>INFORMATIONS</p>
          <h3>Connected as : {user.email || 'Guest'}</h3>
          <h1>Role : {getRoleLabel(user.role)}</h1>
          <h3>Scope : {getScopeLabel(user.role)}</h3>
        </div>

        <div className="alerte">
          <p>ALERT</p>
          <h3 style={{ color: getLevelColor(globalDisasterLevel) }}>Global Disaster level : {globalDisasterLevel}</h3>
          <div className="alerte-zones">
            {alerteZones.map((code) => {
              const quarterObj = quarters.find((q) => q.code?.toString().toLowerCase() === code);
              const niveau = quarterObj?.disaster_level ?? 1;
              const couleur = getLevelColor(niveau);

              return (
                <div className="alerte-zone-item" key={code}>
                  <h4>{code.toUpperCase()}</h4>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={niveau}
                    onChange={(e) => handleSliderChange(code, e.target.value)}
                    disabled={user.role !== 'CD'}
                    className="mini-slider"
                    style={{ '--slider-color': couleur }}
                  />
                  <span className="zone-disaster-level" style={{ color: couleur }}>{niveau}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {zoneActive && (
        <div className="zone-overlay" onClick={() => setZoneActive(null)} />
      )}
    </div>
  );
}

export default Landing;