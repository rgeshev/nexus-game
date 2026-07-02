import template from './home.html?raw';
import './home.css';

export const meta = { title: 'Home' };

export function render() {
  return template;
}

export function init() {
  // Reserved for home page behavior.
}
