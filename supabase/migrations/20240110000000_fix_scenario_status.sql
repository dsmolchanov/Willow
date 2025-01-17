-- Create the stored procedure for updating scenario status
create or replace function update_scenario_agent_status(
  p_scenario_id int,
  p_status text,
  p_error_details jsonb default null
) returns void as $$
begin
  update scenarios
  set 
    agent_status = p_status,
    updated_at = now()
  where scenario_id = p_scenario_id;
end;
$$ language plpgsql;

-- Create or replace the trigger function
create or replace function handle_new_scenario()
returns trigger as $$
begin
  -- Set initial status to 'pending'
  new.agent_status := 'pending';
  
  -- If agent_id is set, update status to 'completed'
  if new.agent_id is not null then
    new.agent_status := 'completed';
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Drop and recreate the trigger
drop trigger if exists trigger_create_elevenlabs_agent on scenarios;
create trigger trigger_create_elevenlabs_agent
  before insert or update of agent_id on scenarios
  for each row
  execute function handle_new_scenario(); 