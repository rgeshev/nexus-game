import {
  listQuestions,
  listLevels,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listAnswers,
  setQuestionTrueAnswer,
  createAnswer,
  updateAnswer,
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

async function questionFormHtml(question = null) {
  const levels = await listLevels();
  const levelOptions = levels
    .map(
      (l) =>
        `<option value="${l.id}" ${question?.level_id === l.id ? 'selected' : ''}>${escapeHtml(l.name)}</option>`,
    )
    .join('');

  let answerFields = '';
  let existingAnswers = [];

  if (question?.id) {
    existingAnswers = await listAnswers(question.id);
  }

  const labels = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < 4; i += 1) {
    const ans = existingAnswers[i];
    answerFields += `
      <div class="mb-2">
        <label class="nx-form-label mb-1">Answer ${labels[i]}</label>
        <input type="text" name="answer_${i}" class="form-control nx-input" value="${escapeHtml(ans?.value ?? '')}" ${question ? '' : 'required'} />
        ${ans ? `<input type="hidden" name="answer_id_${i}" value="${ans.id}" />` : ''}
      </div>
    `;
  }

  const correctIndex = existingAnswers.findIndex((a) => a.id === question?.true_answer_id);

  return `
    <form>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Level</label>
        <select name="level_id" class="form-control nx-input" required>${levelOptions}</select>
      </div>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Question</label>
        <textarea name="value" class="form-control nx-input" rows="3" required>${escapeHtml(question?.value ?? '')}</textarea>
      </div>
      <div class="mb-3">
        <label class="nx-form-label mb-2">Points</label>
        <input type="number" name="points" class="form-control nx-input" min="0" value="${question?.points ?? 10}" required />
      </div>
      <p class="nx-form-label mb-2">Answers</p>
      ${answerFields}
      <div class="mb-4">
        <label class="nx-form-label mb-2">Correct answer</label>
        <select name="correct_index" class="form-control nx-input" required>
          ${labels.map((l, i) => `<option value="${i}" ${correctIndex === i ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn-cta w-100 justify-content-center" data-admin-form-submit>
        <i class="bi bi-check2"></i> Save
      </button>
    </form>
  `;
}

async function saveQuestionWithAnswers(formData, question = null) {
  const payload = {
    value: formData.get('value'),
    level_id: formData.get('level_id'),
    points: formData.get('points'),
  };

  const correctIndex = Number(formData.get('correct_index'));
  let questionId = question?.id;

  if (questionId) {
    await updateQuestion(questionId, payload);
  } else {
    const created = await createQuestion(payload);
    questionId = created.id;
  }

  const answerIds = [];
  for (let i = 0; i < 4; i += 1) {
    const value = formData.get(`answer_${i}`);
    const existingId = formData.get(`answer_id_${i}`);
    if (!value) continue;

    if (existingId) {
      const updated = await updateAnswer(existingId, { value });
      answerIds.push(updated.id);
    } else {
      const created = await createAnswer({ question_id: questionId, value });
      answerIds.push(created.id);
    }
  }

  if (answerIds[correctIndex]) {
    await setQuestionTrueAnswer(questionId, answerIds[correctIndex]);
  }
}

export async function renderQuestionsTab(container) {
  setTabLoading(true);
  hideAdminAlerts();

  try {
    const questions = await listQuestions();

    const rows = questions
      .map((q) => {
        const levelName = q.level?.name ?? '—';
        const correct = q.true_answer?.value ?? '—';
        return `
          <tr>
            <td>${escapeHtml(levelName)}</td>
            <td>${escapeHtml(truncate(q.value, 50))}</td>
            <td>${q.points}</td>
            <td>${escapeHtml(truncate(correct, 30))}</td>
            <td>
              <div class="admin-actions">
                <button type="button" class="admin-action-btn" data-edit-id="${q.id}" title="Edit"><i class="bi bi-pencil-fill"></i></button>
                <button type="button" class="admin-action-btn danger" data-delete-id="${q.id}" title="Delete"><i class="bi bi-trash3-fill"></i></button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="admin-toolbar">
        <button type="button" class="btn-cta btn-cta-sm" data-add><i class="bi bi-plus-lg"></i> Add Question</button>
      </div>
      <div class="table-responsive">
        <table class="table table-dark table-borderless align-middle mb-0 nx-table">
          <thead><tr><th>Level</th><th>Question</th><th>Points</th><th>Correct</th><th class="text-end">Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="text-muted-nx text-center py-4">No questions.</td></tr>'}</tbody>
        </table>
      </div>
    `;

    container.querySelector('[data-add]')?.addEventListener('click', async () => {
      openFormModal('Add Question', await questionFormHtml(), async (formData) => {
        await saveQuestionWithAnswers(formData);
        showAdminAlert('Question created.', 'success');
        renderQuestionsTab(container);
      });
    });

    container.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const question = questions.find((q) => q.id === btn.dataset.editId);
        openFormModal('Edit Question', await questionFormHtml(question), async (formData) => {
          await saveQuestionWithAnswers(formData, question);
          showAdminAlert('Question updated.', 'success');
          renderQuestionsTab(container);
        });
      });
    });

    container.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteId;
        confirmDelete(async () => {
          await deleteQuestion(id);
          showAdminAlert('Question deleted.', 'success');
          renderQuestionsTab(container);
        });
      });
    });
  } catch (error) {
    showAdminAlert(error.message ?? 'Failed to load questions.');
    container.innerHTML = '';
  } finally {
    setTabLoading(false);
  }
}
