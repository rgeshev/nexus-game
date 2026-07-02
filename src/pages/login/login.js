import template from './login.html?raw';
import './login.css';

export const meta = { title: 'Login' };

export function render() {
  return template;
}

export function init() {
  // Reserved for login form behavior.
}
