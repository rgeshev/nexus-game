import template from './games.html?raw';
import './games.css';
import { listGames, deleteGame } from '../../lib/games.js';
import { formatCurrency, formatDate, formatDuration } from '../../lib/format.js';

export const meta = { title: 'My Games' };

let pendingDeleteId = null;
let modalInstance = null;

export function render() {
  return template;
}

function getStatus(game) {
  if (!game.finished_at) {
    return { label: 'In Progress', className: 'badge-status-progress' };
  }
  if (game.lastAnswerCorrect === false) {
    return { label: 'Eliminated', className: 'badge-status-loss' };
  }
  return { label: 'Cashed Out', className: 'badge-status-win' };
}

function renderRow(game) {
  const status = getStatus(game);
  const levelName = game.level?.name ?? '—';
  const prize = formatCurrency(game.level?.prize ?? 0);
  const duration = formatDuration(game.started_at, game.finished_at);
  const date = formatDate(game.started_at);
  const isFinished = Boolean(game.finished_at);
  const primaryLabel = isFinished ? 'View' : 'Play';
  const primaryIcon = isFinished ? 'bi-eye-fill' : 'bi-play-fill';

  return `
    <tr>
      <td>${date}</td>
      <td>${levelName}</td>
      <td>${prize}</td>
      <td>${duration}</td>
      <td><span class="badge-status ${status.className}">${status.label}</span></td>
      <td>
        <div class="game-actions">
          <a href="/game/${game.id}/play" data-nav class="game-action-btn" title="${primaryLabel}">
            <i class="bi ${primaryIcon}"></i>
          </a>
          <button
            type="button"
            class="game-action-btn danger"
            title="Delete"
            data-delete-trigger
            data-game-id="${game.id}"
          >
            <i class="bi bi-trash3-fill"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function showState(state) {
  document.querySelector('[data-games-loading]')?.classList.toggle('d-none', state !== 'loading');
  document.querySelector('[data-games-empty]')?.classList.toggle('d-none', state !== 'empty');
  document.querySelector('[data-games-error]')?.classList.toggle('d-none', state !== 'error');
  document.querySelector('[data-games-table-wrap]')?.classList.toggle('d-none', state !== 'ready');
}

async function refreshGames() {
  showState('loading');

  try {
    const games = await listGames();

    if (games.length === 0) {
      showState('empty');
      return;
    }

    const rowsEl = document.querySelector('[data-games-rows]');
    if (rowsEl) rowsEl.innerHTML = games.map(renderRow).join('');
    showState('ready');
  } catch (error) {
    const errorEl = document.querySelector('[data-games-error]');
    if (errorEl) errorEl.textContent = error.message ?? 'Failed to load games.';
    showState('error');
  }
}

export function init() {
  pendingDeleteId = null;

  const modalEl = document.getElementById('deleteGameModal');
  modalInstance = window.bootstrap && modalEl ? new window.bootstrap.Modal(modalEl) : null;

  refreshGames();

  document.querySelector('[data-games-rows]')?.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-delete-trigger]');
    if (!trigger) return;

    pendingDeleteId = trigger.dataset.gameId;
    modalInstance?.show();
  });

  document.querySelector('[data-confirm-delete]')?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;

    const idToDelete = pendingDeleteId;
    pendingDeleteId = null;

    try {
      await deleteGame(idToDelete);
      modalInstance?.hide();
      refreshGames();
    } catch (error) {
      console.error('Failed to delete game:', error.message);
    }
  });
}
