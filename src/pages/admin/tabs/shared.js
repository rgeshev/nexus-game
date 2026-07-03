export function showAdminAlert(message, type = 'danger') {
  const alertEl = document.querySelector('[data-admin-alert]');
  const successEl = document.querySelector('[data-admin-success]');
  if (!alertEl || !successEl) return;

  alertEl.classList.add('d-none');
  successEl.classList.add('d-none');

  if (type === 'success') {
    successEl.textContent = message;
    successEl.classList.remove('d-none');
  } else {
    alertEl.textContent = message;
    alertEl.classList.remove('d-none');
  }
}

export function hideAdminAlerts() {
  document.querySelector('[data-admin-alert]')?.classList.add('d-none');
  document.querySelector('[data-admin-success]')?.classList.add('d-none');
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

export function truncate(text, max = 60) {
  const s = text ?? '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

let deleteCallback = null;
let deleteModal = null;
let formModal = null;

export function initAdminModals() {
  const deleteEl = document.getElementById('adminDeleteModal');
  const formEl = document.getElementById('adminFormModal');

  if (deleteEl && window.bootstrap) {
    deleteModal = new window.bootstrap.Modal(deleteEl);
    document.querySelector('[data-admin-confirm-delete]')?.addEventListener('click', async () => {
      if (deleteCallback) await deleteCallback();
      deleteCallback = null;
      deleteModal?.hide();
    });
  }

  if (formEl && window.bootstrap) {
    formModal = new window.bootstrap.Modal(formEl);
  }
}

export function confirmDelete(onConfirm) {
  deleteCallback = onConfirm;
  deleteModal?.show();
}

export function openFormModal(title, bodyHtml, onSubmit) {
  const titleEl = document.querySelector('[data-admin-form-title]');
  const bodyEl = document.querySelector('[data-admin-form-body]');

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;

  const form = bodyEl?.querySelector('form');
  if (!form) {
    formModal?.show();
    return;
  }

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await onSubmit(new FormData(form));
        formModal?.hide();
      } catch (error) {
        showAdminAlert(error.message ?? 'Save failed.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    },
    { once: true },
  );

  formModal?.show();
}

export function setTabLoading(loading) {
  document.querySelector('[data-admin-tab-loading]')?.classList.toggle('d-none', !loading);
  document.querySelector('[data-admin-tab-content]')?.classList.toggle('d-none', loading);
}
