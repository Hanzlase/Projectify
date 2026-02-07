# Cohere Model Configuration

## Overview
The Cohere AI model is now centralized using an environment variable, making it easy to update the model in one place.

## Environment Variable
Add this to your `.env` file:

```env
COHERE_MODEL="command-r-03-2025"
```

**Note:** The model name should be `command-r-03-2025` (not `command-a-03-2025`). This is Cohere's latest command model as of 2025.

## Files Updated

### 1. `.env.example`
Added the `COHERE_MODEL` environment variable with the default value.

### 2. `lib/cohere.ts`
- Added constant: `const COHERE_MODEL = process.env.COHERE_MODEL || 'command-r-03-2025';`
- Updated all 6 `cohere.chat()` calls to use `COHERE_MODEL` instead of hardcoded model names
- Functions using the centralized model:
  - `extractProjectInfo()` - Extract project details from documents
  - `generateSimilarityExplanation()` - Explain why projects are similar
  - `generateFeasibilityReport()` - Generate project feasibility reports
  - `generateSimilarityReason()` - Generate similarity reasons
  - `generateDifferentiationSuggestions()` - Suggest how to differentiate projects

### 3. `app/api/coordinator/evaluation-panels/ai-suggest/route.ts`
- Added constant: `const COHERE_MODEL = process.env.COHERE_MODEL || 'command-r-03-2025';`
- Updated the AI suggestion API to use `COHERE_MODEL`

## How to Change the Model

To change the Cohere model across the entire application:

1. Update your `.env` file:
   ```env
   COHERE_MODEL="new-model-name"
   ```

2. Restart your development server

That's it! All Cohere API calls will now use the new model.

## Model Information

- **Current Model**: `command-r-03-2025`
- **Previous Model**: `command-r` (deprecated)
- **Older Model**: `command-r-plus` (removed September 2025)

## Usage in Code

```typescript
// In lib/cohere.ts and API routes
const COHERE_MODEL = process.env.COHERE_MODEL || 'command-r-03-2025';

const response = await cohere.chat({
  model: COHERE_MODEL,  // Uses environment variable
  message: prompt,
  temperature: 0.7,
  // ...other options
});
```

## Benefits

1. **Single Source of Truth**: Change the model in one place (environment variable)
2. **Environment-Specific**: Can use different models in dev, staging, and production
3. **Easy Updates**: No need to search through code when Cohere releases new models
4. **Fallback**: Defaults to `command-r-03-2025` if env variable is not set

## Notes

- The embedding model (`embed-english-v3.0`) is still hardcoded as it's separate from chat models
- Make sure to add `COHERE_MODEL` to your actual `.env` file (not just `.env.example`)
- If you encounter model errors, verify the model name at [Cohere's documentation](https://docs.cohere.com/)
