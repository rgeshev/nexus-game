import {
  listAllGames,
  listLevels,
  updateGame,
  deleteGame,
} from '../../../lib/admin.js';
import {
  showAdminAlert,
  hideAdminAlerts,
  escapeHtml,
  confirmDelete,
  openFormModal,
  setTabLoading,
} from './shared.js';
import { formatCurrency, formatDate, formatDuration } from '../../../lib/format.js';

async function gameFormHtml(game) {
  const levels = await listLevels();
  const levelOptions = levels
    .map(
      (l) =>
        `<option value="${l.id}" ${game.achieved_level === l.id ? 'selected' : ''}>${escapeHtml(l.name)}</option>`,
    )
    .join('');

  const finished = game.finished_at ? new Date(game.finished_at).toISOString().slice(0, 16) : '';

  return `
    <form>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Owner email</label>
        <input type="text" class="form-control nx-input" value="${escapeHtml(game.owner_email ?? '')}" disabled />
      </div>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Achieved level</label>
        <select name="achieved_level" class="form-control nx-input" required>${levelOptions}</select>
      </div>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Total points</label>
        <input type="number" name="total_points" class="form-control nx-input" min="0" value="${game.total_points ?? 0}" required />
      </div>
      <div class="mb-4">
        <label class="nx-form-label mb-2">Finished at (leave empty if in progress)</label>
        <input type="datetime-local" name="finished_at" class="form-control nx-input" value="${finished}" />
      </div>
      <button type="submit" class="btn-cta w-100 justify-content-center" data-admin-form-submit>
        <i class="bi bi-check2"></i> Save
      </button>
    </form>
  `;
}

export async function renderGamesTab(container) {
  setTabLoading(true);
  hideAdminAlerts();

  try {
    const games = await listAllGames();

    const rows = games
      .map((game) => {
        const status = game.finished_at ? 'Finished' : 'In Progress';
        const statusClass = game.finished_at ? 'badge-status-win' : 'badge-status-progress';
        return `
          <tr>
            <td>${formatDate(game.started_at)}</td>
            <td>${escapeHtml(game.owner_email ?? '—')}</td>
            <td>${escapeHtml(game.level?.name ?? '—')}</td>
            <td>${formatCurrency(game.level?.prize ?? 0)}</td>
            <td><span class="badge-status ${statusClass}">${status}</span></td>
            <td>${formatDuration(game.started_at, game.finished_at)}</td>
            <td>
              <div class="admin-actions">
                <a href="/game/${game.id}/play" data-nav class="admin-action-btn" title="View"><i class="bi bi-eye-fill"></i></a>
                <button type="button" class="admin-action-btn" data-edit-id="${game.id}" title="Edit"><i class="bi bi-pencil-fill"></i></button>
                <button type="button" class="admin-action-btn danger" data-delete-id="${game.id}" title="Delete"><i class="bi bi-trash3-fill"></i></button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-dark table-borderless align-middle mb-0 nx-table">
          <thead>
            <tr>
              <th>Date</th><th>Owner</th><th>Level</th><th>Prize</th><th>Status</th><th>Duration</th><th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7" class="text-muted-nx text-center py-4">No games.</td></tr>'}</tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const game = games.find((g) => g.id === btn.dataset.editId);
        openFormModal('Edit Game', await gameFormHtml(game), async (formData) => {
          const finishedRaw = formData.get('finished_at');
          await updateGame(game.id, {
            achieved_level: Number(formData.get('achieved_level')),
            total_points: Number(formData.get('total_points')),
            finished_at: finishedRaw ? new Date(finishedRaw).toISOString() : null,
          });
          showAdminAlert('Game updated.', 'success');
          renderGamesTab(container);
        });
      });
    });

    container.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteId;
        confirmDelete(async () => {
          await deleteGame(id);
          showAdminAlert('Game deleted.', 'success');
          renderGamesTab(container);
        });
      });
    });
  } catch (error) {
    showAdminAlert(error.message ?? 'Failed to load games.');
    container.innerHTML = '';
  } finally {
    setTabLoading(false);
  }
}
