-- Diagnostic script to identify available HTTP functions and extensions
-- Create a temporary table to store our diagnostic information
CREATE TEMP TABLE diagnostics (
    check_name TEXT,
    result JSONB
);

-- Check what extensions are installed
INSERT INTO diagnostics (check_name, result)
SELECT 
    'installed_extensions',
    jsonb_agg(jsonb_build_object(
        'name', extname,
        'version', extversion,
        'schema', extnamespace::regnamespace::text
    ))
FROM pg_extension;

-- Check if the 'net' schema exists
INSERT INTO diagnostics (check_name, result)
SELECT 
    'net_schema_exists',
    jsonb_build_object(
        'exists', (SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net'))
    );

-- If the 'net' schema exists, check what functions are available in it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
        INSERT INTO diagnostics (check_name, result)
        SELECT 
            'net_schema_functions',
            jsonb_agg(jsonb_build_object(
                'name', p.proname,
                'arguments', pg_get_function_arguments(p.oid),
                'result_type', pg_get_function_result(p.oid)
            ))
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'net';
    ELSE
        INSERT INTO diagnostics (check_name, result)
        VALUES ('net_schema_functions', '{"error": "net schema does not exist"}');
    END IF;
END $$;

-- Check if any HTTP-related functions exist in any schema
INSERT INTO diagnostics (check_name, result)
SELECT 
    'http_functions',
    jsonb_agg(jsonb_build_object(
        'schema', n.nspname,
        'name', p.proname,
        'arguments', pg_get_function_arguments(p.oid),
        'result_type', pg_get_function_result(p.oid)
    ))
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    p.proname LIKE '%http%' AND
    n.nspname NOT IN ('pg_catalog', 'information_schema');

-- Check specifically for http_post or http_request functions
INSERT INTO diagnostics (check_name, result)
SELECT 
    'http_post_functions',
    jsonb_agg(jsonb_build_object(
        'schema', n.nspname,
        'name', p.proname,
        'arguments', pg_get_function_arguments(p.oid),
        'result_type', pg_get_function_result(p.oid)
    ))
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    (p.proname = 'http_post' OR p.proname = 'http_request') AND
    n.nspname NOT IN ('pg_catalog', 'information_schema');

-- Create a table to store the diagnostic results permanently
CREATE TABLE IF NOT EXISTS system_diagnostics (
    id SERIAL PRIMARY KEY,
    check_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    diagnostics JSONB
);

-- Store all our diagnostics results
INSERT INTO system_diagnostics (diagnostics)
SELECT jsonb_object_agg(check_name, result) FROM diagnostics;

-- Drop the temporary table
DROP TABLE diagnostics;

-- Output the results for immediate viewing
SELECT * FROM system_diagnostics ORDER BY id DESC LIMIT 1;

-- Output a hint on how to view the results later
DO $$
BEGIN
    RAISE NOTICE 'Diagnostic information stored in system_diagnostics table. You can view it with: SELECT * FROM system_diagnostics ORDER BY id DESC LIMIT 1;';
END $$; 