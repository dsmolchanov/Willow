-- Enable the http extension
CREATE EXTENSION IF NOT EXISTS http;

-- Create configuration table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value text NOT NULL
);

-- Insert configuration values
INSERT INTO public.app_settings (key, value)
VALUES 
    ('edge_function_url', 'https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1'),
    ('anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFob2JubWpmanh4Y2dtbXF4cmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5MjE1NzAsImV4cCI6MjAxODQ5NzU3MH0.Rl5zTFfQQyxQYwZJvYBxZQhwqh3tLWVVCciCJHe_Pxw')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_scenario()
RETURNS TRIGGER AS $$
DECLARE
  response http_response;
  request_url text;
  request_body jsonb;
  edge_function_url text;
  anon_key text;
BEGIN
  -- Get configuration values from the settings table
  SELECT value INTO edge_function_url FROM public.app_settings WHERE key = 'edge_function_url';
  SELECT value INTO anon_key FROM public.app_settings WHERE key = 'anon_key';
  
  IF edge_function_url IS NULL THEN
    RAISE EXCEPTION 'Edge function URL is not configured';
  END IF;

  request_body := jsonb_build_object(
    'scenario_id', NEW.scenario_id,
    'language', NEW.language
  );

  SELECT status, content::text
  INTO response
  FROM http_post(
    edge_function_url || '/create_elevenlabs_agent',
    request_body::text,
    'application/json',
    ARRAY[
      ('Authorization', 'Bearer ' || anon_key)::http_header
    ]
  );

  -- Log the response for debugging
  RAISE NOTICE 'Edge function response: % %', response.status, response.content;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_elevenlabs_agent ON public.scenarios;
CREATE TRIGGER trigger_create_elevenlabs_agent
  AFTER INSERT ON public.scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_scenario();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_scenario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_scenario() TO service_role;

-- Grant access to the settings table
GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT ON public.app_settings TO service_role;