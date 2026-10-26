import React from 'react';
import { API } from '../../api';
import { LinkButton } from '../../components/LinkButton';

const tabs = [['players', 'Player Management'], ['teams', 'Team Management'], ['rules', 'Bidding & Round Rules']];

// Left menu of the admin panel: tabs on top, action buttons at the bottom.
export function AdminSidebar({ tab, setTab, busy, onCachePhotos, onDownloadCards, onReset }) {
  return (
    <aside className="sidebar">
      <h1>⚖ AUCTION ADMIN</h1>
      {tabs.map(([key, label]) => (
        <button className={tab === key ? 'selected' : ''} onClick={() => setTab(key)} key={key}>{label}</button>
      ))}
      <div className="sidebar-bottom">
        <button className="side-action" disabled={busy === 'cache'} onClick={onCachePhotos}>{busy === 'cache' ? 'Saving photos...' : '🖼 Save Photos to Server'}</button>
        <a className="side-action" href={`${API}/export/summary`}>📥 Export Excel Report</a>
        <button className="side-action" disabled={busy === 'zip'} onClick={onDownloadCards}>{busy === 'zip' ? 'Making cards...' : '🗂 Download All Cards (ZIP)'}</button>
        <button className="side-action danger" onClick={onReset}>↺ Reset Auction</button>
        <LinkButton href="/live" primary>⚡ Start Live Auction</LinkButton>
        <LinkButton href="/">Public Dashboard</LinkButton>
      </div>
    </aside>
  );
}
