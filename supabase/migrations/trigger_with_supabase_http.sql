-- First, drop existing trigger and function
DROP TRIGGER IF EXISTS check_conversations_trigger ON public.user_conversations;
DROP FUNCTION IF EXISTS public.trigger_check_conversations();

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.trigger_check_conversations()
RETURNS TRIGGER AS $$
DECLARE
    response_status integer;
    response_body text;
    edge_function_url text;
    request_body text;
    auth_token text;
BEGIN
    -- Skip if conversation has already been processed or has no elevenlabs_conversation_id
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

    -- Log trigger execution start
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
    request_body := jsonb_build_object('conversation_id', NEW.conversation_id)::text;

    -- Get auth token
    BEGIN
        auth_token := current_setting('app.edge_function_key', true);
    EXCEPTION WHEN OTHERS THEN
        -- Log auth token error
        INSERT INTO trigger_execution_logs (
            trigger_name,
            table_name,
            operation_type,
            row_id,
            execution_time,
            details
        ) VALUES (
            TG_NAME || '_auth_error',
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
        -- Use supabase anon key as fallback
        BEGIN
            auth_token := current_setting('supabase.anon_key', true);
        EXCEPTION WHEN OTHERS THEN
            -- If still no token, use a hardcoded value for service role
            auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv5Hq8olmcXJYeW7byJk';
        END;
    END;

    -- Call the edge function using supabase_functions.http_request
    BEGIN
        SELECT 
            status_code,
            content::text
        FROM 
            supabase_functions.http_request(
                'POST',  -- method
                edge_function_url,  -- url
                jsonb_build_object(  -- headers
                    'Authorization', 'Bearer ' || auth_token,
                    'Content-Type', 'application/json'
                ),
                request_body,  -- body
                30  -- timeout in seconds
            )
        INTO
            response_status,
            response_body;
        
        -- Log success
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
                'status', 'Edge function call succeeded',
                'status_code', response_status,
                'response', response_body,
                'conversation_id', NEW.conversation_id,
                'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error from edge function call
        INSERT INTO trigger_execution_logs (
            trigger_name,
            table_name,
            operation_type,
            row_id,
            execution_time,
            details
        ) VALUES (
            TG_NAME || '_error',
            TG_TABLE_NAME,
            TG_OP,
            NEW.conversation_id,
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'error', SQLERRM,
                'sqlstate', SQLSTATE,
                'debug', 'Failed to call edge function',
                'conversation_id', NEW.conversation_id
            )
        );
    END;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
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
            'error', SQLERRM,
            'sqlstate', SQLSTATE
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