import template from './header.html?raw';
import './header.css';
import { navigate } from '../../router.js';

export function renderHeader() {
  return template;
}

export function initHeader() {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}
