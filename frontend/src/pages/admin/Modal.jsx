import React from 'react';

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{title}</h2>
        {children}
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
