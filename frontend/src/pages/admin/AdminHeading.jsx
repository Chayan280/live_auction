import React from 'react';

export function AdminHeading({ title, action }) {
  return (
    <div className="admin-heading">
      <div><h2>{title}</h2><p>Manage your auction data before bidding.</p></div>
      {action}
    </div>
  );
}
