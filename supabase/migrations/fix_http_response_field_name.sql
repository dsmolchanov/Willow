-- Fix for the trigger function that incorrectly references http_response.status_code
-- The field is actually named 'status' not 'status_code'

CREATE OR REPLACE FUNCTION trigger_check_conversations()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  function_key TEXT;
  http_method TEXT := 'POST';
  http_response RECORD;
  request_id TEXT;
  function_success BOOLEAN;
  error_message TEXT;
  conversation_has_elevenlabs_id BOOLEAN;
  is_fetching BOOLEAN;
  can_retry BOOLEAN;
  existing_status TEXT;
BEGIN
  -- Log the start of the trigger execution
  INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, details)
  VALUES (
    'check_conversations_trigger', 
    TG_TABLE_NAME, 
    TG_OP, 
    NEW.conversation_id, 
    jsonb_build_object(
      'debug', 'Trigger started',
      'status', COALESCE(NEW.status, 'unknown'),
      'operation', TG_OP,
      'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
    )
  );

  -- Check if the record has an ElevenLabs conversation ID
  IF NEW.elevenlabs_conversation_id IS NULL OR NEW.elevenlabs_conversation_id = '' THEN
    RAISE LOG 'No ElevenLabs conversation ID found, skipping edge function call';
    RETURN NEW;
  END IF;

  -- Check if status is already 'processed'
  IF NEW.status = 'processed' THEN
    RAISE LOG 'Conversation % already processed, skipping', NEW.conversation_id;
    RETURN NEW;
  END IF;

  -- Check if status is 'fetch_failed' on update and don't retry immediately
  IF TG_OP = 'UPDATE' AND NEW.status = 'fetch_failed' THEN
    -- Log the skip
    INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, details)
    VALUES (
      'check_conversations_trigger', 
      TG_TABLE_NAME, 
      TG_OP, 
      NEW.conversation_id, 
      jsonb_build_object(
        'debug', 'Trigger skipped',
        'reason', 'Previous fetch failed',
        'status', NEW.status,
        'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
      )
    );
    RETURN NEW;
  END IF;

  -- Try to get configuration values safely
  BEGIN
    edge_function_url := rtrim(current_setting('app.settings.edge_function_url', true), '/') || '/check-conversation';
    function_key := current_setting('app.settings.edge_function_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error getting configuration: %', SQLERRM;
    edge_function_url := 'http://localhost:54321/functions/v1/check-conversation';
    function_key := '';
  END;

  -- Log the attempt to call the edge function
  INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, details)
  VALUES (
    'check_conversations_trigger', 
    TG_TABLE_NAME, 
    TG_OP, 
    NEW.conversation_id, 
    jsonb_build_object(
      'debug', 'Attempting edge function call',
      'status', COALESCE(NEW.status, 'unknown'),
      'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
    )
  );

  BEGIN
    -- Make the edge function call
    SELECT 
      status,                       -- Changed from status_code to status
      request_id
    INTO http_response
    FROM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || function_key
      ),
      body := jsonb_build_object('conversation_id', NEW.conversation_id)::text
    );

    -- Determine if the call was successful based on status
    function_success := http_response.status >= 200 AND http_response.status < 300;  -- Changed from status_code to status

    -- If the call was successful, return the NEW record
    IF function_success THEN
      -- Log the successful edge function call
      INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, details)
      VALUES (
        'check_conversations_trigger_edge_function', 
        TG_TABLE_NAME, 
        TG_OP, 
        NEW.conversation_id, 
        jsonb_build_object(
          'success', true,
          'request_id', http_response.request_id,
          'edge_function', 'check-conversation',
          'conversation_id', NEW.conversation_id
        )
      );
      RETURN NEW;
    ELSE
      -- Log the failed edge function call but with status code info
      error_message := format('Edge function returned status %s', http_response.status);  -- Changed from status_code to status
      INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, details)
      VALUES (
        'check_conversations_trigger_edge_function', 
        TG_TABLE_NAME, 
        TG_OP, 
        NEW.conversation_id, 
        jsonb_build_object(
          'error', 'Edge function call failed with status code',  
          'status', http_response.status,                         -- Changed from status_code to status
          'context', jsonb_build_object(
            'edge_function', 'check-conversation',
            'conversation_id', NEW.conversation_id
          ),
          'message', error_message
        )
      );
      
      -- Update the record to show that the fetch failed
      NEW.status := 'fetch_failed';
      NEW.fetch_attempts := COALESCE(NEW.fetch_attempts, 0) + 1;
      NEW.last_fetch_attempt := NOW();
      RETURN NEW;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the exception
    INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, details)
    VALUES (
      'check_conversations_trigger_edge_function', 
      TG_TABLE_NAME, 
      TG_OP, 
      NEW.conversation_id, 
      jsonb_build_object(
        'error', 'Edge function call failed',
        'context', jsonb_build_object(
          'edge_function', 'check-conversation',
          'conversation_id', NEW.conversation_id
        ),
        'message', SQLERRM,
        'sqlstate', SQLSTATE
      )
    );
    
    -- Update the record to show that the fetch failed
    NEW.status := 'fetch_failed';
    NEW.fetch_attempts := COALESCE(NEW.fetch_attempts, 0) + 1;
    NEW.last_fetch_attempt := NOW();
    RETURN NEW;
  END;
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