-- First, create a queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.conversation_processing_queue (
    queue_id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES public.user_conversations(conversation_id),
    elevenlabs_conversation_id TEXT NOT NULL,
    enqueued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    UNIQUE(conversation_id)
);

-- Create an index to quickly find unprocessed items
CREATE INDEX IF NOT EXISTS idx_conversation_queue_status
ON public.conversation_processing_queue(status)
WHERE status = 'pending';

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS check_conversations_trigger ON public.user_conversations;
DROP FUNCTION IF EXISTS public.trigger_check_conversations();

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.trigger_check_conversations()
RETURNS TRIGGER AS $$
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
            'debug', 'Conversation check trigger started - adding to queue',
            'status', NEW.status,
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
        )
    );

    -- Add the conversation to the processing queue
    INSERT INTO public.conversation_processing_queue(
        conversation_id,
        elevenlabs_conversation_id,
        status
    ) 
    VALUES (
        NEW.conversation_id,
        NEW.elevenlabs_conversation_id,
        'pending'
    )
    ON CONFLICT (conversation_id) 
    DO UPDATE SET
        elevenlabs_conversation_id = EXCLUDED.elevenlabs_conversation_id,
        status = 'pending',
        attempts = 0,
        enqueued_at = CURRENT_TIMESTAMP,
        processed_at = NULL,
        last_error = NULL;
    
    -- Log success
    INSERT INTO trigger_execution_logs (
        trigger_name,
        table_name,
        operation_type,
        row_id,
        execution_time,
        details
    ) VALUES (
        TG_NAME || '_queued',
        TG_TABLE_NAME,
        TG_OP,
        NEW.conversation_id,
        CURRENT_TIMESTAMP,
        jsonb_build_object(
            'status', 'Conversation added to processing queue',
            'conversation_id', NEW.conversation_id,
            'elevenlabs_conversation_id', NEW.elevenlabs_conversation_id
        )
    );
    
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

-- Create a function to process items in the queue (to be called by a scheduled job or manually)
CREATE OR REPLACE FUNCTION public.process_conversation_queue(max_items INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    total_processed INTEGER := 0;
    item RECORD;
    response_status INTEGER;
    response_body TEXT;
    edge_function_url TEXT;
    request_body TEXT;
    auth_token TEXT;
BEGIN
    -- Get auth token (only need to do this once)
    BEGIN
        auth_token := current_setting('app.edge_function_key', true);
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            auth_token := current_setting('supabase.anon_key', true);
        EXCEPTION WHEN OTHERS THEN
            auth_token := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv5Hq8olmcXJYeW7byJk';
        END;
    END;

    -- Edge function URL
    edge_function_url := 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/check-conversation';

    -- Process items in queue
    FOR item IN 
        SELECT * FROM public.conversation_processing_queue 
        WHERE status = 'pending'
        ORDER BY enqueued_at ASC
        LIMIT max_items
    LOOP
        -- Log processing start
        INSERT INTO trigger_execution_logs (
            trigger_name,
            table_name,
            operation_type,
            row_id,
            execution_time,
            details
        ) VALUES (
            'queue_processor',
            'conversation_processing_queue',
            'PROCESS',
            item.conversation_id,
            CURRENT_TIMESTAMP,
            jsonb_build_object(
                'debug', 'Processing queued conversation',
                'queue_id', item.queue_id,
                'elevenlabs_conversation_id', item.elevenlabs_conversation_id,
                'attempt', item.attempts + 1
            )
        );

        -- Update attempt count
        UPDATE public.conversation_processing_queue
        SET attempts = attempts + 1
        WHERE queue_id = item.queue_id;

        -- Set request body
        request_body := jsonb_build_object('conversation_id', item.conversation_id)::text;

        -- Try to process the item
        BEGIN
            -- This is a placeholder for where you would make the HTTP call
            -- We'll just log the attempt for now
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                'queue_processor_details',
                'conversation_processing_queue',
                'PROCESS',
                item.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'debug', 'Would call edge function here',
                    'url', edge_function_url,
                    'body', request_body,
                    'queue_id', item.queue_id
                )
            );

            -- Mark as processed
            UPDATE public.conversation_processing_queue
            SET 
                status = 'processed',
                processed_at = CURRENT_TIMESTAMP
            WHERE queue_id = item.queue_id;

            total_processed := total_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Log error
            INSERT INTO trigger_execution_logs (
                trigger_name,
                table_name,
                operation_type,
                row_id,
                execution_time,
                details
            ) VALUES (
                'queue_processor_error',
                'conversation_processing_queue',
                'PROCESS',
                item.conversation_id,
                CURRENT_TIMESTAMP,
                jsonb_build_object(
                    'error', SQLERRM,
                    'sqlstate', SQLSTATE,
                    'queue_id', item.queue_id
                )
            );
            
            -- Update last error
            UPDATE public.conversation_processing_queue
            SET last_error = SQLERRM
            WHERE queue_id = item.queue_id;
            
            -- If max attempts reached, mark as failed
            IF item.attempts >= 2 THEN
                UPDATE public.conversation_processing_queue
                SET 
                    status = 'failed',
                    processed_at = CURRENT_TIMESTAMP
                WHERE queue_id = item.queue_id;
            END IF;
        END;
    END LOOP;

    RETURN total_processed;
END;
$$ LANGUAGE plpgsql; 