import template from './game.html?raw';
import './game.css';

export const meta = { title: 'Game' };

export function render() {
  return template;
}

export function init({ id } = {}) {
  const idEl = document.querySelector('[data-game-id]');
  if (idEl) {
    idEl.textContent = id ?? '';
  }
}
