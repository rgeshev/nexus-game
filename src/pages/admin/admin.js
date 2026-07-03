import template from './admin.html?raw';
import './admin.css';
import { initAdminModals } from './tabs/shared.js';
import { renderLevelsTab } from './tabs/levels.js';
import { renderUsersTab } from './tabs/users.js';
import { renderQuestionsTab } from './tabs/questions.js';
import { renderAnswersTab } from './tabs/answers.js';
import { renderGamesTab } from './tabs/games.js';

export const meta = { title: 'Admin' };

const TAB_RENDERERS = {
  levels: renderLevelsTab,
  users: renderUsersTab,
  questions: renderQuestionsTab,
  answers: renderAnswersTab,
  games: renderGamesTab,
};

let activeTab = 'levels';

export function render() {
  return template;
}

function setActiveTab(tab) {
  activeTab = tab;

  document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    const isActive = btn.dataset.adminTab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  const container = document.querySelector('[data-admin-tab-content]');
  if (!container) return;

  const renderer = TAB_RENDERERS[tab];
  if (renderer) renderer(container);
}

export function init() {
  initAdminModals();

  document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.adminTab));
  });

  setActiveTab('levels');
}
