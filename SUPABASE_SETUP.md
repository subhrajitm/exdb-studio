# Supabase Integration Setup Guide

This guide will help you set up Supabase for the Exdata Studio application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in your project details:
   - Name: `exdbstudio` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose the closest region to your users
4. Click "Create new project" and wait for the project to be set up

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 3: Configure Environment Variables

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Replace the placeholder values with your actual Supabase credentials

## Step 4: Set Up Supabase Storage

1. In your Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Create a bucket named `files` with the following settings:
   - **Public bucket**: Unchecked (private)
   - **File size limit**: 100MB (or your preferred limit)
   - **Allowed MIME types**: Leave empty or specify: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/pdf`

4. Set up Storage Policies:
   - Go to **Storage** → **Policies** → Select the `files` bucket
   - Click "New Policy"
   - Create a policy that allows authenticated users to upload files:
     - Policy name: `Allow authenticated uploads`
     - Allowed operation: `INSERT`
     - Policy definition:
       ```sql
       (bucket_id = 'files'::text) AND (auth.role() = 'authenticated'::text)
       ```
   - Create another policy for reading:
     - Policy name: `Allow users to read their own files`
     - Allowed operation: `SELECT`
     - Policy definition:
       ```sql
       (bucket_id = 'files'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
       ```

## Step 5: Enable Email Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Make sure **Email** provider is enabled
3. Configure email templates if needed (optional)

## Step 6: Install Dependencies

The Supabase packages are already installed, but if you need to reinstall:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the following:
   - Register a new account at `/register`
   - Login at `/login`
   - Upload a file at `/upload` (requires authentication)

## File Structure

The Supabase integration includes:

- `lib/supabase/client.ts` - Browser client for client-side operations
- `lib/supabase/server.ts` - Server client for server-side operations
- `lib/supabase/middleware.ts` - Middleware for session management
- `middleware.ts` - Next.js middleware configuration
- `contexts/AuthContext.tsx` - React context for authentication state

## Features Implemented

✅ User authentication (sign up, sign in, sign out)
✅ Protected routes (upload page requires authentication)
✅ File upload to Supabase Storage
✅ Session management with middleware
✅ Auth state management with React Context

## Troubleshooting

### Authentication not working
- Verify your environment variables are set correctly
- Check that the Supabase project is active
- Ensure email authentication is enabled in Supabase dashboard

### File upload fails
- Verify the `files` bucket exists in Supabase Storage
- Check that storage policies are set up correctly
- Ensure the user is authenticated before uploading

### Session not persisting
- Check that cookies are enabled in your browser
- Verify middleware is properly configured
- Check browser console for any errors

## Next Steps

Consider implementing:
- Email verification
- Password reset functionality
- File metadata storage in database
- File listing and management
- File sharing capabilities

