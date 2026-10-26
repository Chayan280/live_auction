import React, { useEffect, useState } from 'react';
import { PLACEHOLDER, api, currency, imageUrl } from '../api';
import { LinkButton } from '../components/LinkButton';
import { Shell } from '../components/Shell';

// Long names get a smaller font so they never take 3 lines.
const nameClass = (name = '') => (name.length > 26 ? 'name-xl' : name.length > 16 ? 'name-lg' : '');

// Live room: pick a random player, place bids for teams, then SELL or mark UNSOLD.
export function LiveAuction() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({ bid_step_1: 100, bid_step_2: 500, bid_step_3: 1000 });
  const [player, setPlayer] = useState(null);
  const [bid, setBid] = useState(0);
  const [leader, setLeader] = useState('');
  const [step, setStep] = useState(100);
  const [history, setHistory] = useState([]);
  const [stamp, setStamp] = useState('');
  const [notice, setNotice] = useState('');
  const [seen, setSeen] = useState([]);
  const selectPlayer = (next, current = settings) => { setPlayer(next); setSeen((ids) => (ids.includes(next.id) ? ids : [...ids, next.id])); setBid(Number(next.base_price || 0)); setLeader(''); setHistory([]); setStamp(''); setStep(Number(current.bid_step_1 || 100)); };
  const load = async () => { const [t, p, s] = await Promise.all([api('/teams'), api('/players'), api('/settings')]); setTeams(t); setPlayers(p); setSettings(s); const pool = p.filter((x) => x.status === 'PENDING'); if (pool.length) selectPlayer(pool[Math.floor(Math.random() * pool.length)], s); };
  useEffect(() => { load().catch((e) => setNotice(e.message)); }, []);
  const placeBid = async (team) => {
    if (!player) return setNotice('Please select a player first.'); if (stamp) return setNotice('This player is already finalized. Click Next Random Player.');
    if (leader === team.name) return setNotice(`${team.name} is already the highest bidder.`);
    const amount = leader ? bid + Number(step) : bid;
    if (Number(team.purse_left) < amount) return setNotice(`Insufficient purse! ${team.name} has only ${currency(team.purse_left)} left.`);
    const entry = { team: team.name, amount, time: new Date().toLocaleTimeString() };
    setBid(amount);
    setLeader(team.name);
    setHistory((items) => [entry, ...items]);
    try { await api('/bids/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: player.id, team_name: team.name, bid_amount: amount }) }); } catch (e) { setNotice(e.message); }
  };
  const finalize = async (status) => { if (!player) return setNotice('Select a player first.'); if (stamp) return setNotice(stamp === 'UNSOLD' ? 'This player is already marked UNSOLD. Click Next Random Player.' : `This player is already ${stamp}. Click Next Random Player.`); if (status === 'SOLD' && !leader) return setNotice('Click a team button to make a bid before selling.'); try { await api('/players/sell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: player.id, sold_to: status === 'SOLD' ? leader : null, sold_price: status === 'SOLD' ? bid : 0, status }) }); setStamp(status === 'SOLD' ? `SOLD TO ${leader}` : 'UNSOLD'); setTeams(await api('/teams')); } catch (e) { setNotice(e.message); } };
  const nextPlayer = async () => {
    try {
      const freshPlayers = await api('/players');
      setPlayers(freshPlayers);
      const pool = freshPlayers.filter((p) => p.status === 'PENDING');
      if (!pool.length) return setNotice('No players left in this round. Start the next round from Admin to bring back unsold players.');
      let candidates = pool.filter((p) => !seen.includes(p.id));
      if (!candidates.length) {
        setSeen(player ? [player.id] : []);
        candidates = pool.filter((p) => p.id !== player?.id);
        if (!candidates.length) candidates = pool;
        setNotice('All players have been shown once - starting a new random round.');
      } else {
        setNotice('');
      }
      selectPlayer(candidates[Math.floor(Math.random() * candidates.length)]);
    } catch (e) {
      setNotice(`Could not load the next player: ${e.message}`);
    }
  };

  return (
    <Shell
      title="⚡ LIVE AUCTION ROOM"
      subtitle="Run the auction, place bids and finalize players"
      actions={(
        <>
          <button className="button button-primary" onClick={nextPlayer}>⚡ Next Random Player</button>
          <LinkButton href="/admin">Admin Dashboard</LinkButton>
          <LinkButton href="/">Public View</LinkButton>
        </>
      )}
    >
      {notice && <div className="notice">{notice}<button onClick={() => setNotice('')}>×</button></div>}
      <main className="auction-layout">

        <section className="auction-center">
          <div className="panel player-showcase">
            {stamp && <div className={`stamp ${stamp === 'UNSOLD' ? 'unsold-stamp' : ''}`}>{stamp}</div>}
            <img src={imageUrl(player?.photo_url)} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} alt="" />
            <div className="player-details">
              <span className="tag">{player?.reg_no || 'REG-000'}</span>
              <h2 className={nameClass(player?.name)}>{player?.name || 'Ready for Auction'}</h2>
              <div className="detail-grid">
                {[['CATEGORY', player?.category], ['DISTRICT', player?.district], ['BLOCK(SALBONI)', player?.block], ['BATTING', player?.batting_style], ['BOWLING', player?.bowling_style]].map(([label, value]) => (
                  <div key={label}><small>{label}</small><b>{value || '--'}</b></div>
                ))}
              </div>
              <div className="base-price">BASE PRICE <strong>{currency(player?.base_price)}</strong></div>
            </div>
          </div>

          <div className="panel bidding-console">
            <div className="bid-summary">
              <div><small>Current Highest Bid</small><strong>{currency(bid)}</strong></div>
              <div><small>Highest Bidder</small><b>{leader || 'None'}</b></div>
            </div>
            <div className="step-grid">
              {[settings.bid_step_1, settings.bid_step_2, settings.bid_step_3].map((amount) => (
                <button className={Number(step) === Number(amount) ? 'active' : ''} onClick={() => setStep(amount)} key={amount}>+{currency(amount)}</button>
              ))}
            </div>
            <div className="action-grid">
              <button className="sell" onClick={() => finalize('SOLD')}>✓ SELL PLAYER</button>
              <button className="mark-unsold" onClick={() => finalize('UNSOLD')}>× MARK UNSOLD</button>
            </div>
          </div>
        </section>

        <aside className="auction-side">
          <div className="panel">
            <h2>Select Bidding Team</h2>
            <div className="team-buttons">
              {teams.map((t) => (
                <button onClick={() => placeBid(t)} key={t.id}><b>{t.name}</b><small>Purse: {currency(t.purse_left)}</small></button>
              ))}
            </div>
          </div>
          <div className="panel history">
            <h2>Live Bidding History</h2>
            {history.length ? history.map((item, i) => (
              <div className={`history-row ${i === 0 ? 'latest' : ''}`} key={`${item.time}-${i}`}>
                <span><b>{item.team}</b><small>{item.time}</small></span>
                <strong>{currency(item.amount)}</strong>
              </div>
            )) : <p className="muted italic">No bids placed for this player yet.</p>}
          </div>
        </aside>
      </main>
    </Shell>
  );
}
