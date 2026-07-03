import template from './header.html?raw';
import './header.css';

export function renderHeader() {
  return template;
}

export function updateHeaderAuth(isLoggedIn, isAdmin = false) {
  document.querySelectorAll('[data-auth="guest"]').forEach((el) => {
    el.hidden = isLoggedIn;
  });

  document.querySelectorAll('[data-auth="user"]').forEach((el) => {
    el.hidden = !isLoggedIn;
  });

  document.querySelectorAll('[data-auth="admin"]').forEach((el) => {
    el.hidden = !isAdmin;
  });
}

export function initHeader() {
  const collapseEl = document.getElementById('mainNav');
  if (!collapseEl) return;

  collapseEl.querySelectorAll('[data-nav]').forEach((link) => {
    link.addEventListener('click', () => {
      if (collapseEl.classList.contains('show')) {
        window.bootstrap?.Collapse.getOrCreateInstance(collapseEl).hide();
      }
    });
  });
}
