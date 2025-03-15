-- Fix for the missing supabase_functions schema in the trigger function
-- First, try to ensure the pg_net extension is available
DO $$
BEGIN
  -- Check if pg_net extension exists
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    -- Try to create it if it doesn't exist
    BEGIN
      CREATE EXTENSION pg_net;
      RAISE NOTICE 'Created pg_net extension';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not create pg_net extension: %. You may need to contact your Supabase administrator.', SQLERRM;
    END;
  END IF;
END $$;

-- Replace the trigger function with a version that only uses pg_net
CREATE OR REPLACE FUNCTION trigger_check_conversations()
RETURNS TRIGGER AS $$
DECLARE
  -- Use the exact URL provided by the user
  edge_function_url TEXT := 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation';
  function_key TEXT;
  http_method TEXT := 'POST';
  http_response RECORD;
  http_response_json JSONB;
  status_code INTEGER;
  request_id TEXT;
  function_success BOOLEAN;
  error_message TEXT;
  conversation_has_elevenlabs_id BOOLEAN;
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
    RAISE LOG 'No ElevenLabs conversation ID found, skipping edge function call';
    RETURN NEW;
  END IF;

  -- Check if status is already 'processed'
  IF NEW.status = 'processed' THEN
    RAISE LOG 'Conversation % already processed, skipping', NEW.conversation_id;
    RETURN NEW;
  END IF;

  -- Try to get the function key safely
  BEGIN
    function_key := current_setting('app.settings.edge_function_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error getting function key: %', SQLERRM;
    function_key := '';
  END;

  -- Log the attempt to call the edge function
  INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
  VALUES (
    'check_conversations_trigger', 
    TG_TABLE_NAME, 
    TG_OP, 
    NEW.conversation_id, 
    clock_timestamp(),
    jsonb_build_object(
      'debug', 'Attempting edge function call',
      'url', edge_function_url,
      'status', COALESCE(NEW.status, 'unknown'),
      'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id,
      'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    )
  );

  -- Safely try multiple approaches to make the HTTP call
  BEGIN
    -- First attempt: Try with pg_net extension named parameters
    BEGIN
      SELECT * 
      INTO http_response
      FROM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || function_key
        ),
        body := jsonb_build_object('conversation_id', NEW.conversation_id)::text
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error from the first attempt
      INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
      VALUES (
        'check_conversations_trigger_error', 
        TG_TABLE_NAME, 
        TG_OP, 
        NEW.conversation_id, 
        clock_timestamp(),
        jsonb_build_object(
          'error', 'First HTTP attempt failed',
          'message', SQLERRM,
          'sqlstate', SQLSTATE,
          'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
        )
      );
      
      -- Second attempt: Try with pg_net positional parameters
      BEGIN
        SELECT * 
        INTO http_response
        FROM net.http_post(
          edge_function_url,
          jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || function_key
          ),
          jsonb_build_object('conversation_id', NEW.conversation_id)::text
        );
      EXCEPTION WHEN OTHERS THEN
        -- Log the HTTP function failures
        INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
        VALUES (
          'check_conversations_trigger_error', 
          TG_TABLE_NAME, 
          TG_OP, 
          NEW.conversation_id, 
          clock_timestamp(),
          jsonb_build_object(
            'error', 'Could not make HTTP call with pg_net',
            'message', SQLERRM,
            'sqlstate', SQLSTATE,
            'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
          )
        );
        
        -- Just return the record as is since we can't make the HTTP call
        RETURN NEW;
      END;
    END;

    -- If we got here, we successfully made the HTTP call
    -- Convert the record to JSON so we can extract fields dynamically
    http_response_json := to_jsonb(http_response);
    
    -- Log the complete HTTP response structure for debugging
    INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
    VALUES (
      'check_conversations_trigger_debug', 
      TG_TABLE_NAME, 
      TG_OP, 
      NEW.conversation_id, 
      clock_timestamp(),
      jsonb_build_object(
        'debug', 'HTTP response structure',
        'http_response', http_response_json,
        'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
      )
    );
    
    -- Try to extract the status code from different possible field names
    IF http_response_json ? 'status_code' THEN
      status_code := (http_response_json ->> 'status_code')::integer;
    ELSIF http_response_json ? 'status' THEN
      status_code := (http_response_json ->> 'status')::integer;
    ELSIF http_response_json ? 'code' THEN
      status_code := (http_response_json ->> 'code')::integer;
    ELSE
      -- Default to unknown status
      status_code := 500;
      
      -- Log that we couldn't find a status code
      INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
      VALUES (
        'check_conversations_trigger_error', 
        TG_TABLE_NAME, 
        TG_OP, 
        NEW.conversation_id, 
        clock_timestamp(),
        jsonb_build_object(
          'error', 'Could not determine status code from HTTP response',
          'available_fields', (SELECT array_agg(key) FROM jsonb_object_keys(http_response_json) AS key),
          'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
        )
      );
    END IF;
    
    -- Determine if the call was successful based on status code
    function_success := status_code >= 200 AND status_code < 300;

    -- Log the outcome of the edge function call
    IF function_success THEN
      -- Log the successful edge function call
      INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
      VALUES (
        'check_conversations_trigger_edge_function', 
        TG_TABLE_NAME, 
        TG_OP, 
        NEW.conversation_id, 
        clock_timestamp(),
        jsonb_build_object(
          'success', true,
          'request_id', http_response_json ->> 'request_id',
          'status_code', status_code,
          'edge_function', 'check-conversation',
          'conversation_id', NEW.conversation_id,
          'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
        )
      );
    ELSE
      -- Log the failed edge function call with status code info
      error_message := format('Edge function returned status %s', status_code);
      INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
      VALUES (
        'check_conversations_trigger_edge_function', 
        TG_TABLE_NAME, 
        TG_OP, 
        NEW.conversation_id, 
        clock_timestamp(),
        jsonb_build_object(
          'error', 'Edge function call failed with status code',  
          'status_code', status_code,
          'context', jsonb_build_object(
            'edge_function', 'check-conversation',
            'conversation_id', NEW.conversation_id
          ),
          'message', error_message,
          'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the exception
    INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, execution_time, details)
    VALUES (
      'check_conversations_trigger_edge_function', 
      TG_TABLE_NAME, 
      TG_OP, 
      NEW.conversation_id, 
      clock_timestamp(),
      jsonb_build_object(
        'error', 'Edge function call failed',
        'context', jsonb_build_object(
          'edge_function', 'check-conversation',
          'conversation_id', NEW.conversation_id
        ),
        'message', SQLERRM,
        'sqlstate', SQLSTATE,
        'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
      )
    );
  END;
  
  -- Always return NEW to ensure the record operation completes
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