// Draws the player card (and the optional bidding-history panel) on a canvas and returns an image Blob.
import { currency, imageUrl } from '../api';
import { CARD_FONT, CARD_FOOTER_TEXT, CARD_INSTAGRAM, CARD_SUBTITLE, CARD_TITLE, TEAM_LOGOS } from './config';
import { fitSingle, fmtTime, loadImage, roundRect, wrapFit } from './helpers';

function drawPhotoBox(ctx, photo, x, y, w, h, initial) {
  ctx.save(); roundRect(ctx, x, y, w, h, 36); ctx.clip();
  if (!photo) {
    ctx.fillStyle = '#1f2937'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#374151'; ctx.font = `900 260px ${CARD_FONT}`; ctx.textAlign = 'center';
    ctx.fillText(initial, x + w / 2, y + h / 2 + 90);
  } else {
    // blurred copy of the photo fills the frame, so photos of any shape look good
    const tiny = document.createElement('canvas');
    tiny.width = 48; tiny.height = Math.max(8, Math.round((48 * h) / w));
    const tctx = tiny.getContext('2d');
    const ts = Math.max(tiny.width / photo.width, tiny.height / photo.height);
    tctx.drawImage(photo, (tiny.width - photo.width * ts) / 2, (tiny.height - photo.height * ts) / 2, photo.width * ts, photo.height * ts);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tiny, x, y, w, h);
    ctx.fillStyle = 'rgba(6,10,18,0.35)'; ctx.fillRect(x, y, w, h);
    // sharp photo: fill the frame when the shape is close, otherwise show the whole photo (nothing cut)
    const closeEnough = Math.abs(photo.width / photo.height - w / h) / (w / h) < 0.18;
    const scale = closeEnough ? Math.max(w / photo.width, h / photo.height) : Math.min(w / photo.width, h / photo.height);
    const dw = photo.width * scale; const dh = photo.height * scale;
    const dx = x + (w - dw) / 2;
    const dy = closeEnough ? y + (h - dh) * 0.25 : y + (h - dh) / 2;
    if (!closeEnough) { ctx.save(); roundRect(ctx, dx, dy, dw, dh, 24); ctx.clip(); ctx.drawImage(photo, dx, dy, dw, dh); ctx.restore(); } else ctx.drawImage(photo, dx, dy, dw, dh);
  }
  ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = '#f59e0b'; roundRect(ctx, x, y, w, h, 36); ctx.stroke();
}

// Instagram logo drawn with simple shapes (gradient outline: rounded square, circle, dot).
function drawInstagramLogo(ctx, x, y, s) {
  const gradient = ctx.createLinearGradient(x, y + s, x + s, y);
  gradient.addColorStop(0, '#feda75'); gradient.addColorStop(0.3, '#fa7e1e'); gradient.addColorStop(0.55, '#d62976');
  gradient.addColorStop(0.8, '#962fbf'); gradient.addColorStop(1, '#4f5bd5');
  ctx.save();
  ctx.strokeStyle = gradient; ctx.fillStyle = gradient; ctx.lineWidth = s * 0.09;
  const half = ctx.lineWidth / 2;
  roundRect(ctx, x + half, y + half, s - ctx.lineWidth, s - ctx.lineWidth, s * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * 0.22, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + s * 0.76, y + s * 0.25, s * 0.055, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Footer: "Edited & Distributed by  [instagram logo] handle". Uses 2 lines when the space is narrow.
function drawFooter(ctx, cx, baseline, maxWidth) {
  ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  const icon = 34; const gap = 12; const inner = 10;
  ctx.font = `600 24px ${CARD_FONT}`; const labelWidth = ctx.measureText(CARD_FOOTER_TEXT).width;
  ctx.font = `800 28px ${CARD_FONT}`; const handleWidth = CARD_INSTAGRAM ? ctx.measureText(CARD_INSTAGRAM).width : 0;
  const handleBlock = CARD_INSTAGRAM ? icon + inner + handleWidth : 0;
  const drawLabel = (x, y) => { ctx.font = `600 24px ${CARD_FONT}`; ctx.fillStyle = '#9ca3af'; ctx.fillText(CARD_FOOTER_TEXT, x, y); };
  const drawHandle = (x, y) => {
    drawInstagramLogo(ctx, x, y - icon + 6, icon);
    ctx.font = `800 28px ${CARD_FONT}`; ctx.fillStyle = '#f3f4f6'; ctx.fillText(CARD_INSTAGRAM, x + icon + inner, y);
  };
  if (!CARD_INSTAGRAM) {
    drawLabel(cx - labelWidth / 2, baseline);
  } else if (labelWidth + gap + handleBlock <= maxWidth) {
    const startX = cx - (labelWidth + gap + handleBlock) / 2;
    drawLabel(startX, baseline); drawHandle(startX + labelWidth + gap, baseline);
  } else {
    drawLabel(cx - labelWidth / 2, baseline - 38); drawHandle(cx - handleBlock / 2, baseline);
  }
  ctx.restore();
}

function drawBidHistoryPanel(ctx, x0, W, H, player, bids) {
  const w = 520;
  const frame = ctx.createLinearGradient(x0, 0, x0 + w, H); frame.addColorStop(0, '#f59e0b'); frame.addColorStop(1, '#b45309');
  ctx.fillStyle = 'rgba(11,18,32,0.86)'; roundRect(ctx, x0, 24, w, H - 48, 40); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = frame; roundRect(ctx, x0, 24, w, H - 48, 40); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f59e0b'; ctx.font = `900 34px ${CARD_FONT}`; ctx.letterSpacing = '5px'; ctx.fillText('BIDDING HISTORY', x0 + w / 2, 100);
  ctx.letterSpacing = '0px'; ctx.fillStyle = '#9ca3af'; ctx.font = `600 24px ${CARD_FONT}`;
  ctx.fillText(`${bids.length} bids  •  Base ${currency(player.base_price)}`, x0 + w / 2, 140);

  const maxRows = 12;
  const hidden = Math.max(0, bids.length - maxRows);
  const shown = hidden ? bids.slice(-(maxRows - 1)) : bids;
  let y = 176;
  if (hidden) { ctx.fillStyle = '#6b7280'; ctx.font = `600 22px ${CARD_FONT}`; ctx.fillText(`+ ${hidden + 1} earlier bids`, x0 + w / 2, y + 26); y += 44; }
  shown.forEach((bid, idx) => {
    const number = bids.length - shown.length + idx + 1;
    const winner = player.status === 'SOLD' && number === bids.length;
    const rx = x0 + 30; const rw = w - 60;
    ctx.fillStyle = winner ? 'rgba(245,158,11,0.18)' : '#151e2e'; roundRect(ctx, rx, y, rw, 78, 20); ctx.fill();
    if (winner) { ctx.lineWidth = 3; ctx.strokeStyle = '#f59e0b'; roundRect(ctx, rx, y, rw, 78, 20); ctx.stroke(); }
    ctx.fillStyle = winner ? '#f59e0b' : '#263043'; ctx.beginPath(); ctx.arc(rx + 38, y + 39, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = winner ? '#111827' : '#9ca3af'; ctx.font = `800 22px ${CARD_FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(number), rx + 38, y + 47);
    ctx.textAlign = 'left';
    const teamFit = wrapFit(ctx, bid.team_name, 700, 28, 20, 215, 1);
    ctx.font = `700 ${teamFit.size}px ${CARD_FONT}`; ctx.fillStyle = '#ffffff'; ctx.fillText(teamFit.lines[0], rx + 76, y + 36);
    ctx.fillStyle = '#6b7280'; ctx.font = `500 20px ${CARD_FONT}`; ctx.fillText(fmtTime(bid.timestamp), rx + 76, y + 62);
    ctx.textAlign = 'right'; ctx.fillStyle = winner ? '#fbbf24' : '#34d399'; ctx.font = `800 34px ${CARD_FONT}`; ctx.fillText(currency(bid.bid_amount), rx + rw - 22, y + 50);
    y += 88;
  });
  drawFooter(ctx, x0 + w / 2, H - 44, w - 60);
}

export async function drawPlayerCard(player, { bids = [], withHistory = false, type = 'image/png' } = {}) {
  const W = 1080; const H = 1350; const CX = W / 2;
  const history = [...bids].sort((a, b) => a.id - b.id);
  const showHistory = withHistory && history.length > 0;
  const TW = showHistory ? W + 560 : W;
  await Promise.all([document.fonts.load(`900 80px ${CARD_FONT}`), document.fonts.load(`700 30px ${CARD_FONT}`)]).catch(() => {});
  const hasPhoto = player.photo_url && player.photo_url !== 'N/A';
  const [photo, logo] = await Promise.all([hasPhoto ? loadImage(imageUrl(player.photo_url)) : null, TEAM_LOGOS[player.sold_to] ? loadImage(TEAM_LOGOS[player.sold_to]) : null]);
  const canvas = document.createElement('canvas');
  canvas.width = TW; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const centerText = (text, y, x = CX) => ctx.fillText(text, x, y);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

  // background + glow
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1220'); bg.addColorStop(1, '#060a12');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, TW, H);
  const glow = ctx.createRadialGradient(W * 0.85, 120, 10, W * 0.85, 120, 560);
  glow.addColorStop(0, 'rgba(245,158,11,0.30)'); glow.addColorStop(1, 'rgba(245,158,11,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, TW, H);

  // team name as a big transparent watermark
  const teamName = String(player.sold_to || '').toUpperCase();
  if (teamName) {
    ctx.save(); ctx.textBaseline = 'middle';
    const size = fitSingle(ctx, teamName, 900, 190, 1250);
    ctx.font = `900 ${size}px ${CARD_FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.075)';
    ctx.translate(TW / 2, H / 2); ctx.rotate(-Math.PI / 9);
    for (let i = -3; i <= 3; i += 1) ctx.fillText(teamName, (Math.abs(i) % 2) * 160, i * size * 1.25);
    ctx.restore();
  }

  // frame
  const frame = ctx.createLinearGradient(0, 0, W, H); frame.addColorStop(0, '#f59e0b'); frame.addColorStop(1, '#b45309');
  ctx.lineWidth = 6; ctx.strokeStyle = frame; roundRect(ctx, 24, 24, W - 48, H - 48, 40); ctx.stroke();

  // header
  ctx.fillStyle = '#f59e0b'; ctx.font = `900 38px ${CARD_FONT}`; ctx.letterSpacing = '6px'; centerText(CARD_TITLE, 86);
  ctx.fillStyle = '#9ca3af'; ctx.font = `700 21px ${CARD_FONT}`; ctx.letterSpacing = '8px'; centerText(CARD_SUBTITLE, 120);
  ctx.letterSpacing = '0px';

  // photo + reg no + SOLD badge
  const px = 90; const py = 150; const pw = 900; const ph = 600;
  drawPhotoBox(ctx, photo, px, py, pw, ph, String(player.name || '?').trim().charAt(0).toUpperCase());
  ctx.textAlign = 'left';
  const reg = `#${player.reg_no}`;
  ctx.font = `800 30px ${CARD_FONT}`;
  const regWidth = ctx.measureText(reg).width + 40;
  ctx.fillStyle = 'rgba(6,10,18,0.80)'; roundRect(ctx, px + 24, py + 24, regWidth, 52, 26); ctx.fill();
  ctx.fillStyle = '#f59e0b'; centerText(reg, py + 60, px + 44);
  ctx.font = `900 30px ${CARD_FONT}`; ctx.letterSpacing = '4px';
  const soldWidth = ctx.measureText('SOLD').width + 44;
  ctx.fillStyle = '#059669'; roundRect(ctx, px + pw - soldWidth - 24, py + 24, soldWidth, 52, 26); ctx.fill();
  ctx.fillStyle = '#ffffff'; centerText('SOLD', py + 60, px + pw - soldWidth - 2);
  ctx.letterSpacing = '0px'; ctx.textAlign = 'center';

  // name (1 line if it fits, else 2 smaller lines)
  const name = String(player.name || '').toUpperCase();
  let nameFit = wrapFit(ctx, name, 900, 80, 52, 900, 1);
  if (!nameFit.fits) nameFit = wrapFit(ctx, name, 900, 46, 30, 900, 2);
  ctx.font = `900 ${nameFit.size}px ${CARD_FONT}`; ctx.fillStyle = '#ffffff';
  if (nameFit.lines.length === 1) centerText(nameFit.lines[0], 842);
  else { centerText(nameFit.lines[0], 800); centerText(nameFit.lines[1], 800 + nameFit.size * 1.08); }

  // category pill + district
  const category = String(player.category || '').toUpperCase();
  if (category && category !== 'N/A') {
    ctx.font = `800 26px ${CARD_FONT}`; ctx.letterSpacing = '3px';
    const catWidth = ctx.measureText(category).width + 56;
    ctx.fillStyle = 'rgba(245,158,11,0.16)'; roundRect(ctx, CX - catWidth / 2, 874, catWidth, 46, 23); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#f59e0b'; roundRect(ctx, CX - catWidth / 2, 874, catWidth, 46, 23); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; centerText(category, 907);
    ctx.letterSpacing = '0px';
  }
  if (player.district && player.district !== 'N/A') { ctx.fillStyle = '#9ca3af'; ctx.font = `600 28px ${CARD_FONT}`; centerText(player.district, 960); }

  // SOLD TO box (logo + team name)
  const boxY = 990;
  ctx.fillStyle = 'rgba(17,24,39,0.88)'; roundRect(ctx, 90, boxY, 360, 212, 28); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#263043'; roundRect(ctx, 90, boxY, 360, 212, 28); ctx.stroke();
  ctx.fillStyle = '#9ca3af'; ctx.font = `700 22px ${CARD_FONT}`; ctx.letterSpacing = '5px'; centerText('SOLD TO', boxY + 40, 270);
  ctx.letterSpacing = '0px';
  const teamLabel = String(player.sold_to || '-');
  ctx.fillStyle = '#34d399';
  if (logo) {
    const lw = 190; const lh = 90; const ls = Math.min(lw / logo.width, lh / logo.height);
    ctx.drawImage(logo, 270 - (logo.width * ls) / 2, boxY + 56 + (lh - logo.height * ls) / 2, logo.width * ls, logo.height * ls);
    const one = wrapFit(ctx, teamLabel, 800, 34, 20, 320, 1);
    ctx.font = `800 ${one.size}px ${CARD_FONT}`; centerText(one.lines[0], boxY + 186, 270);
  } else {
    let fit = wrapFit(ctx, teamLabel, 800, 54, 38, 320, 1);
    if (!fit.fits) fit = wrapFit(ctx, teamLabel, 800, 46, 28, 320, 2);
    if (!fit.fits) fit = wrapFit(ctx, teamLabel, 800, 32, 22, 320, 3);
    ctx.font = `800 ${fit.size}px ${CARD_FONT}`;
    const lineGap = fit.size * 1.12;
    const top = boxY + 60 + (140 - lineGap * fit.lines.length) / 2 + fit.size * 0.85;
    fit.lines.forEach((line, i) => centerText(line, top + i * lineGap, 270));
  }

  // PRICE box + BASE PRICE strip
  ctx.fillStyle = 'rgba(17,24,39,0.88)'; roundRect(ctx, 470, boxY, 520, 148, 28); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#263043'; roundRect(ctx, 470, boxY, 520, 148, 28); ctx.stroke();
  ctx.fillStyle = '#9ca3af'; ctx.font = `700 22px ${CARD_FONT}`; ctx.letterSpacing = '5px'; centerText('PRICE', boxY + 40, 730);
  ctx.letterSpacing = '0px';
  const price = currency(player.sold_price);
  ctx.font = `900 ${fitSingle(ctx, price, 900, 100, 470)}px ${CARD_FONT}`; ctx.fillStyle = '#f59e0b'; centerText(price, boxY + 126, 730);
  ctx.fillStyle = 'rgba(31,41,55,0.9)'; roundRect(ctx, 470, boxY + 160, 520, 52, 26); ctx.fill();
  ctx.fillStyle = '#d1d5db'; ctx.font = `700 24px ${CARD_FONT}`; ctx.letterSpacing = '2px'; centerText(`BASE PRICE: ${currency(player.base_price)}`, boxY + 195, 730);
  ctx.letterSpacing = '0px';

  // style chips
  const chips = [['Bat', player.batting_style], ['Bowl', player.bowling_style], ['Block(Salboni)', player.block]]
    .filter(([, value]) => value && value !== 'N/A' && value !== '--').map(([label, value]) => `${label}: ${value}`);
  ctx.font = `600 26px ${CARD_FONT}`;
  const widths = chips.map((text) => ctx.measureText(text).width + 36);
  let chipX = (W - (widths.reduce((a, b) => a + b, 0) + 14 * Math.max(chips.length - 1, 0))) / 2;
  chips.forEach((text, i) => {
    ctx.fillStyle = '#1f2937'; roundRect(ctx, chipX, 1222, widths[i], 48, 24); ctx.fill();
    ctx.fillStyle = '#d1d5db'; centerText(text, 1255, chipX + widths[i] / 2);
    chipX += widths[i] + 14;
  });

  // footer
  drawFooter(ctx, CX, 1306, W - 160);

  if (showHistory) drawBidHistoryPanel(ctx, W + 16, W, H, player, history);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the card image'))), type, 0.92));
}
