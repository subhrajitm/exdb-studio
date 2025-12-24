# Database Setup Guide

This guide will help you set up the database schema for document tracking and chatbot functionality.

## Prerequisites

- A Supabase project
- Access to Supabase SQL Editor

## Step 1: Run the Migration

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/001_create_files_metadata.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

This will create:
- `files_metadata` table for tracking all user documents
- Indexes for performance
- Row Level Security (RLS) policies
- Auto-update trigger for `updated_at` timestamp

## Step 2: Verify the Setup

After running the migration, verify the table was created:

```sql
SELECT * FROM files_metadata LIMIT 1;
```

You should see the table structure with no errors.

## Step 3: Test RLS Policies

The migration includes Row Level Security policies that ensure:
- Users can only see their own files
- Users can only insert/update/delete their own files

These policies are automatically enforced by Supabase.

## Features Enabled

Once the migration is complete, the following features will be available:

1. **Document Tracking**: All uploaded files are automatically indexed
2. **Chatbot**: Ask questions about any uploaded file
3. **Document Stats**: View upload streaks, file counts, and access statistics
4. **File Search**: Search across all your documents

## Troubleshooting

### Error: "relation files_metadata does not exist"
- Make sure you ran the migration SQL script
- Check that you're connected to the correct Supabase project

### Error: "permission denied for table files_metadata"
- The RLS policies should allow access for authenticated users
- Verify your user is authenticated
- Check that the user_id matches your auth.users table

### Files not being tracked
- Check browser console for errors
- Verify the upload flow is calling the database insert
- Check Supabase logs for any database errors

## Next Steps

After setup:
1. Upload a file to test document tracking
2. Visit `/chatbot` to test the chatbot
3. Check `/dashboard` for document statistics

