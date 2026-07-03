import template from './profile.html?raw';
import './profile.css';
import { getProfile, updateNickname, uploadAvatar, removeAvatar, validateAvatarFile } from '../../lib/profile.js';
import { getSession } from '../../lib/auth.js';

export const meta = { title: 'Profile' };

let currentProfile = null;

export function render() {
  return template;
}

function showAlert(message, type = 'danger') {
  const alertEl = document.querySelector('[data-profile-alert]');
  const successEl = document.querySelector('[data-profile-success]');
  if (!alertEl || !successEl) return;

  alertEl.classList.add('d-none');
  successEl.classList.add('d-none');

  if (type === 'success') {
    successEl.textContent = message;
    successEl.classList.remove('d-none');
  } else {
    alertEl.textContent = message;
    alertEl.classList.remove('d-none');
  }
}

function hideAlerts() {
  document.querySelector('[data-profile-alert]')?.classList.add('d-none');
  document.querySelector('[data-profile-success]')?.classList.add('d-none');
}

function renderAvatar(avatarUrl) {
  const img = document.querySelector('[data-avatar-img]');
  const placeholder = document.querySelector('[data-avatar-placeholder]');
  const removeBtn = document.querySelector('[data-remove-avatar]');

  if (avatarUrl) {
    if (img) {
      img.src = avatarUrl;
      img.classList.remove('d-none');
    }
    placeholder?.classList.add('d-none');
    removeBtn?.classList.remove('d-none');
  } else {
    img?.classList.add('d-none');
    placeholder?.classList.remove('d-none');
    removeBtn?.classList.add('d-none');
  }
}

function renderProfile(profile, email) {
  currentProfile = profile;

  const nicknameInput = document.querySelector('#profile-nickname');
  if (nicknameInput) nicknameInput.value = profile.nickname ?? '';

  const emailEl = document.querySelector('[data-profile-email]');
  if (emailEl) emailEl.textContent = email ?? '';

  renderAvatar(profile.avatar_url);
}

async function loadProfile() {
  document.querySelector('[data-profile-loading]')?.classList.remove('d-none');
  document.querySelector('[data-profile-content]')?.classList.add('d-none');

  try {
    const [profile, session] = await Promise.all([getProfile(), getSession()]);
    renderProfile(profile, session?.user?.email);

    document.querySelector('[data-profile-loading]')?.classList.add('d-none');
    document.querySelector('[data-profile-content]')?.classList.remove('d-none');
  } catch (error) {
    showAlert(error.message ?? 'Failed to load profile.');
    document.querySelector('[data-profile-loading]')?.classList.add('d-none');
    document.querySelector('[data-profile-content]')?.classList.remove('d-none');
  }
}

async function handleAvatarChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  hideAlerts();

  try {
    validateAvatarFile(file);
    const profile = await uploadAvatar(file);
    renderProfile(profile, document.querySelector('[data-profile-email]')?.textContent);
    showAlert('Avatar updated successfully.', 'success');
  } catch (error) {
    showAlert(error.message ?? 'Failed to upload avatar.');
  } finally {
    event.target.value = '';
  }
}

async function handleRemoveAvatar() {
  hideAlerts();

  try {
    const profile = await removeAvatar();
    renderProfile(profile, document.querySelector('[data-profile-email]')?.textContent);
    showAlert('Avatar removed.', 'success');
  } catch (error) {
    showAlert(error.message ?? 'Failed to remove avatar.');
  }
}

async function handleNicknameSubmit(event) {
  event.preventDefault();
  hideAlerts();

  const form = event.currentTarget;
  const saveBtn = document.querySelector('[data-save-profile]');

  try {
    if (saveBtn) saveBtn.disabled = true;
    const profile = await updateNickname(form.nickname.value);
    renderProfile(profile, document.querySelector('[data-profile-email]')?.textContent);
    showAlert('Profile saved successfully.', 'success');
  } catch (error) {
    showAlert(error.message ?? 'Failed to save profile.');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

export function init() {
  currentProfile = null;

  loadProfile();

  document.querySelector('#avatar-input')?.addEventListener('change', handleAvatarChange);
  document.querySelector('[data-remove-avatar]')?.addEventListener('click', handleRemoveAvatar);
  document.querySelector('[data-nickname-form]')?.addEventListener('submit', handleNicknameSubmit);
}
