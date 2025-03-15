-- Test script for simplified conversation analysis trigger
-- This script will create test conversations and verify the trigger execution

-- First, clear any test data
DELETE FROM trigger_execution_logs WHERE table_name = 'user_conversations' AND details->>'test' = 'true';

-- Function to wait a bit for async operations
CREATE OR REPLACE FUNCTION wait_a_bit(seconds int) RETURNS void AS $$
BEGIN
  PERFORM pg_sleep(seconds);
END;
$$ LANGUAGE plpgsql;

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
WHERE row_id = 99991
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
WHERE row_id = 99992
ORDER BY execution_time ASC;

-- Test summary
SELECT 
    scenario_info->>'type' AS scenario_type,
    COUNT(*) FILTER (WHERE trigger_name LIKE '%function_selected%') AS function_selected_count,
    COUNT(*) FILTER (WHERE trigger_name LIKE '%edge_function%') AS edge_function_called_count,
    MAX(details->>'edge_function') FILTER (WHERE trigger_name LIKE '%edge_function%') AS edge_function_url
FROM trigger_execution_logs 
JOIN public.user_conversations ON trigger_execution_logs.row_id = user_conversations.conversation_id
WHERE user_conversations.conversation_id IN (99991, 99992)
GROUP BY scenario_info->>'type'
ORDER BY scenario_type;

-- Clean up (comment out if you want to keep the test data)
-- DELETE FROM public.user_conversations WHERE conversation_id IN (99991, 99992);
-- DELETE FROM trigger_execution_logs WHERE row_id IN (99991, 99992); 