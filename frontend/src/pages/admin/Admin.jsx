import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { PlayerCardModal, downloadCardsZip } from '../../playerCard';
import { AdminSidebar } from './AdminSidebar';
import { PlayersTab } from './PlayersTab';
import { RulesTab } from './RulesTab';
import { TeamsTab } from './TeamsTab';

// Admin panel: loads the data once, keeps the shared state, and shows the selected tab.
export function Admin() {
  const [tab, setTab] = useState('players');
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [settings, setSettings] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [cardPlayer, setCardPlayer] = useState(null);

  const load = async () => {
    const [p, t, s] = await Promise.all([api('/players'), api('/teams'), api('/settings')]);
    setPlayers(p);
    setTeams(t);
    setSettings(s);
  };
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  const toTop = () => document.querySelector('.admin-main')?.scrollTo({ top: 0, behavior: 'smooth' });

  const cachePhotos = async () => {
    setBusy('cache'); setMessage('Saving photos to the server... please wait.'); toTop();
    try { const result = await api('/admin/cache-images', { method: 'POST' }); setMessage(result.message); } catch (e) { setMessage(e.message); }
    setBusy('');
  };

  const resetAuction = async () => {
    const typed = window.prompt('This clears ALL sold/unsold results, bids and team purses. Players and teams stay.\n\nType RESET to continue:');
    if (typed !== 'RESET') return;
    try { const result = await api('/admin/reset-auction', { method: 'POST' }); setMessage(result.message); await load(); } catch (e) { setMessage(e.message); }
    toTop();
  };

  const downloadAllCards = async () => {
    const soldPlayers = players.filter((p) => p.status === 'SOLD');
    if (!soldPlayers.length) return setMessage('No sold players yet - nothing to download.');
    setBusy('zip'); toTop();
    try {
      await downloadCardsZip(soldPlayers, (done, total) => setMessage(`Making cards... ${done} / ${total}`));
      setMessage(`Done! ${soldPlayers.length} cards saved in the ZIP.`);
    } catch (e) { setMessage(`Could not make the ZIP: ${e.message}`); }
    setBusy('');
  };

  const remove = async (path) => {
    if (window.confirm('Are you sure?')) { await api(path, { method: 'DELETE' }); await load(); }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar tab={tab} setTab={setTab} busy={busy} onCachePhotos={cachePhotos} onDownloadCards={downloadAllCards} onReset={resetAuction} />
      <main className="admin-main">
        {cardPlayer && <PlayerCardModal player={cardPlayer} onClose={() => setCardPlayer(null)} />}
        {message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}
        {tab === 'players' && <PlayersTab players={players} load={load} setMessage={setMessage} remove={remove} onShowCard={setCardPlayer} />}
        {tab === 'teams' && <TeamsTab teams={teams} load={load} remove={remove} />}
        {tab === 'rules' && <RulesTab players={players} settings={settings} setSettings={setSettings} load={load} setMessage={setMessage} />}
      </main>
    </div>
  );
}
