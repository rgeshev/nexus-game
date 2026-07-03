import {
  listUsers,
  updateUser,
  deleteUser,
} from '../../../lib/admin.js';
import {
  showAdminAlert,
  hideAdminAlerts,
  escapeHtml,
  confirmDelete,
  openFormModal,
  setTabLoading,
} from './shared.js';
import { formatDate } from '../../../lib/format.js';

function userFormHtml(user) {
  return `
    <form>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Email</label>
        <input type="text" class="form-control nx-input" value="${escapeHtml(user.email ?? '')}" disabled />
      </div>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Nickname</label>
        <input type="text" name="nickname" class="form-control nx-input" maxlength="50" value="${escapeHtml(user.nickname ?? '')}" />
      </div>
      <div class="mb-4 form-check">
        <input type="checkbox" name="is_admin" class="form-check-input" id="user-is-admin" ${user.is_admin ? 'checked' : ''} />
        <label class="form-check-label text-muted-nx" for="user-is-admin">Admin role</label>
      </div>
      <button type="submit" class="btn-cta w-100 justify-content-center" data-admin-form-submit>
        <i class="bi bi-check2"></i> Save
      </button>
    </form>
  `;
}

export async function renderUsersTab(container) {
  setTabLoading(true);
  hideAdminAlerts();

  try {
    const users = await listUsers();

    const rows = users
      .map(
        (user) => `
        <tr>
          <td>${escapeHtml(user.email ?? '—')}</td>
          <td>${escapeHtml(user.nickname ?? '—')}</td>
          <td>${user.is_admin ? '<span class="badge-admin">Admin</span>' : '—'}</td>
          <td>${formatDate(user.updated_at)}</td>
          <td>
            <div class="admin-actions">
              <button type="button" class="admin-action-btn" data-edit-id="${user.id}" title="Edit"><i class="bi bi-pencil-fill"></i></button>
              <button type="button" class="admin-action-btn danger" data-delete-id="${user.id}" title="Delete"><i class="bi bi-trash3-fill"></i></button>
            </div>
          </td>
        </tr>
      `,
      )
      .join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-dark table-borderless align-middle mb-0 nx-table">
          <thead><tr><th>Email</th><th>Nickname</th><th>Role</th><th>Updated</th><th class="text-end">Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="text-muted-nx text-center py-4">No users found.</td></tr>'}</tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const user = users.find((u) => u.id === btn.dataset.editId);
        openFormModal('Edit User', userFormHtml(user), async (formData) => {
          await updateUser(user.id, {
            nickname: formData.get('nickname'),
            is_admin: formData.get('is_admin') === 'on',
          });
          showAdminAlert('User updated.', 'success');
          renderUsersTab(container);
        });
      });
    });

    container.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteId;
        confirmDelete(async () => {
          await deleteUser(id);
          showAdminAlert('User deleted.', 'success');
          renderUsersTab(container);
        });
      });
    });
  } catch (error) {
    showAdminAlert(error.message ?? 'Failed to load users.');
    container.innerHTML = '';
  } finally {
    setTabLoading(false);
  }
}
