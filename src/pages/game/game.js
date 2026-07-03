import template from './game.html?raw';
import './game.css';

export const meta = { title: 'Game' };

export function render() {
  return template;
}

export function init({ id } = {}) {
  document.querySelectorAll('[data-game-id]').forEach((el) => {
    el.textContent = id ?? '';
  });

  document.querySelectorAll('.answer-option').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.answer-option').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });
}
