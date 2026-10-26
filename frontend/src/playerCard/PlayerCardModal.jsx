// The popup that shows one sold player's card, with the bidding history beside it.
import React, { useEffect, useState } from 'react';
import { api, currency } from '../api';
import { drawPlayerCard } from './drawPlayerCard';
import { cardFileName, downloadBlob, fmtTime } from './helpers';
import './playerCard.css';

async function sharePlayerCard(player, blob, suffix = '') {
  const file = new File([blob], cardFileName(player, suffix), { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `${player.name} - SOLD`, text: `${player.name} sold to ${player.sold_to} for ${currency(player.sold_price)}` }); } catch (e) { /* share cancelled */ }
  } else {
    downloadBlob(blob, file.name);
  }
}

export function PlayerCardModal({ player, onClose }) {
  const [blob, setBlob] = useState(null);
  const [fullBlob, setFullBlob] = useState(null);
  const [url, setUrl] = useState('');
  const [bids, setBids] = useState([]);
  const [include, setInclude] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; let objectUrl = '';
    drawPlayerCard(player).then((b) => { if (!active) return; objectUrl = URL.createObjectURL(b); setBlob(b); setUrl(objectUrl); }).catch((e) => { if (active) setError(e.message); });
    api(`/bids/player/${player.id}`).then((rows) => {
      if (!active) return;
      const list = [...rows].reverse();
      setBids(list);
      if (list.length) drawPlayerCard(player, { bids: list, withHistory: true }).then((b) => { if (active) setFullBlob(b); });
    }).catch(() => {});
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { active = false; window.removeEventListener('keydown', onKey); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [player.id]);
  const useFull = include && bids.length > 0;
  const outBlob = useFull ? fullBlob : blob;
  const suffix = useFull ? '_with_history' : '';
  return (
    <div className="card-modal" onClick={onClose}>
      <div className="card-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="card-modal-close" onClick={onClose}>×</button>
        <div className="card-modal-main">
          {error ? <p className="notice error">{error}</p> : url ? <img className="card-preview" src={url} alt={`${player.name} card`} /> : <p className="muted">Preparing card...</p>}
          <aside className="bid-panel">
            <h3>Bidding History</h3>
            {bids.length ? <p className="muted">{bids.length} bids · Base {currency(player.base_price)}</p> : <p className="muted">No bids were recorded for this player.</p>}
            <div className="bid-list">
              {bids.map((b, i) => (
                <div key={b.id} className={`bid-row${player.status === 'SOLD' && i === bids.length - 1 ? ' win' : ''}`}>
                  <span className="bid-n">{i + 1}</span>
                  <div><b>{b.team_name}</b><small>{fmtTime(b.timestamp)}</small></div>
                  <strong>{currency(b.bid_amount)}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
        {bids.length > 0 && <label className="card-check"><input type="checkbox" checked={include} onChange={(e) => setInclude(e.target.checked)} /> Include bidding history in the download</label>}
        <div className="card-modal-actions">
          <button className="button button-primary" disabled={!outBlob} onClick={() => downloadBlob(outBlob, cardFileName(player, suffix))}>⬇ Download</button>
          <button className="button" disabled={!outBlob} onClick={() => sharePlayerCard(player, outBlob, suffix)}>↗ Share</button>
        </div>
      </div>
    </div>
  );
}
