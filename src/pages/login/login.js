import template from './login.html?raw';
import './login.css';
import { signIn, signUp } from '../../lib/auth.js';
import { navigate } from '../../router.js';

export const meta = { title: 'Login' };

const SUBTITLES = {
  login: 'Authenticate to enter the grid',
  register: 'Create your operator credentials',
};

export function render() {
  return template;
}

function setActiveTab(mode) {
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    const isActive = tab.dataset.authTab === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('[data-auth-form]').forEach((form) => {
    form.classList.toggle('d-none', form.dataset.authForm !== mode);
  });

  const subtitle = document.querySelector('[data-auth-subtitle]');
  if (subtitle) subtitle.textContent = SUBTITLES[mode];

  hideAlert();
}

function showAlert(message, type = 'danger') {
  const alert = document.querySelector('[data-auth-alert]');
  if (!alert) return;

  alert.textContent = message;
  alert.className = `auth-alert alert alert-${type}`;
  alert.classList.remove('d-none');
}

function hideAlert() {
  const alert = document.querySelector('[data-auth-alert]');
  if (!alert) return;

  alert.textContent = '';
  alert.classList.add('d-none');
}

function setSubmitting(form, isSubmitting) {
  const button = form.querySelector('[data-auth-submit]');
  if (button) button.disabled = isSubmitting;
}

async function handleLogin(event) {
  event.preventDefault();
  hideAlert();

  const form = event.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    showAlert('Email and password are required.');
    return;
  }

  setSubmitting(form, true);

  try {
    await signIn(email, password);
    navigate('/dashboard');
  } catch (error) {
    showAlert(error.message ?? 'Login failed. Check your credentials and try again.');
  } finally {
    setSubmitting(form, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  hideAlert();

  const form = event.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value;
  const passwordConfirm = form.passwordConfirm.value;

  if (!email || !password) {
    showAlert('Email and password are required.');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters.');
    return;
  }

  if (password !== passwordConfirm) {
    showAlert('Passwords do not match.');
    return;
  }

  setSubmitting(form, true);

  try {
    const { session, user } = await signUp(email, password);

    if (session) {
      navigate('/dashboard');
      return;
    }

    if (user && !session) {
      showAlert(
        'Account created. Check your email to confirm your address, then log in.',
        'success',
      );
      setActiveTab('login');
      form.reset();
      return;
    }

    navigate('/dashboard');
  } catch (error) {
    showAlert(error.message ?? 'Registration failed. Please try again.');
  } finally {
    setSubmitting(form, false);
  }
}

export function init() {
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.authTab));
  });

  document.querySelector('[data-auth-form="login"]')?.addEventListener('submit', handleLogin);
  document.querySelector('[data-auth-form="register"]')?.addEventListener('submit', handleRegister);
}
