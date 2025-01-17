-- Add error_details column to scenarios table
ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS error_details jsonb; 