-- Create files_metadata table for tracking all user documents
CREATE TABLE IF NOT EXISTS files_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT,
  original_name TEXT,
  
  -- Data schema (for quick access without parsing)
  column_headers JSONB,
  row_count INTEGER,
  sample_data JSONB, -- First 10 rows for quick preview
  
  -- Indexing & search
  full_text_content TEXT, -- For full-text search
  
  -- Metadata
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  tags TEXT[],
  category TEXT,
  
  -- Relationships
  related_files UUID[],
  parent_file_id UUID REFERENCES files_metadata(id),
  
  -- Status
  is_indexed BOOLEAN DEFAULT FALSE,
  indexing_status TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files_metadata(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_tags ON files_metadata USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_files_category ON files_metadata(category);
CREATE INDEX IF NOT EXISTS idx_files_file_path ON files_metadata(file_path);
CREATE INDEX IF NOT EXISTS idx_files_is_indexed ON files_metadata(is_indexed);

-- Full-text search index (if pg_trgm extension is available)
-- CREATE INDEX IF NOT EXISTS idx_files_fulltext ON files_metadata USING GIN(to_tsvector('english', full_text_content));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_files_metadata_updated_at 
    BEFORE UPDATE ON files_metadata 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE files_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own files
CREATE POLICY "Users can view own files"
    ON files_metadata FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own files
CREATE POLICY "Users can insert own files"
    ON files_metadata FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files"
    ON files_metadata FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
    ON files_metadata FOR DELETE
    USING (auth.uid() = user_id);

