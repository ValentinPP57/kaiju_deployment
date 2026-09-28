import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoTCM from '../assets/logoTCM.png';
import sun from '../assets/SUN.png';
import dark from '../assets/dark.png';
import './transfers.css';
import { useTheme } from '../context/ThemeContext';

const QUARTER_NAMES = {
  a: 'Apex',
  e: 'Echo',
  w: 'Warden',
  x: 'Xeno',
  z: 'Zion',
};

let rowIdCounter = 0;
const nextRowId = () => `row-${Date.now()}-${rowIdCounter++}`;

function Transfers() {
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();

  const [quarters, setQuarters] = useState([]);
  const [retentionRate, setRetentionRate] = useState(0.3);
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [sourceInventory, setSourceInventory] = useState([]);
  const [destInventory, setDestInventory] = useState([]);

  const [transferRows, setTransferRows] = useState([
    { id: nextRowId(), resourceTypeId: '', quantity: '' },
  ]);

  const [history, setHistory] = useState([]);
  const [pendingLegs, setPendingLegs] = useState([]);
  const [transferError, setTransferError] = useState(null);
  const [transferSuccess, setTransferSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canInitiate = user.role === 'LC' || user.role === 'CD';
  const canApprove = user.role === 'QC' || user.role === 'CD';

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Quartiers
  useEffect(() => {
    fetch('/api/disasters/quarters', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setQuarters(data))
      .catch((err) => console.error('Errorr API /quarters:', err));
  }, []);

  // Taux de rétention actuel
  useEffect(() => {
    fetch('/api/disasters', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setRetentionRate(Number(data.retention_rate) || 0.3))
      .catch((err) => console.error('Error loading retention_rate:', err));
  }, []);

  useEffect(() => {
    if (user.role === 'QC' && user.quarterId) {
      setSourceId(String(user.quarterId));
    }
  }, [quarters]);

  const loadHistory = () => {
    fetch('/api/transfers', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .catch((err) => console.error('Error API /transfers:', err));
  };

  const loadPendingLegs = () => {
    if (!canApprove) return;
    fetch('/api/transfers/pending-legs', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then(setPendingLegs)
      .catch((err) => console.error('Error API /transfers/pending-legs:', err));
  };

  useEffect(() => {
    loadHistory();
    loadPendingLegs();
  }, []);

  // Inventaire source
  useEffect(() => {
    if (!sourceId) {
      setSourceInventory([]);
      return;
    }
    fetch(`/api/inventories/quarter/${sourceId}`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setSourceInventory(data))
      .catch((err) => console.error('Error API /inventories (source):', err));
  }, [sourceId]);

  // Inventaire destination
  useEffect(() => {
    if (!destId) {
      setDestInventory([]);
      return;
    }
    fetch(`/api/inventories/quarter/${destId}`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setDestInventory(data))
      .catch((err) => console.error('Erreur API /inventories (dest):', err));
  }, [destId]);

  // Destination
  const destOptions = quarters.filter((q) => q.id?.toString() !== sourceId);

  // Réinitialise
  useEffect(() => {
    setTransferRows([{ id: nextRowId(), resourceTypeId: '', quantity: '' }]);
    setTransferError(null);
    setTransferSuccess(null);
  }, [sourceId]);

  const getMaxTransferable = (resourceTypeId) => {
    const resource = sourceInventory.find(
      (item) => item.resource_type_id?.toString() === resourceTypeId
    );
    if (!resource) return 0;
    const threshold = Math.ceil((resource.initial_quantity || 0) * retentionRate);
    return Math.max(0, resource.current_quantity - threshold);
  };

  const selectedResourceTypeIds = transferRows
    .map((row) => row.resourceTypeId)
    .filter(Boolean);

  const handleAddRow = () => {
    setTransferRows((rows) => [
      ...rows,
      { id: nextRowId(), resourceTypeId: '', quantity: '' },
    ]);
  };

  const handleRemoveRow = (id) => {
    setTransferRows((rows) =>
      rows.length > 1 ? rows.filter((row) => row.id !== id) : rows
    );
  };

  const handleRowChange = (id, field, value) => {
    setTransferRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);

    if (!sourceId || !destId) {
      setTransferError('Select a source and a destination');
      return;
    }

    const validRows = transferRows.filter(
      (row) => row.resourceTypeId && row.quantity
    );

    if (validRows.length === 0) {
      setTransferError('Add at least on ressource');
      return;
    }

    // Pas 2 fois la même ressource
    const seen = new Set();
    for (const row of validRows) {
      if (seen.has(row.resourceTypeId)) {
        setTransferError('Don\'t choose the same ressource 2 times');
        return;
      }
      seen.add(row.resourceTypeId);
    }

    for (const row of validRows) {
      const max = getMaxTransferable(row.resourceTypeId);
      if (Number(row.quantity) > max) {
        const resourceName = sourceInventory.find(
          (item) => item.resource_type_id?.toString() === row.resourceTypeId
        )?.resource_name || 'ressource';
        setTransferError(
          `${resourceName} : quantity too high (${max} available)`
        );
        return;
      }
    }

    setSubmitting(true);
    const failures = [];

    for (const row of validRows) {
      try {
        const res = await fetch('/api/transfers', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            source_quarter_id: Number(sourceId),
            destination_quarter_id: Number(destId),
            resource_type_id: Number(row.resourceTypeId),
            quantity: Number(row.quantity),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'transfer error');
      } catch (err) {
        const resourceName = sourceInventory.find(
          (item) => item.resource_type_id?.toString() === row.resourceTypeId
        )?.resource_name || row.resourceTypeId;
        failures.push(`${resourceName} (${err.message})`);
      }
    }

    setSubmitting(false);

    if (failures.length === 0) {
      setTransferSuccess(
        validRows.length > 1
          ? `${validRows.length} transfer created`
          : 'transfer created'
      );
      setTransferRows([{ id: nextRowId(), resourceTypeId: '', quantity: '' }]);
    } else if (failures.length < validRows.length) {
      setTransferError(`failed : ${failures.join(', ')}`);
    } else {
      setTransferError(`failed : ${failures.join(', ')}`);
    }

    fetch(`/api/inventories/quarter/${sourceId}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then(setSourceInventory);
    loadHistory();
    loadPendingLegs();
  };

  const handleApproveLeg = async (legId) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/transfers/legs/${legId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approbation error');
      loadPendingLegs();
      loadHistory();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleRejectLeg = async (legId) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/transfers/legs/${legId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refuse error');
      loadPendingLegs();
      loadHistory();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const renderInventory = (items) => (
    <ul className="transfer-inventory-list">
      {items.length === 0 && <li className="transfer-inventory-empty">Select a quarter</li>}
      {items.map((item) => (
        <li key={item.resource_type_id ?? item.resource_code}>
          <span>{item.resource_name}</span>
          <span>{item.current_quantity}</span>
        </li>
      ))}
    </ul>
  );

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
              <li><a onClick={handleLogout}>Log out</a></li>
            </ul>
          </nav>
        </div>
      </div>

      <main className="resources-main">
        <div className="all">
          <div className="txtresources">
            <h1>Transfers</h1>
          </div>

          {/* Section initiale */}
          {canInitiate && (
            <form onSubmit={handleSubmitTransfer}>
              <div className="transfer-row transfer-row-top">
                <div className="rectangleg">
                  <p className="rectangle-label">From</p>
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    disabled={user.role === 'QC' && !!user.quarterId}
                  >
                    <option value="">Select</option>
                    {quarters.map((q) => (
                      <option key={q.id} value={q.id}>
                        {QUARTER_NAMES[q.code?.toLowerCase()] || q.name}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="material-symbols-outlined">arrow_forward</span>

                <div className="rectangled">
                  <p className="rectangle-label">To</p>
                  <select
                    value={destId}
                    onChange={(e) => setDestId(e.target.value)}
                    disabled={!sourceId}
                  >
                    <option value="">Select</option>
                    {destOptions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {QUARTER_NAMES[q.code?.toLowerCase()] || q.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="transfer-row transfer-row-bottom">
                <div className="rectanglebg">
                  <p className="rectangle-label">Source inventory</p>
                  {renderInventory(sourceInventory)}
                </div>

                <div className="rectanglec rectanglec-multi">
                  <p className="rectangle-label">Resources</p>

                  <div className="resource-rows-list">
                    {transferRows.map((row) => {
                      const max = row.resourceTypeId
                        ? getMaxTransferable(row.resourceTypeId)
                        : null;
                      return (
                        <div className="resource-row" key={row.id}>
                          <select
                            value={row.resourceTypeId}
                            onChange={(e) =>
                              handleRowChange(row.id, 'resourceTypeId', e.target.value)
                            }
                            disabled={!sourceId}
                          >
                            <option value="">Resource</option>
                            {sourceInventory
                              .filter(
                                (item) =>
                                  item.resource_type_id?.toString() === row.resourceTypeId ||
                                  !selectedResourceTypeIds.includes(
                                    item.resource_type_id?.toString()
                                  )
                              )
                              .map((item) => (
                                <option
                                  key={item.resource_type_id}
                                  value={item.resource_type_id}
                                >
                                  {item.resource_name} ({item.current_quantity})
                                </option>
                              ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            max={max || undefined}
                            value={row.quantity}
                            onChange={(e) =>
                              handleRowChange(row.id, 'quantity', e.target.value)
                            }
                            placeholder="Nbr"
                            disabled={!row.resourceTypeId}
                          />

                          <button
                            type="button"
                            className="resource-row-remove"
                            onClick={() => handleRemoveRow(row.id)}
                            disabled={transferRows.length === 1}
                            aria-label="Retirer cette ressource"
                          >
                            ×
                          </button>

                          {max !== null && (
                            <p className="transfer-max-hint">Max : {max}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="add-resource-btn"
                    onClick={handleAddRow}
                    disabled={!sourceId}
                  >
                    + Add a ressources
                  </button>
                </div>

                <div className="rectanglebd">
                  <p className="rectangle-label">Destination inventory</p>
                  {renderInventory(destInventory)}
                </div>
              </div>

              <div className="transfersbtn">
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Transfer'}
                </button>
              </div>

              {transferError && <p className="threshold-error">{transferError}</p>}
              {transferSuccess && <p className="transfer-success">{transferSuccess}</p>}
            </form>
          )}

          {/* section accept refus */}
          {canApprove && (
            <div className="approval-section">
              <h2>Pending approvals</h2>
              {actionError && <p className="threshold-error">{actionError}</p>}
              {pendingLegs.length === 0 && (
                <p className="transfer-inventory-empty">No pending requests</p>
              )}
              <ul className="transfer-history-list">
                {pendingLegs.map((leg) => (
                  <li key={leg.id} className="pending-transfer-item">
                    <span>{leg.resource_name}</span>
                    <span>{leg.from_quarter_name} → {leg.to_quarter_name}</span>
                    <span>{leg.quantity}</span>
                    <div className="pending-actions">
                      <button type="button" onClick={() => handleApproveLeg(leg.id)}>Approve</button>
                      <button type="button" onClick={() => handleRejectLeg(leg.id)}>Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Historique */}
          <div className="line">
            <div className="linee">
              <hr className="blackline" />
              <h1>History :</h1>
            </div>
          </div>

          <ul className="transfer-history-list">
            {history.map((t) => (
              <li key={t.id}>
                <span>{t.resource_name}</span>
                <span>{t.source_quarter} → {t.destination_quarter}</span>
                <span>{t.quantity}</span>
                <span className={`transfer-status transfer-status-${t.status}`}>{t.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export default Transfers;