import React, { useState } from 'react';
import { api, currency } from '../../api';
import { AdminHeading } from './AdminHeading';
import { Modal } from './Modal';

// Admin > Team Management: team cards, add/edit popup.
export function TeamsTab({ teams, load, remove }) {
  const [teamForm, setTeamForm] = useState(null);

  const saveTeam = async (e) => {
    e.preventDefault();
    const { id, ...payload } = teamForm;
    await api(id ? '/teams/edit' : '/teams/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { id, ...payload } : payload) });
    setTeamForm(null);
    await load();
  };

  return (
    <>
      <AdminHeading
        title="Team Management"
        action={<button className="button button-primary" onClick={() => setTeamForm({ id: '', name: '', budget: 10000, purse_left: 10000 })}>+ Add New Team</button>}
      />
      <div className="card-grid">
        {teams.map((t) => (
          <article className="stat-card" key={t.id}>
            <div className="row">
              <h3>{t.name}</h3>
              <span>
                <button onClick={() => setTeamForm(t)}>Edit</button>{' '}
                <button className="danger-text" onClick={() => remove(`/teams/delete/${t.id}`)}>Delete</button>
              </span>
            </div>
            <p>Purse Left: <strong className="green">{currency(t.purse_left)}</strong> / {currency(t.budget)}</p>
            <p>Squad Count: <strong>{t.squad_count} Players</strong></p>
          </article>
        ))}
      </div>

      {teamForm && (
        <Modal title={teamForm.id ? 'Edit Team Details' : 'Add New Team'} onClose={() => setTeamForm(null)}>
          <form onSubmit={saveTeam}>
            <input required placeholder="Team Name" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
            <input required type="number" placeholder="Budget" value={teamForm.budget} onChange={(e) => setTeamForm({ ...teamForm, budget: Number(e.target.value) })} />
            <input required type="number" placeholder="Purse Remaining" value={teamForm.purse_left} onChange={(e) => setTeamForm({ ...teamForm, purse_left: Number(e.target.value) })} />
            <div className="modal-actions">
              <button type="button" onClick={() => setTeamForm(null)}>Cancel</button>
              <button className="button-primary">Save Team</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
