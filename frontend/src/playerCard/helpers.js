// Small helpers used by the card drawing code and the popup.
import { CARD_FONT } from './config';

export const loadImage = (src) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});
export const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
export const fmtTime = (ts) => {
  if (!ts) return '';
  const d = new Date(`${String(ts).replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
};
export const cardFileName = (p, suffix = '', ext = 'png') => `${p.reg_no}_${String(p.name).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}_SOLD${suffix}.${ext}`;
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// Largest font size (<= maxSize) where the text fits in maxWidth using at most maxLines lines.
// Long names are wrapped, shrunk, and finally cut with "..." so the layout never breaks.
export const wrapFit = (ctx, text, weight, maxSize, minSize, maxWidth, maxLines) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  const measure = (value) => ctx.measureText(value).width;
  const greedy = () => {
    const lines = []; let line = '';
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (!line || measure(test) <= maxWidth) line = test; else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
    return lines;
  };
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = `${weight} ${size}px ${CARD_FONT}`;
    const lines = greedy();
    if (lines.length <= maxLines && lines.every((l) => measure(l) <= maxWidth)) return { size, lines, fits: true };
  }
  ctx.font = `${weight} ${minSize}px ${CARD_FONT}`;
  let lines = greedy();
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += '…'; }
  lines = lines.map((l) => { let t = l; while (t.length > 1 && measure(t) > maxWidth) t = `${t.slice(0, -2)}…`; return t; });
  return { size: minSize, lines, fits: false };
};
export const fitSingle = (ctx, text, weight, maxSize, maxWidth) => wrapFit(ctx, text, weight, maxSize, 22, maxWidth, 1).size;
