# Conversation Trigger Tests

This directory contains tests for the conversation trigger function.

## How to Run the Tests

Since the tests interact with the Supabase database, you'll need to run them using the Supabase SQL Editor.

### Using Supabase Studio SQL Editor

1. Open your Supabase project in the browser
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of `test_conversation_trigger.sql` into the SQL Editor
5. Run the query by clicking the "Run" button
6. Review the results - the test summary will appear in the results panel

## Test Cases

The test file contains the following test cases:

1. **Test Case 101**: Conversation that succeeds on first attempt
2. **Test Case 102**: Conversation that fails on first attempt but succeeds on second attempt
3. **Test Case 103**: Conversation that fails all attempts (should max out at 3 attempts)
4. **Test Case 104**: Conversation with no elevenlabs_conversation_id (should be skipped)
5. **Test Case 105**: Conversation already marked as 'processed' (should be skipped)

## Expected Results

After running the tests, you should see output that looks similar to this:

```
TEST RESULTS:
-------------
Test Case 101 (Success on first attempt): PASSED ✓

Test Case 102 (Success on second attempt): PASSED ✓

Test Case 103 (Fail all attempts): PASSED ✓

Test Case 104 (Skip - No elevenlabs_conversation_id): PASSED ✓

Test Case 105 (Skip - Already processed): PASSED ✓

OVERALL RESULT: ALL TESTS PASSED ✓
```

If any test fails, the summary will indicate which test failed and why.

## Understanding the Test Script

1. The script creates a temporary test schema to avoid affecting your production data
2. It creates test versions of the `user_conversations` and `trigger_execution_logs` tables
3. It mocks the HTTP call to the edge function to simulate different scenarios
4. It runs test cases and verifies the results
5. The mock is designed to:
   - Succeed immediately for conversation_id 101
   - Fail on first attempt but succeed on second for conversation_id 102
   - Fail on all attempts for conversation_id 103

## Making Changes to the Trigger

If you need to modify the trigger function after running these tests, make sure to apply similar changes to your production trigger function at `/migrations/trigger_with_retries.sql`. 