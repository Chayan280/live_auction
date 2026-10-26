import React from 'react';
import { PLACEHOLDER, currency, imageUrl } from '../api';

// Grid of small player cards. Pass onSelect to make the cards clickable (used for the sold list).
export function PlayerGrid({ players, sold = false, pending = false, empty, onSelect }) {
  if (!players.length) {
    return <p className="muted italic">{empty || (sold ? 'No players sold yet.' : 'No unsold players remaining.')}</p>;
  }
  return (
    <div className="card-grid">
      {players.map((p) => (
        <article
          className={`player-mini ${sold ? 'sold' : pending ? 'pending' : 'unsold'}${onSelect ? ' clickable' : ''}`}
          key={p.id}
          onClick={onSelect ? () => onSelect(p) : undefined}
          title={onSelect ? 'Click to view player card' : undefined}
        >
          <img src={imageUrl(p.photo_url)} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} alt="" />
          <div>
            <h3>{p.name}</h3>
            <small>{p.category}</small>
            {sold ? (
              <>
                <strong className="green">{currency(p.sold_price)}</strong>
                <small>Sold to: {p.sold_to}</small>
              </>
            ) : (
              <>
                <strong>{currency(p.base_price)}</strong>
                <small>District: {p.district}</small>
                <small>Block(SALBONI): {p.block}</small>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
