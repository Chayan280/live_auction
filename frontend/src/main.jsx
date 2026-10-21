import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = 'http://localhost:5000/api';
const PLACEHOLDER = 'https://via.placeholder.com/400x500?text=No+Player+Photo';
const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const imageUrl = (url) => {
  if (!url || url === 'N/A') return PLACEHOLDER;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? `${API}/image-proxy?url=${encodeURIComponent(`https://lh3.googleusercontent.com/d/${match[1]}=w800`)}` : url;
};
async function api(path, options) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function LinkButton({ href, children, primary = false }) { return <a className={`button ${primary ? 'button-primary' : ''}`} href={`#${href}`}>{children}</a>; }
function Shell({ title, subtitle, children, actions }) { return <div className="app-shell"><header className="topbar"><div><h1>{title}</h1><p>{subtitle}</p></div><div className="top-actions">{actions}</div></header>{children}</div>; }
function Section({ title, accent = '', toolbar, children }) { return <section className="section"><div className="section-heading"><h2 className={accent}>{title}</h2>{toolbar}</div>{children}</section>; }
function PlayerGrid({ players, sold = false }) {
  if (!players.length) return <p className="muted italic">No {sold ? 'players sold yet' : 'unsold players remaining'}.</p>;
  return <div className="card-grid">{players.map((p) => <article className={`player-mini ${sold ? 'sold' : 'unsold'}`} key={p.id}><img src={imageUrl(p.photo_url)} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} alt="" /><div><h3>{p.name}</h3><small>{p.category}</small>{sold ? <><strong className="green">{currency(p.sold_price)}</strong><small>Sold to: {p.sold_to}</small></> : <><strong>{currency(p.base_price)}</strong><small>District: {p.district}</small><small>Block: {p.block}</small></>}</div></article>)}</div>;
}
function Dashboard() {
  const [teams, setTeams] = useState([]); const [players, setPlayers] = useState([]); const [filter, setFilter] = useState('ALL'); const [error, setError] = useState('');
  useEffect(() => { Promise.all([api('/teams'), api('/players')]).then(([t, p]) => { setTeams(t); setPlayers(p); }).catch((e) => setError(e.message)); }, []);
  const sold = players.filter((p) => p.status === 'SOLD' && (filter === 'ALL' || p.sold_to === filter));
  return <Shell title="PREMIER LEAGUE DASHBOARD 2026" subtitle="Live team purses, top sold players & unsold roster" actions={<><LinkButton href="/live" primary>Live Auction Desk →</LinkButton><LinkButton href="/admin">Admin Control</LinkButton></>}>{error && <div className="notice error">{error}</div>}<Section title="Team Purse & Squad Tracker"><div className="card-grid">{teams.map((t) => <article className="stat-card" key={t.id}><h3>{t.name}</h3><p>Purse Left <strong className="green">{currency(t.purse_left)}</strong></p><p>Players Bought <strong>{t.squad_count}</strong></p></article>)}</div></Section><Section title="Sold Players List (High to Low)" accent="green" toolbar={<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">All Teams</option>{teams.map((t) => <option key={t.id}>{t.name}</option>)}</select>}><PlayerGrid players={sold} sold /></Section><Section title="Unsold Players Roster (Awaiting Re-Auction)" accent="red"><PlayerGrid players={players.filter((p) => p.status === 'UNSOLD')} /></Section></Shell>;
}
function LiveAuction() {
  const [teams, setTeams] = useState([]); const [players, setPlayers] = useState([]); const [settings, setSettings] = useState({ bid_step_1: 100, bid_step_2: 500, bid_step_3: 1000 }); const [player, setPlayer] = useState(null); const [bid, setBid] = useState(0); const [leader, setLeader] = useState(''); const [step, setStep] = useState(100); const [history, setHistory] = useState([]); const [stamp, setStamp] = useState(''); const [notice, setNotice] = useState('');
  const selectPlayer = (next, current = settings) => { setPlayer(next); setBid(Number(next.base_price || 0)); setLeader(''); setHistory([]); setStamp(''); setStep(Number(current.bid_step_1 || 100)); };
  const load = async () => { const [t, p, s] = await Promise.all([api('/teams'), api('/players'), api('/settings')]); setTeams(t); setPlayers(p); setSettings(s); const next = p.find((x) => x.status === 'UNSOLD' || x.status === 'PENDING'); if (next) selectPlayer(next, s); };
  useEffect(() => { load().catch((e) => setNotice(e.message)); }, []);
  const placeBid = async (team) => { if (!player) return setNotice('Please select a player first.'); if (Number(team.purse_left) < bid) return setNotice(`Insufficient purse! ${team.name} has only ${currency(team.purse_left)} left.`); const entry = { team: team.name, amount: bid, time: new Date().toLocaleTimeString() }; setLeader(team.name); setHistory((items) => [entry, ...items]); try { await api('/bids/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: player.id, team_name: team.name, bid_amount: bid }) }); } catch (e) { setNotice(e.message); } };
  const finalize = async (status) => { if (!player) return setNotice('Select a player first.'); if (status === 'SOLD' && !leader) return setNotice('Click a team button to make a bid before selling.'); try { await api('/players/sell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: player.id, sold_to: status === 'SOLD' ? leader : null, sold_price: status === 'SOLD' ? bid : 0, status }) }); setStamp(status === 'SOLD' ? `SOLD TO ${leader}` : 'UNSOLD'); setTeams(await api('/teams')); } catch (e) { setNotice(e.message); } };
  const nextPlayer = async () => {
    try {
      const freshPlayers = await api('/players');
      setPlayers(freshPlayers);
      const auctionPool = freshPlayers.filter((p) => p.status === 'UNSOLD' || p.status === 'PENDING');
      const currentIndex = auctionPool.findIndex((p) => p.id === player?.id);
      const next = auctionPool[currentIndex + 1];
      if (next) {
        selectPlayer(next);
        setNotice('');
      } else {
        setNotice(currentIndex === -1 ? 'The current player is not in the unsold pool.' : 'No unsold players left in auction.');
      }
    } catch (e) {
      setNotice(`Could not load the next player: ${e.message}`);
    }
  };
  return <Shell title="⚡ LIVE AUCTION ROOM" subtitle="Run the auction, place bids and finalize players" actions={<><button className="button button-primary" onClick={nextPlayer}>⚡ Next Random Player</button><LinkButton href="/admin">Admin Dashboard</LinkButton><LinkButton href="/">Public View</LinkButton></>}>{notice && <div className="notice">{notice}<button onClick={() => setNotice('')}>×</button></div>}<main className="auction-layout"><aside className="panel"><h2>Teams Purse Status</h2>{teams.map((t) => <div className="team-row" key={t.id}><b>{t.name}</b><span>{t.squad_count || 0} Squad</span><small>Purse Left: <strong className="green">{currency(t.purse_left)}</strong></small></div>)}</aside><section className="auction-center"><div className="panel player-showcase">{stamp && <div className={`stamp ${stamp === 'UNSOLD' ? 'unsold-stamp' : ''}`}>{stamp}</div>}<img src={imageUrl(player?.photo_url)} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} alt="" /><div className="player-details"><span className="tag">{player?.reg_no || 'REG-000'}</span><h2>{player?.name || 'Ready for Auction'}</h2><div className="detail-grid">{[['CATEGORY', player?.category], ['DISTRICT', player?.district], ['BLOCK', player?.block], ['BATTING', player?.batting_style], ['BOWLING', player?.bowling_style]].map(([label, value]) => <div key={label}><small>{label}</small><b>{value || '--'}</b></div>)}</div><div className="base-price">BASE PRICE <strong>{currency(player?.base_price)}</strong></div></div></div><div className="panel bidding-console"><div className="bid-summary"><div><small>Current Highest Bid</small><strong>{currency(bid)}</strong></div><div><small>Highest Bidder</small><b>{leader || 'None'}</b></div></div><div className="step-grid">{[settings.bid_step_1, settings.bid_step_2, settings.bid_step_3].map((amount) => <button className={Number(step) === Number(amount) ? 'active' : ''} onClick={() => { setStep(amount); setBid((value) => value + Number(amount)); }} key={amount}>+{currency(amount)}</button>)}</div><div className="action-grid"><button className="sell" onClick={() => finalize('SOLD')}>✓ SELL PLAYER</button><button className="mark-unsold" onClick={() => finalize('UNSOLD')}>× MARK UNSOLD</button></div></div></section><aside className="auction-side"><div className="panel"><h2>Select Bidding Team</h2><div className="team-buttons">{teams.map((t) => <button onClick={() => placeBid(t)} key={t.id}><b>{t.name}</b><small>Purse: {currency(t.purse_left)}</small></button>)}</div></div><div className="panel history"><h2>Live Bidding History</h2>{history.length ? history.map((item, i) => <div className={`history-row ${i === 0 ? 'latest' : ''}`} key={`${item.time}-${i}`}><span><b>{item.team}</b><small>{item.time}</small></span><strong>{currency(item.amount)}</strong></div>) : <p className="muted italic">No bids placed for this player yet.</p>}</div></aside></main></Shell>;
}
const emptyPlayer = { id: '', reg_no: '', name: '', category: '', batting_style: '', bowling_style: '', district: '', block: '', base_price: 400, photo_url: '' };
function AdminHeading({ title, action }) { return <div className="admin-heading"><div><h2>{title}</h2><p>Manage your auction data before bidding.</p></div>{action}</div>; }
function FormFields({ value, setValue }) {
  const fields = [['reg_no', 'Registration No'], ['name', 'Player Name'], ['category', 'Category'], ['batting_style', 'Batting Style'], ['bowling_style', 'Bowling Style'], ['district', 'District'], ['block', 'Block'], ['base_price', 'Base Price'], ['photo_url', 'Photo URL']];
  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const result = await api('/upload-photo', { method: 'POST', body: form });
    setValue({ ...value, photo_url: result.photo_url });
  };
  return <div className="form-fields">{fields.map(([key, label]) => <input key={key} required={key !== 'photo_url'} type={key === 'base_price' ? 'number' : 'text'} placeholder={label} value={value[key] ?? ''} onChange={(e) => setValue({ ...value, [key]: key === 'base_price' ? Number(e.target.value) : e.target.value })} />)}<label className="file-label">Upload local photo<input type="file" accept="image/*" onChange={uploadPhoto} /></label></div>;
}
function Modal({ title, onClose, children }) { return <div className="modal-backdrop"><div className="modal"><h2>{title}</h2>{children}<button className="modal-close" onClick={onClose}>×</button></div></div>; }
function Admin() {
  const [tab, setTab] = useState('players'); const [players, setPlayers] = useState([]); const [teams, setTeams] = useState([]); const [settings, setSettings] = useState({}); const [playerForm, setPlayerForm] = useState(null); const [teamForm, setTeamForm] = useState(null); const [clearExisting, setClearExisting] = useState(false); const [message, setMessage] = useState('');
  const load = async () => { const [p, t, s] = await Promise.all([api('/players'), api('/teams'), api('/settings')]); setPlayers(p); setTeams(t); setSettings(s); };
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);
  const remove = async (path) => { if (window.confirm('Are you sure?')) { await api(path, { method: 'DELETE' }); await load(); } };
  const savePlayer = async (e) => { e.preventDefault(); const { id, ...payload } = playerForm; await api(id ? '/players/update' : '/players/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { id, ...payload } : payload) }); setPlayerForm(null); await load(); };
  const saveTeam = async (e) => { e.preventDefault(); const { id, ...payload } = teamForm; await api(id ? '/teams/edit' : '/teams/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { id, ...payload } : payload) }); setTeamForm(null); await load(); };
  const importFile = async (e) => { const file = e.target.files?.[0]; if (!file) return; const form = new FormData(); form.append('file', file); form.append('clear_existing', String(clearExisting)); const result = await api('/admin/import-excel', { method: 'POST', body: form }); setMessage(result.message); await load(); };
  const updateSettings = async (e) => { e.preventDefault(); await api('/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step1: settings.bid_step_1, step2: settings.bid_step_2, step3: settings.bid_step_3 }) }); setMessage('Bidding steps updated!'); };
  return <div className="admin-shell"><aside className="sidebar"><h1>⚖ AUCTION ADMIN</h1>{[['players', 'Player Management'], ['teams', 'Team Management'], ['rules', 'Bidding & Round Rules']].map(([key, label]) => <button className={tab === key ? 'selected' : ''} onClick={() => setTab(key)} key={key}>{label}</button>)}<div className="sidebar-bottom"><LinkButton href="/live" primary>⚡ Start Live Auction</LinkButton><LinkButton href="/">Public Dashboard</LinkButton></div></aside><main className="admin-main">{message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}{tab === 'players' && <><AdminHeading title="Player Management & Verification" action={<button className="button button-primary" onClick={() => setPlayerForm({ ...emptyPlayer })}>+ Add Manual Player</button>} /><div className="import-box"><div><span>Import Excel / Google Sheet Responses</span><label className="checkbox-label"><input type="checkbox" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} /> Overwrite/Clear Existing List Before Upload</label></div><input type="file" accept=".xlsx,.csv" onChange={importFile} /></div><div className="table-wrap"><table><thead><tr>{['Reg No', 'Name', 'Category', 'Batting / Bowling', 'District', 'Block', 'Base Price', 'Status', 'Actions'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{players.map((p) => <tr key={p.id}><td>{p.reg_no}</td><td>{p.name}</td><td>{p.category}</td><td>{p.batting_style} / {p.bowling_style}</td><td>{p.district}</td><td>{p.block}</td><td>{currency(p.base_price)}</td><td><span className={`status ${p.status === 'SOLD' ? 'green-bg' : 'red-bg'}`}>{p.status}</span></td><td><button onClick={() => setPlayerForm(p)}>Edit</button> <button className="danger-text" onClick={() => remove(`/players/delete/${p.id}`)}>Delete</button></td></tr>)}</tbody></table></div></>}{tab === 'teams' && <><AdminHeading title="Team Management" action={<button className="button button-primary" onClick={() => setTeamForm({ id: '', name: '', budget: 10000, purse_left: 10000 })}>+ Add New Team</button>} /><div className="card-grid">{teams.map((t) => <article className="stat-card" key={t.id}><div className="row"><h3>{t.name}</h3><span><button onClick={() => setTeamForm(t)}>Edit</button> <button className="danger-text" onClick={() => remove(`/teams/delete/${t.id}`)}>Delete</button></span></div><p>Purse Left: <strong className="green">{currency(t.purse_left)}</strong> / {currency(t.budget)}</p><p>Squad Count: <strong>{t.squad_count} Players</strong></p></article>)}</div></>}{tab === 'rules' && <><AdminHeading title="Bidding & Round Rules" /><div className="panel rules"><h3>Set Custom Bid Increment Buttons (₹)</h3><form onSubmit={updateSettings} className="rules-form">{[1, 2, 3].map((n) => <input key={n} type="number" value={settings[`bid_step_${n}`] || ''} onChange={(e) => setSettings({ ...settings, [`bid_step_${n}`]: e.target.value })} />)}<button className="button button-primary">Save Bidding Rules</button></form></div><div className="panel rules"><h3>Round Advancement Control</h3><p className="muted">Move unsold players to the next bidding pool.</p><button className="button" onClick={async () => { if (window.confirm('Start next round for unsold pool?')) { const result = await api('/admin/start-next-round', { method: 'POST' }); setMessage(result.message); } }}>Confirm & Start Next Round</button></div></>}{playerForm && <Modal title={playerForm.id ? 'Edit Player Details' : 'Add Manual Player'} onClose={() => setPlayerForm(null)}><form onSubmit={savePlayer}><FormFields value={playerForm} setValue={setPlayerForm} /><div className="modal-actions"><button type="button" onClick={() => setPlayerForm(null)}>Cancel</button><button className="button-primary">Save Player</button></div></form></Modal>}{teamForm && <Modal title={teamForm.id ? 'Edit Team Details' : 'Add New Team'} onClose={() => setTeamForm(null)}><form onSubmit={saveTeam}><input required placeholder="Team Name" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} /><input required type="number" placeholder="Budget" value={teamForm.budget} onChange={(e) => setTeamForm({ ...teamForm, budget: Number(e.target.value) })} /><input required type="number" placeholder="Purse Remaining" value={teamForm.purse_left} onChange={(e) => setTeamForm({ ...teamForm, purse_left: Number(e.target.value) })} /><div className="modal-actions"><button type="button" onClick={() => setTeamForm(null)}>Cancel</button><button className="button-primary">Save Team</button></div></form></Modal>}</main></div>;
}
function App() {
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || '/');
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  if (route.startsWith('/live')) return <LiveAuction />;
  if (route.startsWith('/admin')) return <Admin />;
  return <Dashboard />;
}
createRoot(document.getElementById('root')).render(<App />);
