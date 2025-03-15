-- Simplified triggers for conversation analysis
-- Reflecting the division of legacy traits_skills into onboarding_assess and lesson_assess

-- First, drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_conversation_traits ON public.user_conversations;
DROP TRIGGER IF EXISTS trigger_user_traits ON public.user_traits;
DROP FUNCTION IF EXISTS public.handle_conversation_traits() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_traits() CASCADE;

-- Create the analysis trigger function that directly calls the appropriate edge function
CREATE OR REPLACE FUNCTION public.handle_conversation_analysis()
RETURNS TRIGGER AS $$
DECLARE
    request_id bigint;
    edge_function_url text;
    auth_token text;
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
        TG_NAME,
        TG_TABLE_NAME,
        TG_OP,
        NEW.conversation_id,
        CURRENT_TIMESTAMP,
        jsonb_build_object(
            'debug', 'Conversation analysis trigger started',
            'clerk_id', NEW.clerk_id,
            'has_analysis', NEW.analysis IS NOT NULL,
            'scenario_type', NEW.scenario_info->>'type'
        )
    );

    -- Determine which edge function to call based on scenario type
    edge_function_url := CASE 
        WHEN NEW.scenario_info->>'type' = 'onboarding' THEN 
            'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/onboarding_assess'
        ELSE 
            'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/lesson_assess'
    END;

    -- Log which edge function will be called
    INSERT INTO trigger_execution_logs (
        trigger_name,
        table_name,
        operation_type,
        row_id,
        execution_time,
        details
    ) VALUES (
        TG_NAME || '_function_selected',
        TG_TABLE_NAME,
        TG_OP,
        NEW.conversation_id,
        CURRENT_TIMESTAMP,
        jsonb_build_object(
            'debug', 'Selected appropriate edge function',
            'edge_function', edge_function_url,
            'scenario_type', NEW.scenario_info->>'type'
        )
    );

    -- Only proceed if we have required data
    IF NEW.clerk_id IS NOT NULL AND NEW.analysis IS NOT NULL THEN
        -- Try to get the authorization token
        BEGIN
            auth_token := current_setting('app.edge_function_key', true);
        EXCEPTION WHEN OTHERS THEN
            -- If the setting isn't available, use a hardcoded token
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                TG_NAME || '_auth_fallback',
                TG_TABLE_NAME,
                TG_OP,
                NEW.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'debug', 'Falling back to hardcoded auth token',
                    'error', SQLERRM
                )
            );
            
            -- Use the get_edge_function_token function if available
            BEGIN
                auth_token := public.get_edge_function_token();
            EXCEPTION WHEN OTHERS THEN
                -- Log error if both methods fail
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
                        'error', 'Failed to get auth token by any method',
                        'details', SQLERRM
                    )
                );
                RETURN NEW;
            END;
        END;
        
        -- Call the edge function with correct headers
        SELECT net.http_post(
            url := edge_function_url,
            body := jsonb_build_object(
                'clerk_id', NEW.clerk_id,
                'conversation_id', NEW.conversation_id,
                'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
            ),
            params := '{}'::jsonb,
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || auth_token,
                'Content-Type', 'application/json'
            ),
            timeout_milliseconds := 5000
        ) INTO request_id;
        
        -- Log the edge function call
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
                'request_id', request_id,
                'conversation_id', NEW.conversation_id,
                'clerk_id', NEW.clerk_id,
                'edge_function', edge_function_url,
                'scenario_type', NEW.scenario_info->>'type'
            )
        );
    ELSE
        -- Log if we're skipping due to missing data
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
                'debug', 'Skipping edge function call - missing required data',
                'has_clerk_id', NEW.clerk_id IS NOT NULL,
                'has_analysis', NEW.analysis IS NOT NULL
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
        TG_NAME || '_error',
        TG_TABLE_NAME,
        TG_OP,
        NEW.conversation_id,
        CURRENT_TIMESTAMP,
        jsonb_build_object(
            'error', SQLERRM,
            'sqlstate', SQLSTATE,
            'scenario_type', NEW.scenario_info->>'type'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the analysis trigger
CREATE TRIGGER trigger_conversation_analysis
AFTER UPDATE OF analysis ON public.user_conversations
FOR EACH ROW
WHEN (
    (OLD.analysis IS NULL AND NEW.analysis IS NOT NULL) AND
    NEW.clerk_id IS NOT NULL
)
EXECUTE FUNCTION handle_conversation_analysis();

-- Add a debug function to check what triggers exist for a table
CREATE OR REPLACE FUNCTION public.list_table_triggers(table_name text)
RETURNS TABLE (
    trigger_name text,
    trigger_event text,
    trigger_action text,
    trigger_function text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tgname::text AS trigger_name,
        CASE 
            WHEN t.tgtype & 2 > 0 THEN 'BEFORE' 
            WHEN t.tgtype & 16 > 0 THEN 'AFTER' 
            WHEN t.tgtype & 64 > 0 THEN 'INSTEAD OF' 
        END || ' ' ||
        CASE 
            WHEN t.tgtype & 4 > 0 THEN 'INSERT' 
            WHEN t.tgtype & 8 > 0 THEN 'DELETE' 
            WHEN t.tgtype & 16 > 0 THEN 'UPDATE' 
            WHEN t.tgtype & 32 > 0 THEN 'TRUNCATE' 
        END AS trigger_event,
        CASE 
            WHEN t.tgtype & 1 > 0 THEN 'FOR EACH ROW' 
            ELSE 'FOR EACH STATEMENT' 
        END AS trigger_action,
        p.proname::text AS trigger_function
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname || '.' || c.relname = table_name
    AND NOT t.tgisinternal;
END;
$$ LANGUAGE plpgsql; 