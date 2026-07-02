import template from './dashboard.html?raw';
import './dashboard.css';

export const meta = { title: 'Dashboard' };

export function render() {
  return template;
}

export function init() {
  // Reserved for dashboard behavior.
}
