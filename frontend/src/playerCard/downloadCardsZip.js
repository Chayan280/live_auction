// Admin: builds one ZIP with a card for every sold player (JPEG, to keep the file small).
//   - main folder:            clean cards
//   - with_bid_history folder: card + bidding history (only for players who have bids)
import { api } from '../api';
import { drawPlayerCard } from './drawPlayerCard';
import { cardFileName, downloadBlob } from './helpers';

export async function downloadCardsZip(soldPlayers, onProgress = () => {}) {
  const { default: JSZip } = await import('jszip');   // loaded only when this button is used
  const allBids = await api('/bids/all');
  const bidsByPlayer = {};
  allBids.forEach((bid) => { (bidsByPlayer[bid.player_id] = bidsByPlayer[bid.player_id] || []).push(bid); });

  const zip = new JSZip();
  const historyFolder = zip.folder('with_bid_history');
  for (let i = 0; i < soldPlayers.length; i += 1) {
    const player = soldPlayers[i];
    const bids = bidsByPlayer[player.id] || [];
    onProgress(i + 1, soldPlayers.length);
    zip.file(cardFileName(player, '', 'jpg'), await drawPlayerCard(player, { type: 'image/jpeg' }));
    if (bids.length) historyFolder.file(cardFileName(player, '_with_history', 'jpg'), await drawPlayerCard(player, { bids, withHistory: true, type: 'image/jpeg' }));
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `Player_Cards_${new Date().toISOString().slice(0, 10)}.zip`);
}
