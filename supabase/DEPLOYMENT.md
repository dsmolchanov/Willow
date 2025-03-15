# Deployment Guide: Conversation Trigger with Retry Logic

This guide describes how to deploy the enhanced trigger function that automatically calls the check-conversation edge function with retry logic.

## Overview

The enhanced trigger function is designed to:

1. Call the edge function on conversation creation/update
2. Try up to 3 times with 10-second delays between attempts
3. Log detailed information about each attempt
4. Skip processing for conversations without an ElevenLabs ID or already marked as processed

## Testing Before Deployment

Before deploying to production, you should run the tests to ensure the trigger works as expected:

1. Open the Supabase SQL Editor
2. Copy and paste the contents of `/supabase/tests/test_conversation_trigger.sql`
3. Run the query
4. Verify all tests pass

## Deployment Steps

### 1. Deploy the Trigger Function

1. Open the Supabase SQL Editor
2. Copy and paste the contents of `/supabase/migrations/trigger_with_retries.sql`
3. Run the query to create/replace the trigger function and create the trigger

### 2. Verify the Deployment

After deploying, verify that the trigger is working correctly:

1. Insert a test record in the `user_conversations` table:
   ```sql
   INSERT INTO user_conversations(
       clerk_id, 
       agent_id, 
       elevenlabs_conversation_id, 
       status
   ) VALUES (
       'test_clerk',
       'test_agent',
       'test_elevenlabs_id',
       'unknown'
   );
   ```

2. Check the trigger execution logs:
   ```sql
   SELECT * FROM trigger_execution_logs
   WHERE trigger_name LIKE 'check_conversations_trigger%'
   ORDER BY execution_time DESC
   LIMIT 20;
   ```

3. Verify that:
   - The initial log entry was created
   - Multiple attempt logs appear if needed
   - The edge function was called successfully

## Troubleshooting

If the trigger is not working as expected, check:

1. **Edge Function URL**: Make sure the URL is correct in the trigger function
2. **Authorization**: Check that the edge function key is correctly set in Supabase settings
3. **Network Access**: Ensure the Supabase database can access the edge function URL
4. **HTTP Function**: Verify the `net.http_post` function exists and is accessible

### Common Issues

#### 1. Missing HTTP Function
If the trigger logs show an error about `net.http_post` not existing, you need to install the pg_net extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

#### 2. Authorization Issues
If the edge function returns an authorization error (401), check:

```sql
SELECT current_setting('app.edge_function_key', true);
```

If this returns an error, set the key:

```sql
ALTER DATABASE postgres SET app.edge_function_key TO 'your-key-here';
```

## Rollback Plan

If you need to roll back the changes, run:

```sql
DROP TRIGGER IF EXISTS check_conversations_trigger ON user_conversations;
```

## Testing After Deployment

After deploying to production, you should test with a real conversation:

1. Create a conversation through your application
2. Check the trigger logs to ensure retries work as expected
3. Verify that the conversation data is eventually processed correctly 