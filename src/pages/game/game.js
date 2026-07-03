import template from './game.html?raw';
import './game.css';
import { getGame, getLevels, submitAnswer, cashOutGame } from '../../lib/games.js';
import { formatCurrency, formatDate, formatDuration } from '../../lib/format.js';

export const meta = { title: 'Play Game' };

let currentGame = null;
let answering = false;

export function render() {
  return template;
}

function showLoading(show) {
  document.querySelector('[data-game-loading]')?.classList.toggle('d-none', !show);
}

function showError(message) {
  const errorEl = document.querySelector('[data-game-error]');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.remove('d-none');
}

function showContent(show) {
  document.querySelector('[data-game-content]')?.classList.toggle('d-none', !show);
}

function renderLadder(levels, currentLevelId) {
  return [...levels]
    .sort((a, b) => b.rank - a.rank)
    .map((level) => {
      const classes = ['ladder-rung'];
      if (level.rank === 5) classes.push('ladder-rung-gold');
      if (level.id === currentLevelId) classes.push('ladder-rung-current');

      return `
        <div class="${classes.join(' ')}">
          <span class="ladder-rank">${String(level.rank).padStart(2, '0')}</span>
          <span class="ladder-name">${level.name}</span>
          <span class="ladder-prize">${formatCurrency(level.prize)}</span>
        </div>
      `;
    })
    .join('');
}

function renderQuestion(question, level) {
  const panel = document.querySelector('[data-question-panel]');
  const grid = document.querySelector('[data-answers-grid]');
  if (!panel || !grid) return;

  panel.classList.remove('d-none');
  grid.classList.remove('d-none');

  panel.innerHTML = `
    <span class="question-points">${level?.name ?? ''} · Worth ${formatCurrency(level?.prize ?? 0)}</span>
    <h1 class="h3 question-text mt-3 mb-0">${question.value}</h1>
  `;

  const letters = ['A', 'B', 'C', 'D'];
  grid.innerHTML = question.answers
    .map(
      (answer, index) => `
        <div class="col-md-6">
          <button type="button" class="answer-option" data-answer-id="${answer.id}">
            <span class="answer-letter">${letters[index] ?? index + 1}</span>
            <span class="answer-value">${answer.value}</span>
          </button>
        </div>
      `,
    )
    .join('');
}

function renderResult({ title, description, icon, tone }) {
  const panel = document.querySelector('[data-result-panel]');
  if (!panel) return;

  document.querySelector('[data-question-panel]')?.classList.add('d-none');
  document.querySelector('[data-answers-grid]')?.classList.add('d-none');
  document.querySelector('[data-cash-out]')?.classList.add('d-none');
  document.querySelector('[data-lifelines]')?.classList.add('d-none');

  panel.classList.remove('d-none');
  panel.innerHTML = `
    <div class="text-center">
      <i class="bi ${icon} result-icon result-icon-${tone}"></i>
      <h2 class="h3 mt-3">${title}</h2>
      <p class="text-muted-nx mb-4">${description}</p>
      <div class="d-flex flex-wrap justify-content-center gap-3">
        <a href="/game/start" data-nav class="btn-cta btn-cta-sm"><i class="bi bi-arrow-repeat"></i> Play Again</a>
        <a href="/games" data-nav class="btn-nx-outline"><i class="bi bi-list-ul"></i> My Games</a>
      </div>
    </div>
  `;
}

function describeOutcome(game) {
  const levelName = game.level?.name ?? 'the grid';
  const prize = formatCurrency(game.level?.prize ?? 0);
  const duration = formatDuration(game.started_at, game.finished_at);

  if (game.lastAnswerCorrect === false) {
    return {
      title: 'Signal Terminated',
      description: `Wrong answer at ${levelName}. Run started ${formatDate(game.started_at)} and lasted ${duration}.`,
      icon: 'bi-x-octagon-fill',
      tone: 'loss',
    };
  }

  return {
    title: 'Cashed Out',
    description: `Secured ${prize} at ${levelName}. Run started ${formatDate(game.started_at)} and lasted ${duration}.`,
    icon: 'bi-trophy-fill',
    tone: 'win',
  };
}

async function loadAndRender(gameId) {
  showLoading(true);
  showContent(false);

  try {
    const [game, levels] = await Promise.all([getGame(gameId), getLevels()]);
    currentGame = game;

    const ladderEl = document.querySelector('[data-prize-ladder]');
    if (ladderEl) ladderEl.innerHTML = renderLadder(levels, game.level?.id);

    const statusLabel = document.querySelector('[data-game-status-label]');

    if (game.finished_at) {
      if (statusLabel) statusLabel.textContent = 'Broadcast Ended';
      renderResult(describeOutcome(game));
    } else if (game.current_question) {
      if (statusLabel) statusLabel.textContent = 'On Air';
      document.querySelector('[data-lifelines]')?.classList.remove('d-none');
      document.querySelector('[data-cash-out]')?.classList.remove('d-none');
      document.querySelector('[data-result-panel]')?.classList.add('d-none');
      renderQuestion(game.current_question, game.level);
    } else {
      renderResult({
        title: 'Game Unavailable',
        description: 'This game has no active question and could not be resumed.',
        icon: 'bi-exclamation-triangle-fill',
        tone: 'loss',
      });
    }

    showContent(true);
  } catch (error) {
    showError(error.message ?? 'Failed to load this game.');
  } finally {
    showLoading(false);
  }
}

async function handleAnswerClick(event) {
  const button = event.target.closest('[data-answer-id]');
  if (!button || answering || !currentGame?.current_question) return;

  answering = true;
  const grid = document.querySelector('[data-answers-grid]');
  const answerId = button.dataset.answerId;
  const correctId = currentGame.current_question.true_answer_id;

  grid?.querySelectorAll('[data-answer-id]').forEach((btn) => {
    btn.disabled = true;
  });

  try {
    const result = await submitAnswer(currentGame, answerId);

    button.classList.add(result.correct ? 'answer-correct' : 'answer-wrong');
    if (!result.correct) {
      grid?.querySelector(`[data-answer-id="${correctId}"]`)?.classList.add('answer-correct');
    }

    setTimeout(() => {
      answering = false;
      if (currentGame) loadAndRender(currentGame.id);
    }, 1400);
  } catch (error) {
    showError(error.message ?? 'Failed to submit your answer.');
    answering = false;
  }
}

async function handleCashOut() {
  if (!currentGame || answering) return;

  try {
    await cashOutGame(currentGame);
    loadAndRender(currentGame.id);
  } catch (error) {
    showError(error.message ?? 'Failed to cash out.');
  }
}

export function init({ id } = {}) {
  currentGame = null;
  answering = false;

  document.querySelector('[data-answers-grid]')?.addEventListener('click', handleAnswerClick);
  document.querySelector('[data-cash-out]')?.addEventListener('click', handleCashOut);

  loadAndRender(id);
}
