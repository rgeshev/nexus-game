const routes = [
  {
    pattern: /^\/$/,
    load: () => import('./pages/home/home.js'),
  },
  {
    pattern: /^\/login\/?$/,
    load: () => import('./pages/login/login.js'),
  },
  {
    pattern: /^\/dashboard\/?$/,
    load: () => import('./pages/dashboard/dashboard.js'),
  },
  {
    pattern: /^\/games\/?$/,
    load: () => import('./pages/games/games.js'),
  },
  {
    pattern: /^\/profile\/?$/,
    load: () => import('./pages/profile/profile.js'),
  },
  {
    pattern: /^\/game\/start\/?$/,
    load: () => import('./pages/game-start/game-start.js'),
  },
  {
    pattern: /^\/game\/([^/]+)\/play\/?$/,
    load: () => import('./pages/game/game.js'),
    params: ['id'],
  },
];

export function matchRoute(pathname) {
  for (const route of routes) {
    const match = pathname.match(route.pattern);
    if (!match) continue;

    const params = {};
    if (route.params) {
      route.params.forEach((name, index) => {
        params[name] = match[index + 1];
      });
    }

    return { load: route.load, params };
  }

  return null;
}

export function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
