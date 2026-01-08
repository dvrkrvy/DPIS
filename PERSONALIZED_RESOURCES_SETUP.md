# Personalized Resources Setup Guide

This guide explains how to set up and use the personalized resources feature that matches resources to users based on their last 3 screening test results.

## Overview

The personalized resources system automatically suggests relevant videos and audiobooks based on:
- **Test Type**: PHQ9 (Depression), GAD7 (Anxiety), or GHQ (General Health)
- **Severity Level**: minimal, mild, moderate, moderately_severe, or severe
- **Priority**: Resources are ranked by relevance priority

## Setup Steps

### 1. Run Database Migration

First, add the necessary columns to the resources table:

```bash
cd backend
node scripts/migrate-resources-personalization.js
```

This will add:
- `test_types` (TEXT[]) - Array of test types this resource is relevant for
- `severity_levels` (TEXT[]) - Array of severity levels this resource targets
- `priority` (INTEGER) - Priority/relevance score (higher = more relevant)

### 2. Seed Personalized Resources

Add 150+ curated resources (videos and audiobooks) to your database:

```bash
cd backend
node scripts/seed-personalized-resources.js
```

This script will add:
- ~60 resources for PHQ9 (Depression)
- ~50 resources for GAD7 (Anxiety)
- ~30 resources for GHQ (General Health)
- ~20 cross-test resources (applicable to multiple tests)

**Total: 150+ resources** covering all severity levels

### 3. Restart Your Backend Server

After running the migration and seed script, restart your backend:

```bash
npm start
# or
node server.js
```

## How It Works

### Backend Logic

1. When a user visits the Resources page with `personalized=true`:
   - The system fetches their last 3 screening test results
   - Resources are matched if:
     - Resource's `test_types` array contains the user's test type
     - AND resource's `severity_levels` array contains the user's severity level
   - Results are sorted by priority (highest first), then by date

2. If no test results exist:
   - General resources (without test-specific targeting) are shown
   - User is encouraged to take screening tests

### Frontend Features

1. **Personalized View (Default for Students)**:
   - Resources are automatically filtered based on test results
   - Shows a badge indicating personalization is active
   - Displays count of test results used for personalization

2. **All Resources View**:
   - Toggle switch to view all resources
   - Standard filtering (category, content type, search) still works

3. **Smart Messages**:
   - If user hasn't taken tests: Shows prompt to take screening test
   - If user has test results: Shows which results are being used

## Resource Categories

### By Test Type

**PHQ9 (Depression) Resources:**
- Minimal/Mild (0-9): Educational content, wellness tips
- Moderate (10-14): CBT techniques, coping strategies
- Moderately Severe/Severe (15-27): Crisis support, professional help info

**GAD7 (Anxiety) Resources:**
- Minimal/Mild (0-9): Breathing exercises, relaxation techniques
- Moderate (10-14): CBT for anxiety, exposure therapy basics
- Severe (15-21): Panic attack management, professional treatment

**GHQ (General Health) Resources:**
- Minimal/Mild (0-6): General wellness, resilience building
- Moderate (7-9): Stress management, self-care practices
- Severe (10-12): Professional help, crisis resources

### By Content Type

- **Video**: YouTube embedded videos
- **Audio**: Guided meditations, audiobooks, relaxation sounds

## API Endpoints

### Get Personalized Resources

```
GET /api/resources?personalized=true
```

**Response:**
```json
{
  "resources": [...],
  "personalized": true,
  "testResultsCount": 3
}
```

### Get All Resources (with filters)

```
GET /api/resources?category=video&contentType=depression&search=meditation
```

## Database Schema

### Resources Table (Updated)

```sql
CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'video', 'audio', 'article', 'guide'
    content_type VARCHAR(50), -- 'depression', 'anxiety', 'general'
    url VARCHAR(500),
    file_path VARCHAR(500),
    tags TEXT[],
    test_types TEXT[], -- NEW: ['PHQ9', 'GAD7', 'GHQ']
    severity_levels TEXT[], -- NEW: ['minimal', 'mild', 'moderate', 'severe']
    priority INTEGER DEFAULT 0, -- NEW: Relevance score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

## Testing

1. **As a Student**:
   - Take at least one screening test (PHQ9, GAD7, or GHQ)
   - Navigate to Resources page
   - Verify personalized resources appear
   - Toggle between personalized and all resources

2. **Verify Matching**:
   - Take PHQ9 test with moderate depression
   - Check that resources for "PHQ9" + "moderate" appear
   - Take GAD7 test with mild anxiety
   - Check that resources for both tests appear

## Troubleshooting

### No Personalized Resources Showing

1. Check if user has taken screening tests:
   ```sql
   SELECT COUNT(*) FROM screening_results WHERE user_id = 'USER_ID';
   ```

2. Verify resources have test_types and severity_levels:
   ```sql
   SELECT COUNT(*) FROM resources 
   WHERE test_types IS NOT NULL 
   AND array_length(test_types, 1) > 0;
   ```

3. Check resource matching:
   ```sql
   SELECT * FROM resources 
   WHERE 'PHQ9' = ANY(test_types) 
   AND 'moderate' = ANY(severity_levels);
   ```

### Resources Not Matching Correctly

- Verify test results have correct `test_type` and `severity` values
- Check that resource `test_types` and `severity_levels` arrays are populated
- Ensure severity level names match exactly (case-sensitive)

## Adding New Resources

To add a new personalized resource:

```javascript
{
  title: 'Resource Title',
  description: 'Resource description',
  category: 'video', // or 'audio'
  content_type: 'depression', // or 'anxiety', 'general'
  url: 'https://youtube.com/embed/VIDEO_ID',
  tags: ['tag1', 'tag2'],
  test_types: ['PHQ9'], // or ['GAD7'], ['GHQ'], or multiple
  severity_levels: ['moderate', 'severe'], // Can target multiple levels
  priority: 8, // 0-10, higher = more relevant
  is_active: true
}
```

## Future Enhancements

- Machine learning to improve resource recommendations
- User feedback system (thumbs up/down on resources)
- Resource viewing history and personalized ordering
- A/B testing different resource recommendations
- Integration with user progress tracking

## Notes

- Resources are limited to 50 results in personalized mode to ensure relevance
- All resources maintain backward compatibility (can be viewed without personalization)
- Resources can target multiple test types and severity levels
- Priority scores help rank resources when multiple matches exist
