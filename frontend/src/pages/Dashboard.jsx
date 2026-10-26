import React, { useEffect, useState } from 'react';
import { api, currency } from '../api';
import { LinkButton } from '../components/LinkButton';
import { PlayerGrid } from '../components/PlayerGrid';
import { Section } from '../components/Section';
import { Shell } from '../components/Shell';
import { PlayerCardModal } from '../playerCard';

// Public view: team purses, sold list (click a player for the card), unsold list, yet-to-be-auctioned list.
export function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [cardPlayer, setCardPlayer] = useState(null);

  // refresh every 7 seconds (paused while the tab is hidden)
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.hidden) return;
      Promise.all([api('/teams'), api('/players')])
        .then(([t, p]) => { if (active) { setTeams(t); setPlayers(p); setError(''); } })
        .catch((e) => { if (active) setError(e.message); });
    };
    refresh();
    const timer = setInterval(refresh, 7000);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  const sold = players
    .filter((p) => p.status === 'SOLD' && (filter === 'ALL' || p.sold_to === filter))
    .sort((a, b) => Number(b.sold_price) - Number(a.sold_price));

  return (
    <Shell
      title="PREMIER LEAGUE DASHBOARD 2026"
      subtitle="Live team purses, top sold players & unsold roster"
      actions={<><LinkButton href="/live" primary>Live Auction Desk →</LinkButton><LinkButton href="/admin">Admin Control</LinkButton></>}
    >
      {error && <div className="notice error">{error}</div>}
      {cardPlayer && <PlayerCardModal player={cardPlayer} onClose={() => setCardPlayer(null)} />}

      <Section title="Team Purse & Squad Tracker">
        <div className="card-grid">
          {teams.map((t) => (
            <article className="stat-card" key={t.id}>
              <h3>{t.name}</h3>
              <p>Purse Left <strong className="green">{currency(t.purse_left)}</strong></p>
              <p>Players Bought <strong>{t.squad_count}</strong></p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Sold Players List (High to Low)"
        accent="green"
        toolbar={(
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All Teams</option>
            {teams.map((t) => <option key={t.id}>{t.name}</option>)}
          </select>
        )}
      >
        <PlayerGrid players={sold} sold onSelect={setCardPlayer} />
      </Section>

      <Section title="Unsold Players (Waiting for Next Round)" accent="red">
        <PlayerGrid players={players.filter((p) => p.status === 'UNSOLD')} empty="No unsold players yet." />
      </Section>

      <Section title="Yet To Be Auctioned">
        <PlayerGrid players={players.filter((p) => p.status === 'PENDING')} pending empty="All players have been through the auction." />
      </Section>
    </Shell>
  );
}
