import React from 'react';

// Page frame with the top bar (title + buttons) used by the public view and the live room.
export function Shell({ title, subtitle, children, actions }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="top-actions">{actions}</div>
      </header>
      {children}
    </div>
  );
}
