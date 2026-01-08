# Production Database Migration Guide

If you're seeing "column does not exist" errors in production, you need to run the migration on your production database.

## For Render.com Deployment

### Option 1: Run Migration via Render Shell (Recommended)

1. Go to your Render dashboard
2. Select your backend service
3. Click on "Shell" tab
4. Run:
   ```bash
   cd /opt/render/project/src
   node backend/scripts/migrate-resources-personalization.js
   ```

### Option 2: Add Migration to Startup Script

Add to your Render build/start command or create a startup script:

```bash
# In package.json or Render start command
node backend/scripts/migrate-resources-personalization.js && node backend/server.js
```

### Option 3: One-Time Manual SQL Query

If you have direct database access, run this SQL:

```sql
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS test_types TEXT[],
ADD COLUMN IF NOT EXISTS severity_levels TEXT[],
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_resources_test_types 
ON resources USING GIN(test_types);

CREATE INDEX IF NOT EXISTS idx_resources_severity_levels 
ON resources USING GIN(severity_levels);
```

## Verify Migration

After running the migration, verify it worked:

```bash
node backend/scripts/check-resources-setup.js
```

Or check directly in your database:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'resources' 
AND column_name IN ('test_types', 'severity_levels', 'priority');
```

You should see all 3 columns listed.

## Note

The application is now backward-compatible and will work **without** these columns, but personalization features won't be available until the migration is run.
