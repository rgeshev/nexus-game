import { supabase } from './supabase.js';
import { getSession } from './auth.js';

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 500 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

async function requireUserId() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('You must be logged in to do this.');
  }
  return userId;
}

export async function getProfile() {
  const client = requireClient();
  const userId = await requireUserId();

  const { data, error } = await client
    .from('profiles')
    .select('id, nickname, avatar_url, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  const { data: created, error: insertError } = await client
    .from('profiles')
    .insert({ id: userId })
    .select('id, nickname, avatar_url, updated_at')
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function updateNickname(nickname) {
  const client = requireClient();
  const userId = await requireUserId();

  const trimmed = nickname.trim();
  if (trimmed.length < 2) {
    throw new Error('Nickname must be at least 2 characters.');
  }
  if (trimmed.length > 50) {
    throw new Error('Nickname must be 50 characters or fewer.');
  }

  const { data, error } = await client
    .from('profiles')
    .upsert({ id: userId, nickname: trimmed, updated_at: new Date().toISOString() })
    .select('id, nickname, avatar_url, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export function validateAvatarFile(file) {
  if (!file) {
    throw new Error('Please choose an image file.');
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, GIF, or WebP images are allowed.');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Avatar must be 500 KB or smaller.');
  }
}

function getExtension(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimeType] ?? 'jpg';
}

export async function uploadAvatar(file) {
  validateAvatarFile(file);

  const client = requireClient();
  const userId = await requireUserId();
  const ext = getExtension(file.type);
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: urlData } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { data, error } = await client
    .from('profiles')
    .upsert({ id: userId, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .select('id, nickname, avatar_url, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function removeAvatar() {
  const client = requireClient();
  const userId = await requireUserId();

  const { data: files } = await client.storage.from(AVATAR_BUCKET).list(userId);
  if (files?.length) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    await client.storage.from(AVATAR_BUCKET).remove(paths);
  }

  const { data, error } = await client
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id, nickname, avatar_url, updated_at')
    .single();

  if (error) throw error;
  return data;
}
