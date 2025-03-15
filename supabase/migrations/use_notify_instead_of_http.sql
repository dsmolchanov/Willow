-- Alternative approach using Postgres NOTIFY instead of HTTP functions
-- This avoids the need for HTTP functions which may not be available

-- Replace the trigger function with a version that uses NOTIFY
CREATE OR REPLACE FUNCTION trigger_check_conversations()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  start_time TIMESTAMP;
BEGIN
  -- Record start time for execution timing
  start_time := clock_timestamp();

  -- Log the start of the trigger execution
  INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
  VALUES (
    'check_conversations_trigger', 
    TG_TABLE_NAME, 
    TG_OP, 
    NEW.conversation_id, 
    clock_timestamp(),
    jsonb_build_object(
      'debug', 'Trigger started',
      'status', COALESCE(NEW.status, 'unknown'),
      'operation', TG_OP,
      'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
    )
  );

  -- Check if the record has an ElevenLabs conversation ID
  IF NEW.elevenlabs_conversation_id IS NULL OR NEW.elevenlabs_conversation_id = '' THEN
    RAISE LOG 'No ElevenLabs conversation ID found, skipping notification';
    RETURN NEW;
  END IF;

  -- Check if status is already 'processed'
  IF NEW.status = 'processed' THEN
    RAISE LOG 'Conversation % already processed, skipping', NEW.conversation_id;
    RETURN NEW;
  END IF;

  -- Create payload for the notification
  payload := jsonb_build_object(
    'conversation_id', NEW.conversation_id,
    'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id,
    'agent_id', NEW.agent_id,
    'clerk_id', NEW.clerk_id,
    'status', COALESCE(NEW.status, 'unknown'),
    'created_at', EXTRACT(EPOCH FROM NEW.created_at),
    'updated_at', EXTRACT(EPOCH FROM NEW.updated_at),
    'notification_time', EXTRACT(EPOCH FROM clock_timestamp())
  );

  -- Log that we're about to send a notification
  INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
  VALUES (
    'check_conversations_trigger', 
    TG_TABLE_NAME, 
    TG_OP, 
    NEW.conversation_id, 
    clock_timestamp(),
    jsonb_build_object(
      'debug', 'Sending notification',
      'channel', 'conversation_processing',
      'payload', payload,
      'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    )
  );

  -- Send a notification with the conversation ID and other details
  -- External systems can listen for this notification
  PERFORM pg_notify(
    'conversation_processing',  -- channel name
    payload::text               -- payload as JSON string
  );

  -- Log successful notification
  INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
  VALUES (
    'check_conversations_trigger_notification', 
    TG_TABLE_NAME, 
    TG_OP, 
    NEW.conversation_id, 
    clock_timestamp(),
    jsonb_build_object(
      'success', true,
      'notification', 'conversation_processing',
      'conversation_id', NEW.conversation_id,
      'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id,
      'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    )
  );
  
  -- Always return NEW to ensure the record operation completes
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any exceptions that occur
  INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
  VALUES (
    'check_conversations_trigger_error', 
    TG_TABLE_NAME, 
    TG_OP, 
    NEW.conversation_id, 
    clock_timestamp(),
    jsonb_build_object(
      'error', 'Notification failed',
      'message', SQLERRM,
      'sqlstate', SQLSTATE,
      'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    )
  );
  
  -- Always return NEW even if there was an error
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_conversations_trigger ON user_conversations;

-- Recreate the trigger
CREATE TRIGGER check_conversations_trigger
AFTER INSERT OR UPDATE ON user_conversations
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM 'processed')
EXECUTE FUNCTION trigger_check_conversations();

-- Create documentation on how to use the notification approach
COMMENT ON FUNCTION trigger_check_conversations() IS 
'This function uses the Postgres NOTIFY mechanism to signal that a conversation needs processing.
An external process should LISTEN on the "conversation_processing" channel to receive these notifications.
Each notification includes a JSON payload with conversation details.

Sample code to listen for notifications:
```
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create a dedicated client for listening
const client = await pool.connect();

// Listen for notifications
await client.query("LISTEN conversation_processing");

// Handle notifications
client.on("notification", async (msg) => {
  const payload = JSON.parse(msg.payload);
  console.log("Received notification:", payload);
  
  // Process the conversation
  // Call your edge function or processing logic here
  
  // Update the conversation status when done
  await pool.query(
    "UPDATE user_conversations SET status = $1 WHERE conversation_id = $2",
    ["processed", payload.conversation_id]
  );
});

console.log("Listening for conversation notifications...");
```';

-- Add notice to explain the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. The trigger now uses NOTIFY instead of HTTP calls.';
  RAISE NOTICE 'External systems should listen on the "conversation_processing" channel.';
  RAISE NOTICE 'Check the function comment for sample code to implement a listener.';
END $$; 