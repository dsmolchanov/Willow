-- Fix the trigger chain between onboarding_assess and traits_skills

-- First, drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_conversation_traits ON public.user_conversations;
DROP TRIGGER IF EXISTS trigger_user_traits ON public.user_traits;
DROP FUNCTION IF EXISTS public.handle_conversation_traits() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_traits() CASCADE;

-- 1. Create the analysis trigger function (first in the chain)
CREATE OR REPLACE FUNCTION public.handle_conversation_analysis()
RETURNS TRIGGER AS $$
DECLARE
    request_id bigint;
    edge_function_url text;
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
            'debug', 'Traits trigger started',
            'clerk_id', NEW.clerk_id,
            'has_analysis', NEW.analysis IS NOT NULL,
            'scenario_type', NEW.scenario_info->>'type'
        )
    );

    -- Determine which edge function to call
    edge_function_url := CASE 
        WHEN NEW.scenario_info->>'type' = 'onboarding' THEN 
            'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/onboarding_assess'
        ELSE 
            'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/lesson_assess'
    END;

    -- Only proceed if we have required data
    IF NEW.clerk_id IS NOT NULL AND NEW.analysis IS NOT NULL THEN
        -- Call the edge function with correct headers
        SELECT net.http_post(
            url := edge_function_url,
            body := jsonb_build_object(
                'clerk_id', NEW.clerk_id,
                'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
            ),
            params := '{}'::jsonb,
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || current_setting('app.edge_function_key', true),
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
        TG_NAME,
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

-- 2. Create the user traits trigger function (second in the chain)
CREATE OR REPLACE FUNCTION public.handle_user_traits()
RETURNS TRIGGER AS $$
DECLARE
    request_id bigint;
    edge_url text := 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/traits_skills';
    request_body jsonb;
    conversation_count int;
BEGIN
    -- Set statement timeout for longer operations
    SET LOCAL statement_timeout = '30s';
    
    -- Count existing conversations for this clerk_id
    SELECT COUNT(*) INTO conversation_count
    FROM user_conversations 
    WHERE clerk_id = NEW.clerk_id;

    -- Log the trigger start
    INSERT INTO traits_trigger_debug_log (clerk_id, step, details)
    VALUES (
        NEW.clerk_id,
        'TRIGGER_START',
        jsonb_build_object(
            'clerk_id', NEW.clerk_id,
            'conversation_count', conversation_count,
            'trait_id', NEW.id,
            'timestamp', clock_timestamp()
        )
    );

    -- Prepare request body
    request_body := jsonb_build_object(
        'clerk_id', NEW.clerk_id,
        'action_type', CASE WHEN conversation_count = 1 THEN 'initial_calculation' ELSE 'practice_update' END,
        'trait_id', NEW.id
    );

    -- Log request preparation
    INSERT INTO traits_trigger_debug_log (clerk_id, step, details)
    VALUES (
        NEW.clerk_id,
        'REQUEST_PREPARED',
        jsonb_build_object(
            'url', edge_url,
            'body', request_body,
            'timestamp', clock_timestamp()
        )
    );

    -- Call the edge function using the correct net.http_post function
    SELECT net.http_post(
        url := edge_url,
        body := request_body,
        params := '{}'::jsonb,
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.edge_function_key', true),
            'Content-Type', 'application/json'
        ),
        timeout_milliseconds := 5000
    ) INTO request_id;

    -- Log the request ID
    INSERT INTO traits_trigger_debug_log (clerk_id, step, details)
    VALUES (
        NEW.clerk_id,
        'REQUEST_SENT',
        jsonb_build_object(
            'request_id', request_id,
            'timestamp', clock_timestamp()
        )
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log any unexpected errors
    INSERT INTO traits_trigger_debug_log (clerk_id, step, details)
    VALUES (
        NEW.clerk_id,
        'UNEXPECTED_ERROR',
        jsonb_build_object(
            'error', SQLERRM,
            'state', SQLSTATE,
            'context', 'Main trigger execution',
            'timestamp', clock_timestamp()
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the user traits trigger - this should fire when a new row is added to user_traits
CREATE TRIGGER trigger_user_traits
AFTER INSERT ON public.user_traits
FOR EACH ROW
EXECUTE FUNCTION handle_user_traits();

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