-- Drop the function and trigger if they already exist
DROP FUNCTION IF EXISTS public.trigger_check_conversations() CASCADE;
DROP TRIGGER IF EXISTS check_conversations_trigger ON public.user_conversations;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.trigger_check_conversations()
RETURNS TRIGGER AS $$
DECLARE
    response http_response;
    edge_function_url text;
    request_body jsonb;
    auth_token text;
    max_attempts int := 3;
    current_attempt int := 1;
    wait_time int := 1;
    error_message text;
    error_state text;
    headers text[];
BEGIN
    -- Skip processing if already marked as processed or no elevenlabs_conversation_id
    IF NEW.status = 'processed' OR NEW.elevenlabs_conversation_id IS NULL THEN
        -- Log skipping
        INSERT INTO trigger_execution_logs (
            trigger_name,
            table_name,
            operation_type,
            row_id,
            execution_time,
            details
        ) VALUES (
            TG_NAME || '_skipped',
            TG_TABLE_NAME,
            TG_OP,
            NEW.conversation_id,
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'debug', 'Skipping conversation processing',
                'status', NEW.status,
                'has_elevenlabs_id', NEW.elevenlabs_conversation_id IS NOT NULL
            )
        );
        RETURN NEW;
    END IF;

    -- Log the initial status
    INSERT INTO trigger_execution_logs (
        trigger_name,
        table_name,
        operation_type,
        row_id,
        execution_time,
        details
    ) VALUES (
        TG_NAME,
        TG_TABLE_NAME,
        TG_OP,
        NEW.conversation_id,
        CURRENT_TIMESTAMP,
        jsonb_build_object(
            'debug', 'Conversation check trigger started',
            'status', NEW.status,
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
        )
    );
    
    -- Set edge function URL and request body
    edge_function_url := 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation';
    request_body := jsonb_build_object('conversation_id', NEW.conversation_id);
    
    -- Get authentication token 
    BEGIN
        -- Try to get the token from app settings
        auth_token := current_setting('app.edge_function_key', true);
        
        -- Log successful token retrieval
        INSERT INTO trigger_execution_logs (
            trigger_name,
            table_name,
            operation_type,
            row_id,
            execution_time,
            details
        ) VALUES (
            TG_NAME || '_auth',
            TG_TABLE_NAME,
            TG_OP,
            NEW.conversation_id,
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'debug', 'Retrieved auth token',
                'source', 'app.edge_function_key'
            )
        );
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            -- Try to get from supabase settings
            auth_token := current_setting('supabase.anon_key', true);
            
            -- Log fallback token retrieval
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                TG_NAME || '_auth',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'debug', 'Retrieved fallback auth token',
                    'source', 'supabase.anon_key'
                )
            );
        EXCEPTION WHEN OTHERS THEN
            -- Use hardcoded token as last resort
            auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv5Hq8olmcXJYeW7byJk';
            
            -- Log hardcoded token usage
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                TG_NAME || '_auth',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'debug', 'Using hardcoded auth token',
                    'source', 'hardcoded'
                )
            );
        END;
    END;
    
    -- Set headers with the auth token
    headers := ARRAY[
        'Content-Type: application/json',
        'Authorization: Bearer ' || auth_token
    ];
    
    -- Attempt with exponential backoff
    WHILE current_attempt <= max_attempts LOOP
        BEGIN
            -- Log attempt
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                TG_NAME || '_attempt',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'debug', 'Attempting edge function call',
                    'attempt', current_attempt,
                    'of_max_attempts', max_attempts,
                    'url', edge_function_url,
                    'conversation_id', NEW.conversation_id,
                    'has_auth', auth_token IS NOT NULL
                )
            );
            
            -- Call the edge function using the working http_post signature with headers
            SELECT * INTO response
            FROM http_post(
                edge_function_url,
                request_body::text,
                'application/json',
                headers
            );
            
            -- Log the response
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                TG_NAME || '_response',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'status', response.status,
                    'content', response.content,
                    'attempt', current_attempt,
                    'conversation_id', NEW.conversation_id
                )
            );
            
            -- Check for successful response
            IF response.status IN (200, 201, 202, 204) THEN
                -- Log success
                INSERT INTO trigger_execution_logs (
                    trigger_name,
                    table_name,
                    operation_type,
                    row_id,
                    execution_time,
                    details
                ) VALUES (
                    TG_NAME || '_success',
                    TG_TABLE_NAME,
                    TG_OP,
                    NEW.conversation_id,
                    CURRENT_TIMESTAMP,
                    jsonb_build_object(
                        'status', 'Edge function call succeeded',
                        'response_status', response.status,
                        'conversation_id', NEW.conversation_id,
                        'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
                    )
                );
                
                -- Exit the retry loop
                EXIT;
            END IF;
            
            -- Log failed attempt
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                TG_NAME || '_retry',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'error', 'Edge function returned non-success status',
                    'attempt', current_attempt,
                    'status_code', response.status,
                    'will_retry', current_attempt < max_attempts,
                    'of_max_attempts', max_attempts,
                    'next_retry_in_seconds', CASE WHEN current_attempt < max_attempts THEN wait_time ELSE NULL END
                )
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Capture error details into variables
            GET STACKED DIAGNOSTICS 
                error_message = MESSAGE_TEXT,
                error_state = RETURNED_SQLSTATE;
                
            -- Log error
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                TG_NAME || '_retry',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'error', 'Edge function call failed, will retry',
                    'attempt', current_attempt,
                    'message', error_message,
                    'sqlstate', error_state,
                    'will_retry', current_attempt < max_attempts,
                    'of_max_attempts', max_attempts,
                    'next_retry_in_seconds', CASE WHEN current_attempt < max_attempts THEN wait_time ELSE NULL END
                )
            );
        END;
        
        -- Prepare next attempt
        current_attempt := current_attempt + 1;
        
        -- If we have more attempts, wait before trying again
        IF current_attempt <= max_attempts THEN
            PERFORM pg_sleep(wait_time);
            wait_time := wait_time * 2;  -- Exponential backoff
        END IF;
    END LOOP;
    
    -- Log final status if all attempts failed
    IF current_attempt > max_attempts THEN
        INSERT INTO trigger_execution_logs (
            trigger_name,
            table_name,
            operation_type,
            row_id,
            execution_time,
            details
        ) VALUES (
            TG_NAME || '_edge_function',
            TG_TABLE_NAME,
            TG_OP,
            NEW.conversation_id,
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'status', 'Failed to call edge function after max retries',
                'success', false,
                'attempts', max_attempts,
                'last_error', error_message,
                'conversation_id', NEW.conversation_id
            )
        );
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Capture error details into variables
    GET STACKED DIAGNOSTICS 
        error_message = MESSAGE_TEXT,
        error_state = RETURNED_SQLSTATE;
        
    -- Log any errors in the main function
    INSERT INTO trigger_execution_logs (
        trigger_name,
        table_name,
        operation_type,
        row_id,
        execution_time,
        details
    ) VALUES (
        TG_NAME || '_main_error',
        TG_TABLE_NAME,
        TG_OP,
        NEW.conversation_id,
        CURRENT_TIMESTAMP,
        jsonb_build_object(
            'error', error_message,
            'sqlstate', error_state
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_conversations_trigger
AFTER INSERT OR UPDATE ON public.user_conversations
FOR EACH ROW
WHEN (NEW.status <> 'processed' AND NEW.elevenlabs_conversation_id IS NOT NULL)
EXECUTE FUNCTION trigger_check_conversations(); 