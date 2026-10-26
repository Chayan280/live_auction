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
  const [soldSort, setSoldSort] = useState('LATEST');
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
    .sort((a, b) => {
      if (soldSort === 'PRICE_DESC') return Number(b.sold_price) - Number(a.sold_price);
      if (soldSort === 'PRICE_ASC') return Number(a.sold_price) - Number(b.sold_price);
      const timeA = a.sold_at ? Date.parse(a.sold_at) : 0;
      const timeB = b.sold_at ? Date.parse(b.sold_at) : 0;
      if (soldSort === 'OLDEST') return (timeA || Number(a.id)) - (timeB || Number(b.id));
      // Latest sold first. For older records without a sold timestamp, higher IDs are the best available fallback.
      return (timeB || Number(b.id)) - (timeA || Number(a.id));
    });

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
          <div className="section-filters">
            <select aria-label="Filter sold players by team" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">All Teams</option>
              {teams.map((t) => <option key={t.id}>{t.name}</option>)}
            </select>
            <select aria-label="Sort sold players" value={soldSort} onChange={(e) => setSoldSort(e.target.value)}>
              <option value="LATEST">Recently Sold First</option>
              <option value="OLDEST">First Sold First</option>
              <option value="PRICE_DESC">Highest Price First</option>
              <option value="PRICE_ASC">Lowest Price First</option>
            </select>
          </div>
        )}
      >
        <PlayerGrid players={sold} sold horizontal onSelect={setCardPlayer} />
      </Section>

      <Section title="Unsold Players (Waiting for Next Round)" accent="red">
        <PlayerGrid players={players.filter((p) => p.status === 'UNSOLD')} horizontal empty="No unsold players yet." />
      </Section>

      <Section title="Yet To Be Auctioned">
        <PlayerGrid players={players.filter((p) => p.status === 'PENDING')} pending horizontal empty="All players have been through the auction." />
      </Section>
    </Shell>
  );
}
