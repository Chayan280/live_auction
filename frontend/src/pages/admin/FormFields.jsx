import React from 'react';
import { api } from '../../api';

const fields = [
  ['reg_no', 'Registration No'], ['name', 'Player Name'], ['category', 'Category'],
  ['batting_style', 'Batting Style'], ['bowling_style', 'Bowling Style'], ['district', 'District'],
  ['block', 'Block(SALBONI)'], ['base_price', 'Base Price'], ['photo_url', 'Photo URL'],
];

// The input boxes of the "Add / Edit player" popup.
export function FormFields({ value, setValue }) {
  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const result = await api('/upload-photo', { method: 'POST', body: form });
    setValue({ ...value, photo_url: result.photo_url });
  };

  return (
    <div className="form-fields">
      {fields.map(([key, label]) => (
        <input
          key={key}
          required={key !== 'photo_url'}
          type={key === 'base_price' ? 'number' : 'text'}
          placeholder={label}
          value={value[key] ?? ''}
          onChange={(e) => setValue({ ...value, [key]: key === 'base_price' ? Number(e.target.value) : e.target.value })}
        />
      ))}
      <label className="file-label">Upload local photo<input type="file" accept="image/*" onChange={uploadPhoto} /></label>
    </div>
  );
}
