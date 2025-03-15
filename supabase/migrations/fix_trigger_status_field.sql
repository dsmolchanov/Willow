CREATE OR REPLACE FUNCTION trigger_check_conversations() 
RETURNS TRIGGER AS $$
DECLARE
    http_response record;
    edge_function_key text;
    response_body jsonb;
    status_code int;
BEGIN
    -- Initial debug log for trigger execution
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
            'debug', 'Trigger started',
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id,
            'status', NEW.status,
            'operation', TG_OP
        )
    );

    -- Get the edge function key
    BEGIN
        edge_function_key := current_setting('app.edge_function_key', true);
    EXCEPTION WHEN OTHERS THEN
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
                'error', 'Failed to get edge function key',
                'sqlstate', SQLSTATE,
                'message', SQLERRM
            )
        );
        RETURN NEW;
    END;

    -- Only proceed if we have an elevenlabs_conversation_id and status is not 'processed'
    IF NEW.elevenlabs_conversation_id IS NOT NULL AND 
       (NEW.status IS NULL OR NEW.status NOT IN ('processed', 'fetching', 'fetch_failed')) THEN
        
        -- Log the attempt to call edge function
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
                'debug', 'Attempting edge function call',
                'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id,
                'status', NEW.status
            )
        );

        -- Call the edge function with enhanced response handling
        BEGIN
            SELECT * FROM net.http_post(
                url := 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation',
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || edge_function_key,
                    'Content-Type', 'application/json'
                ),
                body := jsonb_build_object(
                    'conversation_id', NEW.conversation_id
                )
            ) INTO http_response;
            
            -- Extract status code and attempt to parse response body as JSON
            -- FIX: Use status_code field instead of status
            status_code := http_response.status_code;
            
            BEGIN
                response_body := http_response.body::jsonb;
            EXCEPTION WHEN OTHERS THEN
                -- If response is not valid JSON, store as text
                response_body := jsonb_build_object(
                    'raw_text', http_response.body::text,
                    'parse_error', SQLERRM
                );
            END;
            
            -- Log detailed response
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                TG_NAME || '_edge_function_response',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'status_code', status_code,
                    'response', response_body,
                    'headers', http_response.headers,
                    'is_success', status_code BETWEEN 200 AND 299,
                    'conversation_id', NEW.conversation_id,
                    'edge_function', 'check-conversation'
                )
            );
            
            -- Log success or failure based on HTTP status code
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
                    'success', status_code BETWEEN 200 AND 299,
                    'status_code', status_code,
                    'request_id', COALESCE((response_body->>'request_id')::bigint, 0),
                    'conversation_id', NEW.conversation_id
                )
            );
            
            -- If status code indicates error, update conversation record with failure info
            IF status_code NOT BETWEEN 200 AND 299 THEN
                UPDATE user_conversations 
                SET 
                    status = 'fetch_failed',
                    metadata = jsonb_set(
                        COALESCE(metadata, '{}'::jsonb),
                        '{error}',
                        jsonb_build_object(
                            'timestamp', CURRENT_TIMESTAMP,
                            'status_code', status_code,
                            'message', 'Edge function returned non-success status code',
                            'response', response_body
                        )
                    )
                WHERE conversation_id = NEW.conversation_id;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log edge function call failure with detailed error
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
                    'error', 'Edge function call failed',
                    'sqlstate', SQLSTATE,
                    'message', SQLERRM,
                    'context', jsonb_build_object(
                        'conversation_id', NEW.conversation_id,
                        'edge_function', 'check-conversation'
                    )
                )
            );
            
            -- Update conversation status to indicate failure
            UPDATE user_conversations 
            SET 
                status = 'fetch_failed',
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{error}',
                    jsonb_build_object(
                        'timestamp', CURRENT_TIMESTAMP,
                        'message', 'Edge function call failed: ' || SQLERRM,
                        'sqlstate', SQLSTATE
                    )
                )
            WHERE conversation_id = NEW.conversation_id;
        END;
    ELSE
        -- Log why the trigger didn't proceed
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
                'debug', 'Trigger skipped',
                'reason', CASE 
                    WHEN NEW.elevenlabs_conversation_id IS NULL THEN 'No elevenlabs_conversation_id'
                    WHEN NEW.status = 'processed' THEN 'Already processed'
                    WHEN NEW.status = 'fetching' THEN 'Currently fetching'
                    WHEN NEW.status = 'fetch_failed' THEN 'Previous fetch failed'
                    ELSE 'Unknown reason'
                END,
                'status', NEW.status,
                'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_conversations_trigger ON user_conversations;

-- Create new trigger
CREATE TRIGGER check_conversations_trigger
    AFTER INSERT OR UPDATE OF elevenlabs_conversation_id, status
    ON user_conversations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_conversations(); 