import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { LEVELS, QUESTIONS_BY_LEVEL, pointsForLevel } from './seed-data.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FORCE = process.argv.includes('--force');

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function requireEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Copy .env.example to .env and fill in your Supabase credentials.\n' +
        'Use the service role key (not the anon key) so inserts bypass RLS.',
    );
    process.exit(1);
  }
}

async function clearSeedData(supabase) {
  console.log('Clearing existing seed data...');

  await supabase.from('user_answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('questions').update({ true_answer_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('game_levels').delete().neq('id', 0);
}

async function seedLevels(supabase) {
  const { data, error } = await supabase
    .from('game_levels')
    .insert(
      LEVELS.map((level) => ({
        name: level.name,
        prize: level.prize,
        rank: level.rank,
      })),
    )
    .select('id, rank');

  if (error) throw new Error(`Failed to seed game levels: ${error.message}`);
  return Object.fromEntries(data.map((level) => [level.rank, level.id]));
}

async function seedQuestionWithAnswers(supabase, levelId, levelRank, [value, correct, ...wrong]) {
  const points = pointsForLevel(levelRank);

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .insert({ value, level_id: levelId, points })
    .select('id')
    .single();

  if (questionError) {
    throw new Error(`Failed to seed question "${value}": ${questionError.message}`);
  }

  const answerValues = shuffle([correct, ...wrong.slice(0, 3)]);
  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .insert(
      answerValues.map((answerValue) => ({
        question_id: question.id,
        value: answerValue,
      })),
    )
    .select('id, value');

  if (answersError) {
    throw new Error(`Failed to seed answers for "${value}": ${answersError.message}`);
  }

  const trueAnswer = answers.find((answer) => answer.value === correct);
  if (!trueAnswer) {
    throw new Error(`Could not find correct answer for question "${value}"`);
  }

  const { error: updateError } = await supabase
    .from('questions')
    .update({ true_answer_id: trueAnswer.id })
    .eq('id', question.id);

  if (updateError) {
    throw new Error(`Failed to set true_answer_id for "${value}": ${updateError.message}`);
  }

  return { questionId: question.id, answerCount: answers.length };
}

async function main() {
  requireEnv();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count: existingLevels, error: countError } = await supabase
    .from('game_levels')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw new Error(`Failed to check existing data: ${countError.message}`);
  }

  if (existingLevels > 0 && !FORCE) {
    console.log(
      `Database already has ${existingLevels} game level(s). Skipping seed.\n` +
        'Run with --force to clear and re-seed.',
    );
    return;
  }

  if (existingLevels > 0 && FORCE) {
    await clearSeedData(supabase);
  }

  console.log('Seeding 5 game levels...');
  const levelIdsByRank = await seedLevels(supabase);

  let totalQuestions = 0;
  let totalAnswers = 0;

  for (const level of LEVELS) {
    const levelId = levelIdsByRank[level.rank];
    const questions = QUESTIONS_BY_LEVEL[level.rank];

    if (!questions || questions.length !== 21) {
      throw new Error(`Level ${level.rank} must have exactly 21 questions`);
    }

    console.log(`Seeding level ${level.rank} (${level.name}) — ${questions.length} questions...`);

    for (const questionData of questions) {
      const result = await seedQuestionWithAnswers(supabase, levelId, level.rank, questionData);
      totalQuestions += 1;
      totalAnswers += result.answerCount;
    }
  }

  console.log('\nSeed complete.');
  console.log(`  Game levels : ${LEVELS.length}`);
  console.log(`  Questions   : ${totalQuestions}`);
  console.log(`  Answers     : ${totalAnswers}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
