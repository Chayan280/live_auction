import React from 'react';

export function Section({ title, accent = '', toolbar, children }) {
  return (
    <section className="section">
      <div className="section-heading"><h2 className={accent}>{title}</h2>{toolbar}</div>
      {children}
    </section>
  );
}
