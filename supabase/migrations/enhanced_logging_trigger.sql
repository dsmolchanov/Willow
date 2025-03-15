-- Enhanced logging trigger to diagnose edge function issues
-- First, drop existing trigger
DROP TRIGGER IF EXISTS check_conversations_trigger ON user_conversations;

-- Create or replace the function
CREATE OR REPLACE FUNCTION trigger_check_conversations()
RETURNS TRIGGER AS $$
DECLARE
    request_id bigint;
    edge_function_url text := 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation';
    request_payload jsonb;
    auth_token text;
    full_response record;
BEGIN
    -- Log trigger execution start
    INSERT INTO trigger_execution_logs (
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
            'debug', 'Conversation check trigger started',
            'clerk_id', NEW.clerk_id,
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id,
            'status', COALESCE(NEW.status, 'unknown')
        )
    );

    -- Only proceed if we have an elevenlabs_conversation_id and status is not processed
    IF NEW.elevenlabs_conversation_id IS NOT NULL AND NEW.elevenlabs_conversation_id != '' AND NEW.status IS DISTINCT FROM 'processed' THEN
        -- Get the auth token
        BEGIN
            auth_token := current_setting('app.edge_function_key', true);
        EXCEPTION WHEN OTHERS THEN
            -- Log error getting token
            INSERT INTO trigger_execution_logs (
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
                    'error', 'Failed to get edge function key',
                    'message', SQLERRM,
                    'sqlstate', SQLSTATE
                )
            );
            auth_token := '';
        END;

        -- Prepare request payload
        request_payload := jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id, 
            'clerk_id', NEW.clerk_id
        );

        -- Log the exact payload we're sending
        INSERT INTO trigger_execution_logs (
            trigger_name,
            table_name,
            operation_type,
            row_id,
            execution_time,
            details
        ) VALUES (
            'check_conversations_trigger_request',
            TG_TABLE_NAME,
            TG_OP,
            NEW.conversation_id,
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'debug', 'Calling edge function',
                'url', edge_function_url,
                'authorization', 'Bearer ' || CASE WHEN LENGTH(auth_token) > 5 
                                               THEN LEFT(auth_token, 3) || '...' 
                                               ELSE '[empty]' END,
                'payload', request_payload
            )
        );

        -- Call the edge function
        SELECT * FROM net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || auth_token,
                'Content-Type', 'application/json'
            ),
            body := request_payload::text
        ) INTO full_response;
        
        -- Extract request_id
        request_id := (to_jsonb(full_response) ->> 'id')::bigint;
        
        -- Log the complete response
        INSERT INTO trigger_execution_logs (
            trigger_name,
            table_name,
            operation_type,
            row_id,
            execution_time,
            details
        ) VALUES (
            'check_conversations_trigger_complete_response',
            TG_TABLE_NAME,
            TG_OP,
            NEW.conversation_id,
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'debug', 'Edge function complete response',
                'response', to_jsonb(full_response),
                'conversation_id', NEW.conversation_id
            )
        );
        
        -- Log the edge function call result
        INSERT INTO trigger_execution_logs (
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
                'edge_function', 'check-conversation',
                'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
            )
        );
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO trigger_execution_logs (
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
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id,
            'debug_backtrace', quote_literal(pg_backend_pid())
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_conversations_trigger
AFTER INSERT OR UPDATE ON user_conversations
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM 'processed')
EXECUTE FUNCTION trigger_check_conversations(); 