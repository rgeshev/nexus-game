import { renderHeader, initHeader, updateHeaderAuth } from './components/header/header.js';
import { renderFooter, initFooter } from './components/footer/footer.js';
import { renderBackgroundFx, initBackgroundFx } from './components/background-fx/background-fx.js';
import { matchRoute, navigate } from './router.js';
import { getSession, onAuthStateChange, signOut, isAuthenticated, checkIsAdmin } from './lib/auth.js';

const PROTECTED_ROUTES = [
  /^\/dashboard\/?$/,
  /^\/games\/?$/,
  /^\/profile\/?$/,
  /^\/admin\/?$/,
  /^\/game\/start\/?$/,
  /^\/game\/[^/]+\/play\/?$/,
];
const GUEST_ONLY_ROUTES = [/^\/login\/?$/];
const ADMIN_ONLY_ROUTES = [/^\/admin\/?$/];

function updateActiveNav(pathname) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const href = link.getAttribute('href');
    const isActive =
      href === pathname ||
      (href !== '/' && pathname.startsWith(href));

    link.classList.toggle('active', isActive);
  });
}

function isProtectedRoute(pathname) {
  return PROTECTED_ROUTES.some((pattern) => pattern.test(pathname));
}

function isGuestOnlyRoute(pathname) {
  return GUEST_ONLY_ROUTES.some((pattern) => pattern.test(pathname));
}

function isAdminOnlyRoute(pathname) {
  return ADMIN_ONLY_ROUTES.some((pattern) => pattern.test(pathname));
}

export async function renderPage(pathname) {
  const session = await getSession();
  const loggedIn = isAuthenticated(session);
  const isAdmin = loggedIn ? await checkIsAdmin() : false;

  updateHeaderAuth(loggedIn, isAdmin);

  if (isProtectedRoute(pathname) && !loggedIn) {
    navigate('/login');
    return;
  }

  if (isGuestOnlyRoute(pathname) && loggedIn) {
    navigate('/dashboard');
    return;
  }

  if (isAdminOnlyRoute(pathname) && !isAdmin) {
    navigate('/dashboard');
    return;
  }

  const contentEl = document.getElementById('page-content');
  const matched = matchRoute(pathname);

  if (!matched) {
    contentEl.innerHTML = `
      <div class="container py-5 text-center">
        <p class="section-eyebrow mb-4"><span class="pulse-dot"></span> SIGNAL LOST</p>
        <h1 class="display-3 fw-bold text-gradient">404</h1>
        <p class="text-muted-nx">This channel does not exist in the grid.</p>
        <a href="/" data-nav class="btn-nx-outline mt-3"><i class="bi bi-house-door"></i> Return Home</a>
      </div>
    `;
    document.title = '404 - Nexus Millions';
    updateActiveNav(pathname);
    return;
  }

  const pageModule = await matched.load();
  contentEl.innerHTML = pageModule.render(matched.params);
  document.title = `${pageModule.meta?.title ?? 'Page'} - Nexus Millions`;

  if (pageModule.init) {
    pageModule.init(matched.params);
  }

  updateActiveNav(pathname);
}

export function initApp() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderBackgroundFx()}
    ${renderHeader()}
    <main id="page-content" class="flex-grow-1"></main>
    ${renderFooter()}
  `;

  initBackgroundFx(app);
  initHeader();
  initFooter();

  document.addEventListener('click', async (event) => {
    const logoutBtn = event.target.closest('[data-logout]');
    if (logoutBtn) {
      event.preventDefault();
      try {
        await signOut();
      } catch (error) {
        console.error('Logout failed:', error.message);
      }
      return;
    }

    const link = event.target.closest('[data-nav]');
    if (!link) return;

    event.preventDefault();
    navigate(link.getAttribute('href'));
  });

  onAuthStateChange(async (_event, session) => {
    const loggedIn = isAuthenticated(session);
    const isAdmin = loggedIn ? await checkIsAdmin() : false;
    updateHeaderAuth(loggedIn, isAdmin);
    renderPage(window.location.pathname);
  });

  window.addEventListener('popstate', () => {
    renderPage(window.location.pathname);
  });

  renderPage(window.location.pathname);
}
