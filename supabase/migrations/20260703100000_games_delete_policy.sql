-- Allow players to delete their own game runs from the archive.

create policy "Users can delete their own games"
  on public.games
  for delete
  using (auth.uid() = owner);
