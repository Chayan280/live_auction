import React from 'react';
import { api } from '../../api';
import { AdminHeading } from './AdminHeading';

// Admin > Bidding & Round Rules: bid increment buttons and "start next round".
export function RulesTab({ players, settings, setSettings, load, setMessage }) {
  const unsold = players.filter((p) => p.status === 'UNSOLD').length;
  const pending = players.filter((p) => p.status === 'PENDING').length;

  const updateSettings = async (e) => {
    e.preventDefault();
    await api('/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step1: settings.bid_step_1, step2: settings.bid_step_2, step3: settings.bid_step_3 }) });
    setMessage('Bidding steps updated!');
  };

  const startNextRound = async () => {
    if (!unsold) return setMessage('No unsold players to move to the next round.');
    const ask = pending
      ? `${pending} players have not been auctioned yet in this round. Start next round anyway with ${unsold} unsold players?`
      : `Start next round with ${unsold} unsold players?`;
    if (!window.confirm(ask)) return;
    try {
      const result = await api('/admin/start-next-round', { method: 'POST' });
      setMessage(result.message);
      await load();
    } catch (e) { setMessage(e.message); }
  };

  return (
    <>
      <AdminHeading title="Bidding & Round Rules" />
      <div className="panel rules">
        <h3>Set Custom Bid Increment Buttons (₹)</h3>
        <form onSubmit={updateSettings} className="rules-form">
          {[1, 2, 3].map((n) => (
            <input key={n} type="number" value={settings[`bid_step_${n}`] || ''} onChange={(e) => setSettings({ ...settings, [`bid_step_${n}`]: e.target.value })} />
          ))}
          <button className="button button-primary">Save Bidding Rules</button>
        </form>
      </div>
      <div className="panel rules">
        <h3>Round Advancement Control</h3>
        <p className="muted">Move unsold players to the next bidding pool. Unsold now: {unsold} · Still pending: {pending}</p>
        <button className="button" onClick={startNextRound}>Confirm & Start Next Round</button>
      </div>
    </>
  );
}
