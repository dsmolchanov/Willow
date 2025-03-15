-- Test script for the user_conversations trigger function
-- This script tests various scenarios for the trigger_check_conversations function

-- Setup: Create a temporary test schema and tables for isolation
BEGIN;

-- Create a temporary schema for our tests
DROP SCHEMA IF EXISTS test_trigger_schema CASCADE;
CREATE SCHEMA test_trigger_schema;

-- Set the search path to our test schema
SET search_path TO test_trigger_schema, public;

-- Create tables that mirror the real tables but are isolated for testing
CREATE TABLE test_user_conversations (
    conversation_id SERIAL PRIMARY KEY,
    clerk_id TEXT,
    agent_id TEXT,
    elevenlabs_conversation_id TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'unknown'
);

CREATE TABLE test_trigger_execution_logs (
    log_id SERIAL PRIMARY KEY,
    trigger_name TEXT,
    table_name TEXT,
    operation_type TEXT,
    row_id INTEGER,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Create a test mock table to store information about HTTP calls
CREATE TABLE test_http_calls (
    call_id SERIAL PRIMARY KEY,
    conversation_id INTEGER,
    attempt_number INTEGER,
    url TEXT,
    headers JSONB,
    request_body TEXT,
    call_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mock HTTP handler function - instead of trying to override net.http_post
-- This function doesn't return a table but just performs the mock logic
CREATE OR REPLACE FUNCTION test_trigger_schema.handle_mock_http_call(
    conversation_id INTEGER,
    url TEXT,
    headers JSONB,
    request_body TEXT
) RETURNS JSONB AS $$
DECLARE
    attempt_number INTEGER;
    response_data JSONB;
BEGIN
    -- Get the current attempt number for this conversation
    SELECT COUNT(*) + 1
    FROM test_http_calls
    WHERE test_http_calls.conversation_id = handle_mock_http_call.conversation_id
    INTO attempt_number;
    
    -- Log this HTTP call
    INSERT INTO test_http_calls (
        conversation_id,
        attempt_number,
        url,
        headers,
        request_body
    ) VALUES (
        conversation_id,
        attempt_number,
        url,
        headers,
        request_body
    );
    
    -- Also log to the main execution log for visibility
    INSERT INTO test_trigger_execution_logs (
        trigger_name,
        table_name,
        operation_type,
        row_id,
        details
    ) VALUES (
        'mock_http_function',
        'mock_http_call',
        'MOCK',
        conversation_id,
        jsonb_build_object(
            'url', url,
            'headers', headers,
            'request_body', request_body,
            'conversation_id', conversation_id,
            'attempt', attempt_number
        )
    );
    
    -- Handle different test cases
    IF conversation_id = 101 THEN
        -- Test case 101: Success on first attempt
        response_data := jsonb_build_object(
            'success', true,
            'id', conversation_id + 1000,
            'status', 200,
            'body', jsonb_build_object('message', 'Success simulation for test case 101')
        );
        
    ELSIF conversation_id = 102 THEN
        -- Test case 102: Fail first attempt, succeed on second
        IF attempt_number = 1 THEN
            -- First attempt fails
            response_data := jsonb_build_object(
                'success', false,
                'error', 'Simulated HTTP failure for test case 102, first attempt'
            );
        ELSE
            -- Second or later attempt succeeds
            response_data := jsonb_build_object(
                'success', true,
                'id', conversation_id + 1000,
                'status', 200,
                'body', jsonb_build_object('message', 'Success on retry for test case 102')
            );
        END IF;
        
    ELSIF conversation_id = 103 THEN
        -- Test case 103: Fail all attempts
        response_data := jsonb_build_object(
            'success', false,
            'error', 'Simulated HTTP failure for test case 103, persistent failure'
        );
        
    ELSE
        -- Default case: Success
        response_data := jsonb_build_object(
            'success', true,
            'id', conversation_id + 1000,
            'status', 200,
            'body', jsonb_build_object('message', 'Default success response')
        );
    END IF;
    
    RETURN response_data;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger function in our test schema
-- This version directly calls our mock handler instead of trying to use a mock HTTP function
CREATE OR REPLACE FUNCTION test_trigger_schema.trigger_check_conversations()
RETURNS TRIGGER AS $$
DECLARE
    request_id bigint;
    edge_function_url text := 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation';
    auth_token text;
    retry_count integer := 0;
    max_retries integer := 3;
    delay_seconds integer := 1; -- Shortened for tests
    call_success boolean := false;
    last_error text;
    start_time timestamp;
    mock_response jsonb;
    mock_request jsonb;
BEGIN
    -- Log trigger execution start
    INSERT INTO test_trigger_execution_logs (
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
        -- Set a mock auth token for testing
        auth_token := 'mock_auth_token_for_testing';
        mock_request := jsonb_build_object('conversation_id', NEW.conversation_id);

        -- Try multiple times with delays between attempts
        WHILE retry_count < max_retries AND NOT call_success LOOP
            retry_count := retry_count + 1;
            start_time := clock_timestamp();
            
            -- Log the current attempt
            INSERT INTO test_trigger_execution_logs (
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
            
            -- Call the mock HTTP handler directly
            BEGIN
                -- Call our mock handler with the request data
                mock_response := test_trigger_schema.handle_mock_http_call(
                    NEW.conversation_id,
                    edge_function_url,
                    jsonb_build_object(
                        'Authorization', 'Bearer ' || auth_token,
                        'Content-Type', 'application/json'
                    ),
                    mock_request::text
                );
                
                -- Check if the mock call was successful
                IF (mock_response->>'success')::boolean THEN
                    -- Extract data from successful response
                    request_id := (mock_response->>'id')::bigint;
                    
                    -- Log the successful call
                    INSERT INTO test_trigger_execution_logs (
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
                            'response', mock_response,
                            'attempt', retry_count,
                            'elapsed_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
                        )
                    );
                    
                    call_success := true;
                ELSE
                    -- Extract error from failed response
                    last_error := mock_response->>'error';
                    RAISE EXCEPTION '%', last_error;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                last_error := SQLERRM;
                
                -- Log the failed attempt
                INSERT INTO test_trigger_execution_logs (
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
            -- Use a shorter delay for tests
            IF NOT call_success AND retry_count < max_retries THEN
                PERFORM pg_sleep(delay_seconds);
            END IF;
        END LOOP;
        
        -- Log the final outcome
        IF call_success THEN
            -- Log the overall success
            INSERT INTO test_trigger_execution_logs (
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
            INSERT INTO test_trigger_execution_logs (
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
    INSERT INTO test_trigger_execution_logs (
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

-- Create the trigger on our test table
CREATE TRIGGER check_conversations_trigger
AFTER INSERT OR UPDATE ON test_user_conversations
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM 'processed')
EXECUTE FUNCTION test_trigger_schema.trigger_check_conversations();

-- Test cases
-- -----------------------------------------
-- 1. Insert a conversation that succeeds on first attempt (ID: 101)
INSERT INTO test_user_conversations(
    conversation_id, 
    clerk_id, 
    agent_id, 
    elevenlabs_conversation_id, 
    status
) VALUES (
    101,
    'test_clerk_101',
    'test_agent_101',
    'elevenlabs_101',
    'unknown'
);

-- 2. Insert a conversation that fails on first attempt but succeeds on second (ID: 102)
INSERT INTO test_user_conversations(
    conversation_id, 
    clerk_id, 
    agent_id, 
    elevenlabs_conversation_id, 
    status
) VALUES (
    102,
    'test_clerk_102',
    'test_agent_102',
    'elevenlabs_102',
    'unknown'
);

-- 3. Insert a conversation that fails all attempts (ID: 103)
INSERT INTO test_user_conversations(
    conversation_id, 
    clerk_id, 
    agent_id, 
    elevenlabs_conversation_id, 
    status
) VALUES (
    103,
    'test_clerk_103',
    'test_agent_103',
    'elevenlabs_103',
    'unknown'
);

-- 4. Insert a conversation with no elevenlabs_conversation_id (should skip processing)
INSERT INTO test_user_conversations(
    conversation_id, 
    clerk_id, 
    agent_id, 
    status
) VALUES (
    104,
    'test_clerk_104',
    'test_agent_104',
    'unknown'
);

-- 5. Insert a conversation with status 'processed' (should skip processing)
INSERT INTO test_user_conversations(
    conversation_id, 
    clerk_id, 
    agent_id, 
    elevenlabs_conversation_id, 
    status
) VALUES (
    105,
    'test_clerk_105',
    'test_agent_105',
    'elevenlabs_105',
    'processed'
);

-- Wait a moment for all the retries to complete
SELECT pg_sleep(10);

-- Verification queries
-- -----------------------------------------

-- Function to verify test results
CREATE OR REPLACE FUNCTION verify_test_results() RETURNS TEXT AS $$
DECLARE
    test_101_succeeded BOOLEAN;
    test_101_attempts INTEGER;
    test_102_succeeded BOOLEAN;
    test_102_attempts INTEGER;
    test_103_succeeded BOOLEAN;
    test_103_attempts INTEGER;
    test_104_processed BOOLEAN;
    test_105_processed BOOLEAN;
    test_summary TEXT;
    all_tests_passed BOOLEAN := TRUE;
BEGIN
    -- Check test case 101 (should succeed on first attempt)
    SELECT 
        EXISTS(SELECT 1 FROM test_trigger_execution_logs 
               WHERE trigger_name = 'check_conversations_trigger_edge_function' 
               AND row_id = 101
               AND (details->>'success')::BOOLEAN = TRUE),
        COALESCE(MAX((details->>'attempts_needed')::INTEGER), 0)
    INTO test_101_succeeded, test_101_attempts
    FROM test_trigger_execution_logs
    WHERE trigger_name = 'check_conversations_trigger_edge_function' 
    AND row_id = 101;
    
    IF NOT test_101_succeeded OR test_101_attempts != 1 THEN
        all_tests_passed := FALSE;
    END IF;

    -- Check test case 102 (should succeed on second attempt)
    SELECT 
        EXISTS(SELECT 1 FROM test_trigger_execution_logs 
               WHERE trigger_name = 'check_conversations_trigger_edge_function' 
               AND row_id = 102
               AND (details->>'success')::BOOLEAN = TRUE),
        COALESCE(MAX((details->>'attempts_needed')::INTEGER), 0)
    INTO test_102_succeeded, test_102_attempts
    FROM test_trigger_execution_logs
    WHERE trigger_name = 'check_conversations_trigger_edge_function' 
    AND row_id = 102;
    
    IF NOT test_102_succeeded OR test_102_attempts < 2 THEN
        all_tests_passed := FALSE;
    END IF;

    -- Check test case 103 (should fail all attempts)
    SELECT 
        EXISTS(SELECT 1 FROM test_trigger_execution_logs 
               WHERE trigger_name = 'check_conversations_trigger_edge_function' 
               AND row_id = 103
               AND (details->>'success')::BOOLEAN = FALSE),
        COALESCE(MAX((details->>'attempts')::INTEGER), 0)
    INTO test_103_succeeded, test_103_attempts
    FROM test_trigger_execution_logs
    WHERE trigger_name = 'check_conversations_trigger_edge_function' 
    AND row_id = 103;
    
    IF test_103_succeeded OR test_103_attempts != 3 THEN
        all_tests_passed := FALSE;
    END IF;

    -- Check test case 104 (should not be processed - no elevenlabs_conversation_id)
    SELECT 
        NOT EXISTS(SELECT 1 FROM test_trigger_execution_logs 
                  WHERE trigger_name = 'check_conversations_trigger_attempt' 
                  AND row_id = 104)
    INTO test_104_processed;
    
    IF NOT test_104_processed THEN
        all_tests_passed := FALSE;
    END IF;

    -- Check test case 105 (should not be processed - already 'processed')
    SELECT 
        NOT EXISTS(SELECT 1 FROM test_trigger_execution_logs 
                  WHERE trigger_name = 'check_conversations_trigger_attempt' 
                  AND row_id = 105)
    INTO test_105_processed;
    
    IF NOT test_105_processed THEN
        all_tests_passed := FALSE;
    END IF;

    -- Build test summary report
    test_summary := '
TEST RESULTS:
-------------
Test Case 101 (Success on first attempt): ' || 
        CASE WHEN test_101_succeeded AND test_101_attempts = 1 
             THEN 'PASSED ✓' 
             ELSE 'FAILED ✗ - ' || COALESCE(test_101_attempts::TEXT, 'N/A') || ' attempts, success: ' || test_101_succeeded::TEXT 
        END || '

Test Case 102 (Success on second attempt): ' || 
        CASE WHEN test_102_succeeded AND test_102_attempts >= 2 
             THEN 'PASSED ✓' 
             ELSE 'FAILED ✗ - ' || COALESCE(test_102_attempts::TEXT, 'N/A') || ' attempts, success: ' || test_102_succeeded::TEXT 
        END || '

Test Case 103 (Fail all attempts): ' || 
        CASE WHEN NOT test_103_succeeded AND test_103_attempts = 3 
             THEN 'PASSED ✓' 
             ELSE 'FAILED ✗ - ' || COALESCE(test_103_attempts::TEXT, 'N/A') || ' attempts, failure: ' || (NOT test_103_succeeded)::TEXT 
        END || '

Test Case 104 (Skip - No elevenlabs_conversation_id): ' || 
        CASE WHEN test_104_processed 
             THEN 'PASSED ✓' 
             ELSE 'FAILED ✗ - Was processed when it should have been skipped' 
        END || '

Test Case 105 (Skip - Already processed): ' || 
        CASE WHEN test_105_processed 
             THEN 'PASSED ✓' 
             ELSE 'FAILED ✗ - Was processed when it should have been skipped' 
        END || '

OVERALL RESULT: ' || 
        CASE WHEN all_tests_passed 
             THEN 'ALL TESTS PASSED ✓' 
             ELSE 'SOME TESTS FAILED ✗' 
        END || '
';

    RETURN test_summary;
END;
$$ LANGUAGE plpgsql;

-- Run the verification
SELECT verify_test_results();

-- Show detailed logs for debugging
SELECT 
    log_id,
    trigger_name,
    operation_type,
    row_id,
    execution_time,
    jsonb_pretty(details) AS details
FROM test_trigger_execution_logs
ORDER BY log_id;

-- Show HTTP call details
SELECT * FROM test_http_calls ORDER BY call_id;

-- Clean up (comment this out if you want to keep the test data for further inspection)
-- DROP SCHEMA test_trigger_schema CASCADE;

COMMIT; 