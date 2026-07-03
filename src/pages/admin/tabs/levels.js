import {
  listLevels,
  createLevel,
  updateLevel,
  deleteLevel,
} from '../../../lib/admin.js';
import {
  showAdminAlert,
  hideAdminAlerts,
  escapeHtml,
  confirmDelete,
  openFormModal,
  setTabLoading,
} from './shared.js';

function levelFormHtml(level = null) {
  return `
    <form>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Rank</label>
        <input type="number" name="rank" class="form-control nx-input" min="1" value="${level?.rank ?? ''}" required />
      </div>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Name</label>
        <input type="text" name="name" class="form-control nx-input" value="${escapeHtml(level?.name ?? '')}" required />
      </div>
      <div class="mb-4">
        <label class="nx-form-label mb-2">Prize ($)</label>
        <input type="number" name="prize" class="form-control nx-input" min="0" step="0.01" value="${level?.prize ?? ''}" required />
      </div>
      <button type="submit" class="btn-cta w-100 justify-content-center" data-admin-form-submit>
        <i class="bi bi-check2"></i> Save
      </button>
    </form>
  `;
}

function renderTable(levels) {
  const rows = levels
    .map(
      (level) => `
      <tr>
        <td>${level.rank}</td>
        <td>${escapeHtml(level.name)}</td>
        <td>$${Number(level.prize).toLocaleString()}</td>
        <td>
          <div class="admin-actions">
            <button type="button" class="admin-action-btn" data-edit-id="${level.id}" title="Edit"><i class="bi bi-pencil-fill"></i></button>
            <button type="button" class="admin-action-btn danger" data-delete-id="${level.id}" title="Delete"><i class="bi bi-trash3-fill"></i></button>
          </div>
        </td>
      </tr>
    `,
    )
    .join('');

  return `
    <div class="admin-toolbar">
      <button type="button" class="btn-cta btn-cta-sm" data-add><i class="bi bi-plus-lg"></i> Add Level</button>
    </div>
    <div class="table-responsive">
      <table class="table table-dark table-borderless align-middle mb-0 nx-table">
        <thead><tr><th>Rank</th><th>Name</th><th>Prize</th><th class="text-end">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export async function renderLevelsTab(container) {
  setTabLoading(true);
  hideAdminAlerts();

  try {
    const levels = await listLevels();
    container.innerHTML = levels.length
      ? renderTable(levels)
      : `<p class="text-muted-nx text-center py-4">No levels yet.</p>
         <div class="text-center"><button type="button" class="btn-cta btn-cta-sm" data-add><i class="bi bi-plus-lg"></i> Add Level</button></div>`;

    container.querySelector('[data-add]')?.addEventListener('click', () => {
      openFormModal('Add Level', levelFormHtml(), async (formData) => {
        await createLevel({
          name: formData.get('name'),
          prize: formData.get('prize'),
          rank: formData.get('rank'),
        });
        showAdminAlert('Level created.', 'success');
        renderLevelsTab(container);
      });
    });

    container.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const level = levels.find((l) => l.id === Number(btn.dataset.editId));
        openFormModal('Edit Level', levelFormHtml(level), async (formData) => {
          await updateLevel(level.id, {
            name: formData.get('name'),
            prize: formData.get('prize'),
            rank: formData.get('rank'),
          });
          showAdminAlert('Level updated.', 'success');
          renderLevelsTab(container);
        });
      });
    });

    container.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.deleteId);
        confirmDelete(async () => {
          await deleteLevel(id);
          showAdminAlert('Level deleted.', 'success');
          renderLevelsTab(container);
        });
      });
    });
  } catch (error) {
    showAdminAlert(error.message ?? 'Failed to load levels.');
    container.innerHTML = '';
  } finally {
    setTabLoading(false);
  }
}
