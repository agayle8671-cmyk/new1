-- Create AI conversation memory table
-- Stores summaries and key insights from AI conversations for each user

create table if not exists ai_conversation_memory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  analysis_type text check (analysis_type in ('runway', 'fundraising', 'growth', 'risk', 'breakeven')),
  summary text not null,
  key_insights jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster user lookups
create index if not exists idx_ai_conversation_memory_user_id 
  on ai_conversation_memory(user_id);

-- Create index for faster date-based queries
create index if not exists idx_ai_conversation_memory_created_at 
  on ai_conversation_memory(created_at desc);

-- Create index for analysis type queries
create index if not exists idx_ai_conversation_memory_analysis_type 
  on ai_conversation_memory(analysis_type);

-- Enable Row Level Security
alter table ai_conversation_memory enable row level security;

-- Policy: Users can only see their own conversation memories
create policy "Users can view own conversation memories"
  on ai_conversation_memory
  for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own conversation memories
create policy "Users can insert own conversation memories"
  on ai_conversation_memory
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own conversation memories
create policy "Users can update own conversation memories"
  on ai_conversation_memory
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can delete their own conversation memories
create policy "Users can delete own conversation memories"
  on ai_conversation_memory
  for delete
  using (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
create or replace function update_ai_conversation_memory_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_ai_conversation_memory_updated_at
  before update on ai_conversation_memory
  for each row
  execute function update_ai_conversation_memory_updated_at();

