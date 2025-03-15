-- Complete test for conversation analysis trigger
-- This script will:
-- 1. Create the simplified trigger function
-- 2. Set up test cases
-- 3. Run the tests
-- 4. Report results

-- ======== PART 1: SIMPLIFIED TRIGGER IMPLEMENTATION ========

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
            'scenario_type', NEW.scenario_info->>'type',
            'test', NEW.analysis->>'test'
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
            'scenario_type', NEW.scenario_info->>'type',
            'test', NEW.analysis->>'test'
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
                    'error', SQLERRM,
                    'test', NEW.analysis->>'test'
                )
            );
            
            -- Use the get_edge_function_token function if available
            BEGIN
                -- Check if the function exists
                PERFORM 1 FROM pg_proc WHERE proname = 'get_edge_function_token';
                
                IF FOUND THEN
                    auth_token := public.get_edge_function_token();
                ELSE
                    -- Use a fallback token for testing
                    auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFob2JubWpmamh4Y2dtbXF4cmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4MzM0ODIsImV4cCI6MjA0MzQwOTQ4Mn0.InQYA84nOUgC7Qn-h5tMlTM2YoVGQD9RGR5_qxCgsXo';
                END IF;
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
                        'details', SQLERRM,
                        'test', NEW.analysis->>'test'
                    )
                );
                
                -- Use a fallback token for testing
                auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFob2JubWpmamh4Y2dtbXF4cmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4MzM0ODIsImV4cCI6MjA0MzQwOTQ4Mn0.InQYA84nOUgC7Qn-h5tMlTM2YoVGQD9RGR5_qxCgsXo';
            END;
        END;
        
        -- For test mode, don't actually call the edge function
        IF NEW.analysis->>'test' = 'true' THEN
            -- Simulate a request ID for testing
            request_id := floor(random() * 1000000 + 100000)::bigint;
            
            -- Log the simulated edge function call
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
                    'scenario_type', NEW.scenario_info->>'type',
                    'simulated', true,
                    'test', NEW.analysis->>'test'
                )
            );
        ELSE
            -- Call the actual edge function with correct headers
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
                    'scenario_type', NEW.scenario_info->>'type',
                    'test', NEW.analysis->>'test'
                )
            );
        END IF;
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
                'has_analysis', NEW.analysis IS NOT NULL,
                'test', NEW.analysis->>'test'
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
            'scenario_type', NEW.scenario_info->>'type',
            'test', 'true'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the analysis trigger
DROP TRIGGER IF EXISTS trigger_conversation_analysis ON public.user_conversations;
CREATE TRIGGER trigger_conversation_analysis
AFTER UPDATE OF analysis ON public.user_conversations
FOR EACH ROW
WHEN (
    (OLD.analysis IS NULL AND NEW.analysis IS NOT NULL) AND
    NEW.clerk_id IS NOT NULL
)
EXECUTE FUNCTION handle_conversation_analysis();

-- ======== PART 2: TEST CASES ========

-- Function to wait a bit for async operations
CREATE OR REPLACE FUNCTION wait_a_bit(seconds int) RETURNS void AS $$
BEGIN
  PERFORM pg_sleep(seconds);
END;
$$ LANGUAGE plpgsql;

-- First, clear any test data
DELETE FROM trigger_execution_logs WHERE table_name = 'user_conversations' AND details->>'test' = 'true';
DELETE FROM public.user_conversations WHERE conversation_id IN (99991, 99992);

-- Test 1: Onboarding scenario
INSERT INTO public.user_conversations (
    conversation_id, 
    clerk_id, 
    agent_id,
    elevenlabs_conversation_id,
    scenario_info,
    status,
    start_time
) VALUES (
    99991, -- Test ID
    'user_2uK9rSxLlHtOYIqSgQ3CKtIGMne', -- Using specific clerk_id
    'test_agent_id_1',
    'test_elevenlabs_convo_1',
    '{"type": "onboarding", "test": true}'::jsonb,
    'fetching',
    CURRENT_TIMESTAMP
);

-- Test 2: Lesson scenario
INSERT INTO public.user_conversations (
    conversation_id, 
    clerk_id, 
    agent_id,
    elevenlabs_conversation_id,
    scenario_info,
    status,
    start_time
) VALUES (
    99992, -- Test ID
    'user_2uK9rSxLlHtOYIqSgQ3CKtIGMne', -- Using specific clerk_id
    'test_agent_id_2',
    'test_elevenlabs_convo_2',
    '{"type": "practice", "test": true}'::jsonb,
    'fetching',
    CURRENT_TIMESTAMP
);

-- ======== PART 3: RUN TESTS ========

-- Test execution state before update
SELECT 'Test 1 - Before analysis update' AS test_state;
SELECT COUNT(*) AS trigger_logs_count 
FROM trigger_execution_logs 
WHERE row_id = 99991 AND details->>'test' = 'true';

-- Update with analysis to trigger the function
UPDATE public.user_conversations
SET analysis = '{"test_data": "This is test analysis data for onboarding", "test": true}'::jsonb
WHERE conversation_id = 99991;

-- Wait a moment for async operations to complete
SELECT wait_a_bit(1);

-- Check the logs
SELECT 'Test 1 - After analysis update' AS test_state;
SELECT 
    trigger_name,
    jsonb_pretty(details) AS details
FROM trigger_execution_logs 
WHERE row_id = 99991 AND details->>'test' = 'true'
ORDER BY execution_time ASC;

-- Test execution state before update
SELECT 'Test 2 - Before analysis update' AS test_state;
SELECT COUNT(*) AS trigger_logs_count 
FROM trigger_execution_logs 
WHERE row_id = 99992 AND details->>'test' = 'true';

-- Update with analysis to trigger the function
UPDATE public.user_conversations
SET analysis = '{"test_data": "This is test analysis data for lesson", "test": true}'::jsonb
WHERE conversation_id = 99992;

-- Wait a moment for async operations to complete
SELECT wait_a_bit(1);

-- Check the logs
SELECT 'Test 2 - After analysis update' AS test_state;
SELECT 
    trigger_name,
    jsonb_pretty(details) AS details
FROM trigger_execution_logs 
WHERE row_id = 99992 AND details->>'test' = 'true'
ORDER BY execution_time ASC;

-- ======== PART 4: TEST SUMMARY ========

SELECT 'TEST SUMMARY' AS report_section;
SELECT 
    scenario_info->>'type' AS scenario_type,
    COUNT(*) FILTER (WHERE trigger_name LIKE '%function_selected%' AND details->>'test' = 'true') AS function_selected_count,
    COUNT(*) FILTER (WHERE trigger_name LIKE '%edge_function%' AND details->>'test' = 'true') AS edge_function_called_count,
    MAX(details->>'edge_function') FILTER (WHERE trigger_name LIKE '%edge_function%' AND details->>'test' = 'true') AS edge_function_url
FROM trigger_execution_logs 
JOIN public.user_conversations ON trigger_execution_logs.row_id = user_conversations.conversation_id
WHERE user_conversations.conversation_id IN (99991, 99992)
GROUP BY scenario_info->>'type'
ORDER BY scenario_type;

-- Test validation: Check if the trigger correctly identified different functions
SELECT 'VALIDATION RESULT' AS report_section;
WITH edge_functions AS (
    SELECT 
        c.scenario_info->>'type' AS scenario_type,
        l.details->>'edge_function' AS edge_function_url
    FROM trigger_execution_logs l
    JOIN user_conversations c ON l.row_id = c.conversation_id
    WHERE l.trigger_name LIKE '%edge_function%'
    AND l.details->>'test' = 'true'
    AND c.conversation_id IN (99991, 99992)
)
SELECT 
    COUNT(DISTINCT edge_function_url) = 2 AS different_functions_for_different_scenarios,
    COUNT(*) FILTER (WHERE scenario_type = 'onboarding' AND edge_function_url LIKE '%onboarding_assess') AS onboarding_correct,
    COUNT(*) FILTER (WHERE scenario_type = 'practice' AND edge_function_url LIKE '%lesson_assess') AS lesson_correct
FROM edge_functions;

-- Clean up (uncomment if you want to keep the test data)
-- DELETE FROM public.user_conversations WHERE conversation_id IN (99991, 99992);
-- DELETE FROM trigger_execution_logs WHERE details->>'test' = 'true'; 