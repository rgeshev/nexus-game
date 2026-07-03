import template from './game-start.html?raw';
import './game-start.css';
import { createGame } from '../../lib/games.js';
import { navigate } from '../../router.js';

export const meta = { title: 'Starting Game' };

export function render() {
  return template;
}

export async function init() {
  try {
    const gameId = await createGame();
    navigate(`/game/${gameId}/play`);
  } catch (error) {
    const messageEl = document.querySelector('[data-start-message]');
    if (messageEl) {
      messageEl.textContent = error.message ?? 'Could not start a new game.';
      messageEl.classList.add('text-danger');
    }
    document.querySelector('[data-start-back]')?.classList.remove('d-none');
  }
}
