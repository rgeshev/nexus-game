import { supabase } from './supabase.js';
import { getSession } from './auth.js';

const LEVEL_COLUMNS = 'id, name, prize, rank';
const QUESTION_COLUMNS =
  'id, value, points, level_id, true_answer_id, answers:answers!answers_question_id_fkey(id, value)';
const GAME_COLUMNS =
  'id, total_points, achieved_level, started_at, finished_at, current_question_id, level:game_levels(id, name, prize, rank)';
const GAME_DETAIL_COLUMNS = `${GAME_COLUMNS}, current_question:questions(${QUESTION_COLUMNS})`;

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

async function pickRandomQuestion(levelId) {
  const client = requireClient();
  const { data, error } = await client.from('questions').select('id').eq('level_id', levelId);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  return data[Math.floor(Math.random() * data.length)].id;
}

async function fetchLastAnswers(gameIds) {
  if (gameIds.length === 0) return {};

  const client = requireClient();
  const { data, error } = await client
    .from('user_answers')
    .select('game_id, is_true, answered_at')
    .in('game_id', gameIds)
    .order('answered_at', { ascending: true });

  if (error) throw error;

  const lastByGame = {};
  (data ?? []).forEach((answer) => {
    lastByGame[answer.game_id] = answer.is_true;
  });
  return lastByGame;
}

export async function getLevels() {
  const client = requireClient();
  const { data, error } = await client
    .from('game_levels')
    .select(LEVEL_COLUMNS)
    .order('rank', { ascending: true });

  if (error) throw error;
  return data;
}

export async function listGames() {
  const client = requireClient();
  const userId = await requireUserId();

  const { data, error } = await client
    .from('games')
    .select(GAME_COLUMNS)
    .eq('owner', userId)
    .order('started_at', { ascending: false });

  if (error) throw error;

  const lastAnswers = await fetchLastAnswers(data.map((game) => game.id));

  return data.map((game) => ({
    ...game,
    lastAnswerCorrect: lastAnswers[game.id] ?? null,
  }));
}

export async function getGame(gameId) {
  const client = requireClient();

  const { data, error } = await client
    .from('games')
    .select(GAME_DETAIL_COLUMNS)
    .eq('id', gameId)
    .single();

  if (error) throw error;

  const lastAnswers = await fetchLastAnswers([gameId]);

  return { ...data, lastAnswerCorrect: lastAnswers[gameId] ?? null };
}

export async function createGame() {
  const levels = await getLevels();
  const firstLevel = levels[0];
  if (!firstLevel) {
    throw new Error('No game levels are configured yet.');
  }

  const questionId = await pickRandomQuestion(firstLevel.id);
  if (!questionId) {
    throw new Error('No questions are available to start a game.');
  }

  const client = requireClient();
  const userId = await requireUserId();

  const { data, error } = await client
    .from('games')
    .insert({
      owner: userId,
      achieved_level: firstLevel.id,
      current_question_id: questionId,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteGame(gameId) {
  const client = requireClient();
  const { error } = await client.from('games').delete().eq('id', gameId);
  if (error) throw error;
}

export async function submitAnswer(game, answerId) {
  const client = requireClient();
  const question = game.current_question;
  if (!question) {
    throw new Error('This game has no active question.');
  }

  const isCorrect = answerId === question.true_answer_id;

  const { error: insertError } = await client.from('user_answers').insert({
    game_id: game.id,
    question_id: question.id,
    answer_id: answerId,
    level_id: question.level_id,
    points: isCorrect ? question.points : 0,
    is_true: isCorrect,
  });

  if (insertError) throw insertError;

  if (!isCorrect) {
    const { error } = await client
      .from('games')
      .update({ current_question_id: null, finished_at: new Date().toISOString() })
      .eq('id', game.id);

    if (error) throw error;
    return { correct: false, finished: true, wonTop: false };
  }

  const levels = await getLevels();
  const currentLevel = levels.find((level) => level.id === question.level_id);
  const nextLevel = levels.find((level) => level.rank === (currentLevel?.rank ?? 0) + 1);
  const newTotalPoints = (game.total_points ?? 0) + question.points;

  if (!nextLevel) {
    const { error } = await client
      .from('games')
      .update({
        total_points: newTotalPoints,
        current_question_id: null,
        finished_at: new Date().toISOString(),
      })
      .eq('id', game.id);

    if (error) throw error;
    return { correct: true, finished: true, wonTop: true };
  }

  const nextQuestionId = await pickRandomQuestion(nextLevel.id);

  const { error } = await client
    .from('games')
    .update({
      total_points: newTotalPoints,
      achieved_level: nextLevel.id,
      current_question_id: nextQuestionId,
    })
    .eq('id', game.id);

  if (error) throw error;
  return { correct: true, finished: !nextQuestionId, wonTop: false };
}

export async function cashOutGame(game) {
  const client = requireClient();
  const { error } = await client
    .from('games')
    .update({ current_question_id: null, finished_at: new Date().toISOString() })
    .eq('id', game.id);

  if (error) throw error;
}
