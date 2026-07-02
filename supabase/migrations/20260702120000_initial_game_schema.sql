-- Nexus Game: initial simplified schema
-- Users are managed by Supabase Auth (auth.users)

-- Game levels define progression tiers
create table public.game_levels (
  id serial primary key,
  name text not null,
  prize numeric(10, 2) not null default 0,
  rank integer not null unique check (rank > 0)
);

comment on table public.game_levels is 'Progression tiers with prize and ordering rank';

-- Quiz questions belong to a level
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  value text not null,
  level_id integer not null references public.game_levels (id) on delete restrict,
  points integer not null default 0 check (points >= 0),
  true_answer_id uuid
);

comment on table public.questions is 'Quiz questions with point value and correct answer reference';
comment on column public.questions.true_answer_id is 'References the correct answer row in answers';

-- Multiple-choice (or text) answers for each question
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  value text not null
);

alter table public.questions
  add constraint questions_true_answer_id_fkey
  foreign key (true_answer_id) references public.answers (id) on delete restrict;

create index answers_question_id_idx on public.answers (question_id);

-- A game session owned by an authenticated user
create table public.games (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  total_points integer not null default 0 check (total_points >= 0),
  achieved_level integer not null default 1 references public.game_levels (id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  current_question_id uuid references public.questions (id) on delete set null,
  check (finished_at is null or finished_at >= started_at)
);

comment on table public.games is 'Player game sessions linked to Supabase Auth users';

create index games_owner_idx on public.games (owner);
create index games_current_question_id_idx on public.games (current_question_id);

-- Records each answer a player submits during a game
create table public.user_answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  answer_id uuid not null references public.answers (id) on delete restrict,
  level_id integer not null references public.game_levels (id) on delete restrict,
  points integer not null default 0 check (points >= 0),
  is_true boolean not null default false,
  answered_at timestamptz not null default now(),
  unique (game_id, question_id)
);

comment on table public.user_answers is 'Player responses per game question';

create index user_answers_game_id_idx on public.user_answers (game_id);

create index user_answers_question_id_idx on public.user_answers (question_id);

-- Row Level Security (simplified baseline policies)
alter table public.game_levels enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.games enable row level security;
alter table public.user_answers enable row level security;

create policy "Game levels are readable by everyone"
  on public.game_levels
  for select
  using (true);

create policy "Questions are readable by everyone"
  on public.questions
  for select
  using (true);

create policy "Answers are readable by everyone"
  on public.answers
  for select
  using (true);

create policy "Users can view their own games"
  on public.games
  for select
  using (auth.uid() = owner);

create policy "Users can create their own games"
  on public.games
  for insert
  with check (auth.uid() = owner);

create policy "Users can update their own games"
  on public.games
  for update
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

create policy "Users can view answers for their games"
  on public.user_answers
  for select
  using (
    exists (
      select 1
      from public.games g
      where g.id = user_answers.game_id
        and g.owner = auth.uid()
    )
  );

create policy "Users can submit answers for their games"
  on public.user_answers
  for insert
  with check (
    exists (
      select 1
      from public.games g
      where g.id = user_answers.game_id
        and g.owner = auth.uid()
    )
  );
