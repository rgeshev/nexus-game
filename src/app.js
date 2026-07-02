import { renderHeader, initHeader } from './components/header/header.js';
import { renderFooter, initFooter } from './components/footer/footer.js';
import { matchRoute } from './router.js';

function updateActiveNav(pathname) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const href = link.getAttribute('href');
    const isActive =
      href === pathname ||
      (href !== '/' && pathname.startsWith(href));

    link.classList.toggle('active', isActive);
  });
}

export async function renderPage(pathname) {
  const contentEl = document.getElementById('page-content');
  const matched = matchRoute(pathname);

  if (!matched) {
    contentEl.innerHTML = `
      <div class="container py-5">
        <h1 class="display-6">404</h1>
        <p class="text-muted">Page not found.</p>
      </div>
    `;
    document.title = '404 - Nexus Game';
    updateActiveNav(pathname);
    return;
  }

  const pageModule = await matched.load();
  contentEl.innerHTML = pageModule.render(matched.params);
  document.title = `${pageModule.meta?.title ?? 'Page'} - Nexus Game`;

  if (pageModule.init) {
    pageModule.init(matched.params);
  }

  updateActiveNav(pathname);
}

export function initApp() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderHeader()}
    <main id="page-content" class="flex-grow-1"></main>
    ${renderFooter()}
  `;

  initHeader();
  initFooter();

  window.addEventListener('popstate', () => {
    renderPage(window.location.pathname);
  });

  renderPage(window.location.pathname);
}
