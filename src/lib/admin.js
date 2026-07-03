import { supabase } from './supabase.js';
import { getSession } from './auth.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

// --- Levels ---

export async function listLevels() {
  const { data, error } = await requireClient()
    .from('game_levels')
    .select('id, name, prize, rank')
    .order('rank', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createLevel({ name, prize, rank }) {
  const { data, error } = await requireClient()
    .from('game_levels')
    .insert({ name, prize: Number(prize), rank: Number(rank) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLevel(id, { name, prize, rank }) {
  const { data, error } = await requireClient()
    .from('game_levels')
    .update({ name, prize: Number(prize), rank: Number(rank) })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLevel(id) {
  const { error } = await requireClient().from('game_levels').delete().eq('id', id);
  if (error) throw error;
}

// --- Questions ---

export async function listQuestions() {
  const { data, error } = await requireClient()
    .from('questions')
    .select(
      'id, value, points, level_id, true_answer_id, level:game_levels(name), true_answer:answers!questions_true_answer_id_fkey(value)',
    )
    .order('level_id')
    .order('value');
  if (error) throw error;
  return data;
}

export async function createQuestion({ value, level_id, points }) {
  const { data, error } = await requireClient()
    .from('questions')
    .insert({ value, level_id: Number(level_id), points: Number(points) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuestion(id, { value, level_id, points, true_answer_id }) {
  const payload = { value, level_id: Number(level_id), points: Number(points) };
  if (true_answer_id !== undefined) payload.true_answer_id = true_answer_id || null;

  const { data, error } = await requireClient()
    .from('questions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuestion(id) {
  const { error } = await requireClient().from('questions').delete().eq('id', id);
  if (error) throw error;
}

export async function setQuestionTrueAnswer(questionId, answerId) {
  const { data, error } = await requireClient()
    .from('questions')
    .update({ true_answer_id: answerId })
    .eq('id', questionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Answers ---

export async function listAnswers(questionId = null) {
  let query = requireClient()
    .from('answers')
    .select('id, value, question_id, question:questions(value)')
    .order('question_id');

  if (questionId) query = query.eq('question_id', questionId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createAnswer({ question_id, value }) {
  const { data, error } = await requireClient()
    .from('answers')
    .insert({ question_id, value })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAnswer(id, { value }) {
  const { data, error } = await requireClient()
    .from('answers')
    .update({ value })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAnswer(id) {
  const { error } = await requireClient().from('answers').delete().eq('id', id);
  if (error) throw error;
}

// --- Games ---

export async function listAllGames() {
  const client = requireClient();

  const [{ data: games, error: gamesError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      client
        .from('games')
        .select('id, owner, total_points, achieved_level, started_at, finished_at, level:game_levels(name, prize)')
        .order('started_at', { ascending: false }),
      client.from('profiles').select('id, email'),
    ]);

  if (gamesError) throw gamesError;
  if (profilesError) throw profilesError;

  const emailById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.email]));

  return (games ?? []).map((game) => ({
    ...game,
    owner_email: emailById[game.owner] ?? game.owner,
  }));
}

export async function updateGame(id, fields) {
  const { data, error } = await requireClient()
    .from('games')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGame(id) {
  const { error } = await requireClient().from('games').delete().eq('id', id);
  if (error) throw error;
}

// --- Users ---

export async function listUsers() {
  const { data, error } = await requireClient()
    .from('profiles')
    .select('id, email, nickname, is_admin, avatar_url, updated_at')
    .order('email');
  if (error) throw error;
  return data;
}

export async function updateUser(id, { nickname, is_admin }) {
  const payload = { updated_at: new Date().toISOString() };
  if (nickname !== undefined) payload.nickname = nickname?.trim() || null;
  if (is_admin !== undefined) payload.is_admin = Boolean(is_admin);

  const { data, error } = await requireClient()
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUser(id) {
  const { error } = await requireClient().rpc('admin_delete_user', { target_id: id });
  if (error) throw error;
}
