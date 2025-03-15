#!/bin/bash

# Run tests script for the conversation trigger function
# This script needs the Supabase CLI installed

# Set environment variables (modify these according to your setup)
SUPABASE_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"
TEST_FILE="./tests/test_conversation_trigger.sql"

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

echo "Running tests from $TEST_FILE..."
echo "====================================="

# Run the tests using psql
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f "$TEST_FILE"

# Check the exit status
if [ $? -eq 0 ]; then
    echo "====================================="
    echo "Tests executed successfully!"
else
    echo "====================================="
    echo "Error: Tests failed to execute properly."
    exit 1
fi 