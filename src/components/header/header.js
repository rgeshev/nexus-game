import template from './header.html?raw';
import './header.css';

export function renderHeader() {
  return template;
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
