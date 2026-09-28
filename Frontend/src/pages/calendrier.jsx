import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoTCM from '../assets/logoTCM.png';
import sun from '../assets/SUN.png';
import dark from '../assets/dark.png';
import './calendrier.css';
import { useTheme } from '../context/ThemeContext';

const NOMS_MOIS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const NOMS_JOURS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Calendrier() {
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();

  const [dateAffichee, setDateAffichee] = useState(new Date());
  const [jourSelectionne, setJourSelectionne] = useState(null);

  const [evenements, setEvenements] = useState({});
  const [erreurChargement, setErreurChargement] = useState(null);
  const [erreurAction, setErreurAction] = useState(null);

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [titreEvenement, setTitreEvenement] = useState('');
  const [objetEvenement, setObjetEvenement] = useState('');
  const [erreurFormulaire, setErreurFormulaire] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  // Convertion
  const dateEnCle = (date) => {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  };

  // Grille
  const construireGrilleJours = () => {
    const annee = dateAffichee.getFullYear();
    const mois = dateAffichee.getMonth();

    const premierJourDuMois = new Date(annee, mois, 1);
    const dernierJourDuMois = new Date(annee, mois + 1, 0);

    const decalageDebut = (premierJourDuMois.getDay() + 6) % 7;

    const jours = [];

    // Jours du mois dernier
    for (let i = decalageDebut; i > 0; i--) {
      const jour = new Date(annee, mois, 1 - i);
      jours.push({ date: jour, horsMois: true });
    }

    // Jours du mois actuel
    for (let i = 1; i <= dernierJourDuMois.getDate(); i++) {
      jours.push({ date: new Date(annee, mois, i), horsMois: false });
    }

    // Jours du mois prochain
    while (jours.length % 7 !== 0 || jours.length < 42) {
      const dernierJourAjoute = jours[jours.length - 1].date;
      const jourSuivant = new Date(
        dernierJourAjoute.getFullYear(),
        dernierJourAjoute.getMonth(),
        dernierJourAjoute.getDate() + 1
      );
      jours.push({ date: jourSuivant, horsMois: true });
      if (jours.length >= 42) break;
    }

    return jours;
  };

  const grilleJours = construireGrilleJours();

  // Charge les evennements
  useEffect(() => {
    let annule = false;
    const grille = construireGrilleJours();
    const debut = dateEnCle(grille[0].date);
    const fin = dateEnCle(grille[grille.length - 1].date);

    setErreurChargement(null);

    fetch(`/api/calendar?from=${debut}&to=${fin}`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load events');
        return res.json();
      })
      .then((liste) => {
        if (annule) return;
        const groupes = {};
        liste.forEach((evt) => {
          (groupes[evt.event_date] = groupes[evt.event_date] || []).push(evt);
        });
        setEvenements(groupes);
      })
      .catch((err) => {
        if (annule) return;
        console.error('Error API /calendar:', err);
        setErreurChargement(err.message);
      });

    return () => {
      annule = true;
    };
  }, [dateAffichee.getFullYear(), dateAffichee.getMonth()]);

  const ouvrirFormulaire = () => {
    if (!jourSelectionne) return;
    setTitreEvenement('');
    setObjetEvenement('');
    setErreurFormulaire(null);
    setFormulaireOuvert(true);
  };

  const fermerFormulaire = () => {
    setFormulaireOuvert(false);
  };

  const ajouterEvenement = async (e) => {
    e.preventDefault();
    if (!jourSelectionne || !titreEvenement.trim()) return;

    setEnvoiEnCours(true);
    setErreurFormulaire(null);

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          event_date: dateEnCle(jourSelectionne),
          title: titreEvenement.trim(),
          description: objetEvenement.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add the event');

      // Ajout de l'evennement
      const cree = data.event;
      setEvenements((prev) => ({
        ...prev,
        [cree.event_date]: [...(prev[cree.event_date] || []), cree],
      }));

      setFormulaireOuvert(false);
    } catch (err) {
      setErreurFormulaire(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const supprimerEvenement = async (evt) => {
    setErreurAction(null);

    try {
      const res = await fetch(`/api/calendar/${evt.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Could not delete the event');
      }

      setEvenements((prev) => ({
        ...prev,
        [evt.event_date]: (prev[evt.event_date] || []).filter((e) => e.id !== evt.id),
      }));
    } catch (err) {
      setErreurAction(err.message);
    }
  };

  // Supprimer
  const peutSupprimer = (evt) => user.role === 'CD' || evt.created_by === user.id;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const moisPrecedent = () => {
    setDateAffichee((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const moisSuivant = () => {
    setDateAffichee((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const allerAujourdhui = () => {
    const today = new Date();
    setDateAffichee(today);
    setJourSelectionne(today);
  };

  const estAujourdhui = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const estSelectionne = (date) => {
    if (!jourSelectionne) return false;
    return (
      date.getDate() === jourSelectionne.getDate() &&
      date.getMonth() === jourSelectionne.getMonth() &&
      date.getFullYear() === jourSelectionne.getFullYear()
    );
  };

  const aDesEvenements = (date) => {
    const cle = dateEnCle(date);
    return (evenements[cle] || []).length > 0;
  };

  const cleJourSelectionne = jourSelectionne ? dateEnCle(jourSelectionne) : null;
  const evenementsDuJour = cleJourSelectionne ? (evenements[cleJourSelectionne] || []) : [];

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
                <button
                  onClick={handleLogout}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
                >
                  Log out
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <h1>Calendar</h1>

      <div className="calendrier-container">
        <div className="calendrier-header">
          <button className="calendrier-nav-btn" onClick={moisPrecedent} aria-label="Previous month">
            ‹
          </button>

          <div className="calendrier-titre-mois">
            {NOMS_MOIS[dateAffichee.getMonth()]} {dateAffichee.getFullYear()}
          </div>

          <button className="calendrier-nav-btn" onClick={moisSuivant} aria-label="Next month">
            ›
          </button>
        </div>

        <button className="calendrier-today-btn" onClick={allerAujourdhui}>
          Today
        </button>

        {erreurChargement && <p className="calendrier-erreur">{erreurChargement}</p>}

        <div className="calendrier-grille calendrier-jours-semaine">
          {NOMS_JOURS.map((jour) => (
            <div key={jour} className="calendrier-jour-semaine">
              {jour}
            </div>
          ))}
        </div>

        <div className="calendrier-grille">
          {grilleJours.map(({ date, horsMois }, index) => (
            <button
              key={index}
              className={`calendrier-jour
                ${horsMois ? 'hors-mois' : ''}
                ${estAujourdhui(date) ? 'aujourdhui' : ''}
                ${estSelectionne(date) ? 'selectionne' : ''}`}
              onClick={() => setJourSelectionne(date)}
            >
              {date.getDate()}
              {aDesEvenements(date) && <span className="calendrier-jour-point" />}
            </button>
          ))}
        </div>

        {jourSelectionne && (
          <div className="calendrier-evenements">
            <div className="calendrier-evenements-header">
              <h3>
                Events on {NOMS_MOIS[jourSelectionne.getMonth()]} {jourSelectionne.getDate()}
              </h3>
              <button className="calendrier-ajouter-btn" onClick={ouvrirFormulaire}>
                + Add event
              </button>
            </div>

            {erreurAction && <p className="calendrier-erreur">{erreurAction}</p>}

            {evenementsDuJour.length === 0 ? (
              <p className="calendrier-evenements-vide">No events for this day.</p>
            ) : (
              <ul className="calendrier-evenements-liste">
                {evenementsDuJour.map((evt) => (
                  <li key={evt.id} className="calendrier-evenement-item">
                    <div>
                      <strong>{evt.title}</strong>
                      {evt.description && <p>{evt.description}</p>}
                      <small className="calendrier-evenement-auteur">{evt.created_by_email}</small>
                    </div>
                    {peutSupprimer(evt) && (
                      <button
                        className="calendrier-evenement-supprimer"
                        onClick={() => supprimerEvenement(evt)}
                        aria-label="Delete event"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {formulaireOuvert && (
        <>
          <div className="calendrier-overlay" onClick={fermerFormulaire} />
          <div className="calendrier-modale">
            <button
              className="calendrier-modale-close"
              onClick={fermerFormulaire}
              aria-label="Close"
            >
              ✕
            </button>

            <h3>
              New event — {jourSelectionne && NOMS_MOIS[jourSelectionne.getMonth()]} {jourSelectionne?.getDate()}
            </h3>

            <form onSubmit={ajouterEvenement} className="calendrier-form">
              <label htmlFor="titre-evenement">Title</label>
              <input
                id="titre-evenement"
                type="text"
                value={titreEvenement}
                onChange={(e) => setTitreEvenement(e.target.value)}
                placeholder="E.g. Crisis meeting"
                maxLength={150}
                required
              />

              <label htmlFor="objet-evenement">Description</label>
              <textarea
                id="objet-evenement"
                value={objetEvenement}
                onChange={(e) => setObjetEvenement(e.target.value)}
                placeholder="Event details (optional)"
                maxLength={2000}
                rows={4}
              />

              {erreurFormulaire && <p className="calendrier-erreur">{erreurFormulaire}</p>}

              <button type="submit" className="calendrier-form-submit" disabled={envoiEnCours}>
                {envoiEnCours ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default Calendrier;