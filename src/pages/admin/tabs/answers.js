import {
  listAnswers,
  listQuestions,
  createAnswer,
  updateAnswer,
  deleteAnswer,
} from '../../../lib/admin.js';
import {
  showAdminAlert,
  hideAdminAlerts,
  escapeHtml,
  truncate,
  confirmDelete,
  openFormModal,
  setTabLoading,
} from './shared.js';

async function answerFormHtml(answer = null) {
  const questions = await listQuestions();
  const options = questions
    .map(
      (q) =>
        `<option value="${q.id}" ${answer?.question_id === q.id ? 'selected' : ''}>${escapeHtml(truncate(q.value, 40))}</option>`,
    )
    .join('');

  return `
    <form>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Question</label>
        <select name="question_id" class="form-control nx-input" required ${answer ? 'disabled' : ''}>
          ${options}
        </select>
        ${answer ? `<input type="hidden" name="question_id" value="${answer.question_id}" />` : ''}
      </div>
      <div class="mb-4">
        <label class="nx-form-label mb-2">Answer value</label>
        <input type="text" name="value" class="form-control nx-input" value="${escapeHtml(answer?.value ?? '')}" required />
      </div>
      <button type="submit" class="btn-cta w-100 justify-content-center" data-admin-form-submit>
        <i class="bi bi-check2"></i> Save
      </button>
    </form>
  `;
}

export async function renderAnswersTab(container) {
  setTabLoading(true);
  hideAdminAlerts();

  try {
    const answers = await listAnswers();

    const rows = answers
      .map(
        (a) => `
        <tr>
          <td>${escapeHtml(truncate(a.question?.value ?? '—', 50))}</td>
          <td>${escapeHtml(a.value)}</td>
          <td>
            <div class="admin-actions">
              <button type="button" class="admin-action-btn" data-edit-id="${a.id}" title="Edit"><i class="bi bi-pencil-fill"></i></button>
              <button type="button" class="admin-action-btn danger" data-delete-id="${a.id}" title="Delete"><i class="bi bi-trash3-fill"></i></button>
            </div>
          </td>
        </tr>
      `,
      )
      .join('');

    container.innerHTML = `
      <div class="admin-toolbar">
        <button type="button" class="btn-cta btn-cta-sm" data-add><i class="bi bi-plus-lg"></i> Add Answer</button>
      </div>
      <div class="table-responsive">
        <table class="table table-dark table-borderless align-middle mb-0 nx-table">
          <thead><tr><th>Question</th><th>Answer</th><th class="text-end">Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3" class="text-muted-nx text-center py-4">No answers.</td></tr>'}</tbody>
        </table>
      </div>
    `;

    container.querySelector('[data-add]')?.addEventListener('click', async () => {
      openFormModal('Add Answer', await answerFormHtml(), async (formData) => {
        await createAnswer({
          question_id: formData.get('question_id'),
          value: formData.get('value'),
        });
        showAdminAlert('Answer created.', 'success');
        renderAnswersTab(container);
      });
    });

    container.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const answer = answers.find((a) => a.id === btn.dataset.editId);
        openFormModal('Edit Answer', await answerFormHtml(answer), async (formData) => {
          await updateAnswer(answer.id, { value: formData.get('value') });
          showAdminAlert('Answer updated.', 'success');
          renderAnswersTab(container);
        });
      });
    });

    container.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteId;
        confirmDelete(async () => {
          await deleteAnswer(id);
          showAdminAlert('Answer deleted.', 'success');
          renderAnswersTab(container);
        });
      });
    });
  } catch (error) {
    showAdminAlert(error.message ?? 'Failed to load answers.');
    container.innerHTML = '';
  } finally {
    setTabLoading(false);
  }
}
