import React, { useState } from 'react';
import { api, currency } from '../../api';
import { AdminHeading } from './AdminHeading';
import { FormFields } from './FormFields';
import { Modal } from './Modal';

const emptyPlayer = { id: '', reg_no: '', name: '', category: '', batting_style: '', bowling_style: '', district: '', block: '', base_price: 400, photo_url: '' };
const headers = ['Reg No', 'Name', 'Category', 'Batting / Bowling', 'District', 'Block(SALBONI)', 'Base Price', 'Status', 'Actions'];

// Admin > Player Management: Excel import, player table, add/edit popup.
export function PlayersTab({ players, load, setMessage, remove, onShowCard }) {
  const [playerForm, setPlayerForm] = useState(null);
  const [clearExisting, setClearExisting] = useState(false);

  const savePlayer = async (e) => {
    e.preventDefault();
    const { id, ...payload } = playerForm;
    await api(id ? '/players/update' : '/players/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { id, ...payload } : payload) });
    setPlayerForm(null);
    await load();
  };

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('clear_existing', String(clearExisting));
    const result = await api('/admin/import-excel', { method: 'POST', body: form });
    setMessage(result.message);
    await load();
  };

  return (
    <>
      <AdminHeading
        title="Player Management & Verification"
        action={<button className="button button-primary" onClick={() => setPlayerForm({ ...emptyPlayer })}>+ Add Manual Player</button>}
      />
      <div className="import-box">
        <div>
          <span>Import Excel / Google Sheet Responses</span>
          <label className="checkbox-label"><input type="checkbox" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} /> Overwrite/Clear Existing List Before Upload</label>
        </div>
        <input type="file" accept=".xlsx,.csv" onChange={importFile} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.reg_no}</td>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.batting_style} / {p.bowling_style}</td>
                <td>{p.district}</td>
                <td>{p.block}</td>
                <td>{currency(p.base_price)}</td>
                <td><span className={`status ${p.status === 'SOLD' ? 'green-bg' : p.status === 'PENDING' ? 'amber-bg' : 'red-bg'}`}>{p.status}</span></td>
                <td>
                  {p.status === 'SOLD' && <><button onClick={() => onShowCard(p)}>Card</button>{' '}</>}
                  <button onClick={() => setPlayerForm(p)}>Edit</button>{' '}
                  <button className="danger-text" onClick={() => remove(`/players/delete/${p.id}`)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {playerForm && (
        <Modal title={playerForm.id ? 'Edit Player Details' : 'Add Manual Player'} onClose={() => setPlayerForm(null)}>
          <form onSubmit={savePlayer}>
            <FormFields value={playerForm} setValue={setPlayerForm} />
            <div className="modal-actions">
              <button type="button" onClick={() => setPlayerForm(null)}>Cancel</button>
              <button className="button-primary">Save Player</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
