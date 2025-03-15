-- Enhanced trigger with retry logic - Edge function needs multiple attempts
-- This version is designed to work across different PostgreSQL versions
-- by using a more robust approach to handle HTTP responses

-- First, drop existing trigger
DROP TRIGGER IF EXISTS check_conversations_trigger ON public.user_conversations;
DROP FUNCTION IF EXISTS public.trigger_check_conversations();

-- Create the fixed trigger function with a more robust approach to HTTP calls
CREATE OR REPLACE FUNCTION public.trigger_check_conversations()
RETURNS TRIGGER AS $$
DECLARE
    request_id bigint;
    edge_function_url text := 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation';
    auth_token text;
    http_result record; -- Use a generic record type
    http_response jsonb; -- Store the full response as JSONB for parsing
    retry_count integer := 0;
    max_retries integer := 3;
    delay_seconds integer := 10; -- 10 seconds between retries for production
    call_success boolean := false;
    last_error text;
    start_time timestamp;
BEGIN
    -- Log trigger execution start
    INSERT INTO public.trigger_execution_logs (
        trigger_name,
        table_name,
        operation_type,
        row_id,
        execution_time,
        details
    ) VALUES (
        'check_conversations_trigger',
        TG_TABLE_NAME,
        TG_OP,
        NEW.conversation_id,
        CURRENT_TIMESTAMP,
        jsonb_build_object(
            'debug', 'Conversation check trigger started with retry logic',
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id,
            'status', COALESCE(NEW.status, 'unknown'),
            'max_retries', max_retries,
            'delay_seconds', delay_seconds
        )
    );

    -- Only proceed if we have an elevenlabs_conversation_id and status is not processed
    IF NEW.elevenlabs_conversation_id IS NOT NULL AND NEW.elevenlabs_conversation_id != '' AND NEW.status IS DISTINCT FROM 'processed' THEN
        -- Get the service role key for auth - in production, this would use a more secure method
        BEGIN
            SELECT current_setting('supabase.anon_key') INTO auth_token;
        EXCEPTION WHEN OTHERS THEN
            auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'; -- Fallback, should be replaced with proper token
            
            -- Log the error getting the auth token
            INSERT INTO public.trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                'check_conversations_trigger_auth_error',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'debug', 'Failed to get auth token, using fallback',
                    'error', SQLERRM,
                    'sqlstate', SQLSTATE
                )
            );
        END;

        -- Try multiple times with delays between attempts
        WHILE retry_count < max_retries AND NOT call_success LOOP
            retry_count := retry_count + 1;
            start_time := clock_timestamp();
            
            -- Log the current attempt
            INSERT INTO public.trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                'check_conversations_trigger_attempt',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'debug', 'Attempting edge function call',
                    'url', edge_function_url,
                    'conversation_id', NEW.conversation_id,
                    'attempt', retry_count,
                    'of_max_attempts', max_retries
                )
            );
            
            -- Call the edge function with only conversation_id
            BEGIN
                -- APPROACH 1: Try the specific column approach first (newer PostgreSQL)
                BEGIN
                    EXECUTE '
                        SELECT id, status, body 
                        FROM net.http_post(
                            url := $1,
                            headers := $2,
                            body := $3
                        ) AS (id bigint, status int, body jsonb)'
                    INTO http_result
                    USING 
                        edge_function_url,
                        jsonb_build_object(
                            'Authorization', 'Bearer ' || auth_token,
                            'Content-Type', 'application/json'
                        ),
                        jsonb_build_object('conversation_id', NEW.conversation_id)::text;
                    
                    -- Store the result for later access
                    http_response := jsonb_build_object(
                        'id', http_result.id,
                        'status', http_result.status,
                        'body', http_result.body
                    );
                    
                    -- Set the request_id from response
                    request_id := http_result.id;
                    
                    call_success := true;
                EXCEPTION WHEN OTHERS THEN
                    -- First approach failed, log and try the next approach
                    INSERT INTO public.trigger_execution_logs (
                        trigger_name,
                        table_name,
                        operation_type,
                        row_id,
                        execution_time,
                        details
                    ) VALUES (
                        'check_conversations_trigger_approach1_error',
                        TG_TABLE_NAME,
                        TG_OP,
                        NEW.conversation_id,
                        CURRENT_TIMESTAMP,
                        jsonb_build_object(
                            'debug', 'Approach 1 failed, trying approach 2',
                            'error', SQLERRM,
                            'sqlstate', SQLSTATE
                        )
                    );
                END;
                
                -- APPROACH 2: If first approach failed, try with TO_JSON (older PostgreSQL)
                IF NOT call_success THEN
                    BEGIN
                        EXECUTE '
                            SELECT row_to_json(http) 
                            FROM net.http_post(
                                url := $1,
                                headers := $2,
                                body := $3
                            ) AS http'
                        INTO http_response
                        USING 
                            edge_function_url,
                            jsonb_build_object(
                                'Authorization', 'Bearer ' || auth_token,
                                'Content-Type', 'application/json'
                            ),
                            jsonb_build_object('conversation_id', NEW.conversation_id)::text;
                        
                        -- Extract the request_id from the JSON
                        request_id := (http_response->>'id')::bigint;
                        
                        call_success := true;
                    EXCEPTION WHEN OTHERS THEN
                        -- Second approach failed too, log and continue to next attempt
                        INSERT INTO public.trigger_execution_logs (
                            trigger_name,
                            table_name,
                            operation_type,
                            row_id,
                            execution_time,
                            details
                        ) VALUES (
                            'check_conversations_trigger_approach2_error',
                            TG_TABLE_NAME,
                            TG_OP,
                            NEW.conversation_id,
                            CURRENT_TIMESTAMP,
                            jsonb_build_object(
                                'debug', 'Approach 2 failed, will retry if attempts remain',
                                'error', SQLERRM,
                                'sqlstate', SQLSTATE
                            )
                        );
                        
                        last_error := SQLERRM;
                    END;
                END IF;
                
                -- If call was successful, log the details
                IF call_success THEN
                    -- Log the successful call
                    INSERT INTO public.trigger_execution_logs (
                        trigger_name,
                        table_name,
                        operation_type,
                        row_id,
                        execution_time,
                        details
                    ) VALUES (
                        'check_conversations_trigger_success',
                        TG_TABLE_NAME,
                        TG_OP,
                        NEW.conversation_id,
                        CURRENT_TIMESTAMP,
                        jsonb_build_object(
                            'success', true,
                            'request_id', request_id,
                            'conversation_id', NEW.conversation_id,
                            'response', http_response,
                            'attempt', retry_count,
                            'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
                        )
                    );
                END IF;
            EXCEPTION WHEN OTHERS THEN
                last_error := SQLERRM;
                
                -- Log the failed attempt
                INSERT INTO public.trigger_execution_logs (
                    trigger_name,
                    table_name,
                    operation_type,
                    row_id,
                    execution_time,
                    details
                ) VALUES (
                    'check_conversations_trigger_retry',
                    TG_TABLE_NAME,
                    TG_OP,
                    NEW.conversation_id,
                    CURRENT_TIMESTAMP,
                    jsonb_build_object(
                        'error', 'Edge function call failed, will retry',
                        'message', last_error,
                        'sqlstate', SQLSTATE,
                        'attempt', retry_count,
                        'of_max_attempts', max_retries,
                        'will_retry', retry_count < max_retries,
                        'next_retry_in_seconds', CASE WHEN retry_count < max_retries THEN delay_seconds ELSE NULL END,
                        'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
                    )
                );
            END;
            
            -- If we need to retry, wait for the specified delay before next attempt
            IF NOT call_success AND retry_count < max_retries THEN
                PERFORM pg_sleep(delay_seconds);
            END IF;
        END LOOP;
        
        -- Log the final outcome
        IF call_success THEN
            -- Log the overall success
            INSERT INTO public.trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                'check_conversations_trigger_edge_function',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'success', true,
                    'request_id', request_id,
                    'conversation_id', NEW.conversation_id,
                    'attempts_needed', retry_count,
                    'status', 'Successfully called edge function'
                )
            );
        ELSE
            -- Log the overall failure
            INSERT INTO public.trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                'check_conversations_trigger_edge_function',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'success', false,
                    'conversation_id', NEW.conversation_id,
                    'attempts', retry_count,
                    'last_error', last_error,
                    'status', 'Failed to call edge function after max retries'
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO public.trigger_execution_logs (
        trigger_name,
        table_name,
        operation_type,
        row_id,
        execution_time,
        details
    ) VALUES (
        'check_conversations_trigger_error',
        TG_TABLE_NAME,
        TG_OP,
        NEW.conversation_id,
        CURRENT_TIMESTAMP,
        jsonb_build_object(
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger
CREATE TRIGGER check_conversations_trigger
AFTER INSERT OR UPDATE ON public.user_conversations
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM 'processed')
EXECUTE FUNCTION public.trigger_check_conversations();

-- Add a comment to indicate this trigger has been fixed
COMMENT ON FUNCTION public.trigger_check_conversations() IS 'Checks for conversations with elevenlabs_conversation_id and calls the edge function with retry logic. Uses dynamic SQL to handle different PostgreSQL versions and function signatures.'; 