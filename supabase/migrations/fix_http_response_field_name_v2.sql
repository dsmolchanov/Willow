-- Fix for the trigger function that references incorrect HTTP response field names
-- The field is likely named 'code' instead of 'status' or 'status_code'

-- First, let's run a test query to see the structure of the http_response record
DO $$
DECLARE
  test_response RECORD;
BEGIN
  -- Log the structure of the http_response record
  SELECT * INTO test_response 
  FROM net.http_post(
    'https://httpbin.org/post',
    '{}'::jsonb,
    '{}'::jsonb
  );

  -- Log the field names
  RAISE NOTICE 'HTTP response fields: %', (SELECT string_agg(key, ', ') FROM jsonb_object_keys(row_to_json(test_response)::jsonb) AS key);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error testing HTTP response structure: %', SQLERRM;
END $$;

-- Now update the trigger function with the correct field name
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
    -- Make the edge function call - Store the entire response as jsonb to be safe
    WITH http_call AS (
      SELECT 
        *
      FROM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || function_key
        ),
        body := jsonb_build_object('conversation_id', NEW.conversation_id)::text
      )
    )
    SELECT 
      to_jsonb(http_call)::text::jsonb ->> 'status' AS status_text,
      request_id
    INTO 
      http_response
    FROM http_call;
    
    -- Safely extract the status as an integer (handling potential parsing errors)
    DECLARE
      status_code INT;
    BEGIN
      status_code := COALESCE(http_response.status_text::INT, 500);
      -- Determine if the call was successful based on status code
      function_success := status_code >= 200 AND status_code < 300;
    EXCEPTION WHEN OTHERS THEN 
      -- If we can't parse the status code, assume it's an error
      status_code := 500;
      function_success := FALSE;
    END;

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
      error_message := format('Edge function returned status %s', http_response.status_text);
      INSERT INTO trigger_execution_logs (trigger_name, table_name, operation_type, row_id, details)
      VALUES (
        'check_conversations_trigger_edge_function', 
        TG_TABLE_NAME, 
        TG_OP, 
        NEW.conversation_id, 
        jsonb_build_object(
          'error', 'Edge function call failed with status code',  
          'status', http_response.status_text,
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