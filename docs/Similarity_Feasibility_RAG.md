# Similarity Checking & Feasibility Analysis - RAG Pipeline Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [RAG Pipeline Flow](#rag-pipeline-flow)
4. [Core Components](#core-components)
5. [Embedding Generation](#embedding-generation)
6. [Vector Database (Qdrant)](#vector-database-qdrant)
7. [Similarity Detection Algorithm](#similarity-detection-algorithm)
8. [Feasibility Report Generation](#feasibility-report-generation)
9. [API Routes & Endpoints](#api-routes--endpoints)
10. [Edge Cases & Validations](#edge-cases--validations)
11. [Performance Optimizations](#performance-optimizations)
12. [Database Models](#database-models)

---

## Overview

The Similarity Checking and Feasibility Analysis system is a sophisticated **Retrieval-Augmented Generation (RAG) pipeline** that:

1. **Detects duplicate/similar FYP projects** before they are registered in the system
2. **Generates AI-powered feasibility reports** assessing project viability
3. **Provides differentiation suggestions** for projects that are too similar to existing ones

### Key Benefits
- Prevents duplicate project registrations across the university
- Ensures academic integrity and uniqueness of FYP work
- Provides students with actionable feedback on project viability
- Helps supervisors assess student project proposals efficiently

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                     │
│   Student/Supervisor uploads project document (PDF/DOCX)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DOCUMENT PROCESSING LAYER                                │
│   • pdf-parse: Extract text from PDF                                        │
│   • mammoth + adm-zip: Extract text from DOCX                               │
│   • cleanExtractedText(): Normalize and clean text                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AI EXTRACTION LAYER (Cohere)                             │
│   • extractProjectInfo(): Extract title, abstract, features, modules        │
│   • generateFeatureBasedEmbeddingText(): Create optimized embedding text    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EMBEDDING GENERATION (Cohere)                            │
│   • Model: embed-english-v3.0                                               │
│   • Vector Dimension: 1024                                                  │
│   • Input Type: search_document / search_query                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VECTOR DATABASE (Qdrant Cloud)                           │
│   • Collection: project_embeddings                                          │
│   • Distance Metric: Cosine Similarity                                      │
│   • Stores: embedding + project metadata (title, abstract, projectId)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SIMILARITY ANALYSIS                                      │
│   • searchSimilarProjects(): Find top 3 similar projects                    │
│   • checkUniqueness(): Threshold-based uniqueness check (50%)               │
│   • generateSimilarityExplanation(): AI explanation of overlaps             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FEASIBILITY ANALYSIS (Cohere)                            │
│   • generateFeasibilityReport(): AI assessment                              │
│   • Criteria: Timeline, Skills, Supervisor Expertise, Enhancements          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## RAG Pipeline Flow

### Step-by-Step Data Flow

```
Frontend                    API                          External Services
   │                         │                                  │
   │  1. Upload Document     │                                  │
   │ ───────────────────────>│                                  │
   │                         │                                  │
   │                         │  2. Extract Text                 │
   │                         │ ─────────────────────────────────│
   │                         │    (pdf-parse / mammoth)         │
   │                         │                                  │
   │                         │  3. Extract Project Info         │
   │                         │ ────────────────────────────────>│ Cohere Chat API
   │                         │    (title, abstract, features)   │
   │                         │ <────────────────────────────────│
   │                         │                                  │
   │                         │  4. Generate Embedding           │
   │                         │ ────────────────────────────────>│ Cohere Embed API
   │                         │ <────────────────────────────────│
   │                         │                                  │
   │                         │  5. Search Similar Projects      │
   │                         │ ────────────────────────────────>│ Qdrant Cloud
   │                         │ <────────────────────────────────│
   │                         │                                  │
   │                         │  6. Generate Reports             │
   │                         │ ────────────────────────────────>│ Cohere Chat API
   │                         │    (feasibility, explanations)   │
   │                         │ <────────────────────────────────│
   │                         │                                  │
   │  7. Return Results      │                                  │
   │ <───────────────────────│                                  │
   │                         │                                  │
```

---

## Core Components

### 1. Document Parser (`lib/document-parser.ts`)

Handles text extraction from uploaded documents with multiple fallback strategies:

```typescript
// Primary PDF extraction
extractTextFromPDF(buffer: Buffer): Promise<string>
  - Uses pdf-parse library
  - Handles standard PDF documents
  - Returns raw text content

// DOCX extraction with fallbacks
extractTextFromDOCX(buffer: Buffer): Promise<string>
  - Primary: mammoth library
  - Fallback 1: adm-zip (handles corrupted files)
  - Fallback 2: JSZip with CRC32 disabled
  
// Text cleaning
cleanExtractedText(text: string): string
  - Removes excessive whitespace
  - Normalizes line breaks
  - Filters non-printable characters
```

### 2. Cohere Integration (`lib/cohere.ts`)

All AI operations are powered by Cohere's Command and Embed models:

| Function | Model | Purpose |
|----------|-------|---------|
| `generateEmbedding()` | embed-english-v3.0 | Create document embeddings |
| `generateQueryEmbedding()` | embed-english-v3.0 | Create search query embeddings |
| `extractProjectInfo()` | command-a-03-2025 | Extract structured project info |
| `generateFeasibilityReport()` | command-a-03-2025 | Generate AI feasibility analysis |
| `generateSimilarityExplanation()` | command-a-03-2025 | Explain why projects are similar |
| `generateSimilarityReason()` | command-a-03-2025 | Brief reason for each similar project |
| `generateDifferentiationSuggestions()` | command-a-03-2025 | Suggestions to make project unique |

### 3. Vector Database (`lib/qdrant.ts`)

Qdrant Cloud manages project embeddings for similarity search:

```typescript
// Configuration
COLLECTION_NAME: 'project_embeddings'
VECTOR_SIZE: 1024 (Cohere embed-english-v3.0 dimension)
DISTANCE_METRIC: 'Cosine'

// Key Functions
initializeCollection(): Create collection if not exists
addProjectEmbedding(embedding, payload): Store new project
searchSimilarProjects(embedding, limit): Find similar projects
deleteProjectEmbedding(pointId): Remove project from index
checkUniqueness(similarProjects, threshold): Boolean uniqueness check
```

---

## Embedding Generation

### Feature-Based Embedding Strategy

**The Problem**: Traditional keyword-based embeddings miss functional similarities. Two projects implementing "user authentication" might use completely different terminology but serve the same purpose.

**Our Solution**: Feature-based embedding text generation that focuses on WHAT the project does, not HOW it's built.

```typescript
// lib/cohere.ts - generateFeatureBasedEmbeddingText()
export function generateFeatureBasedEmbeddingText(projectInfo: {
  title: string;
  abstract: string;
  description: string;
  mainFeatures?: string[];
  coreModules?: string[];
  workflows?: string[];
}): string {
  // Combines functional aspects into embedding-optimized text
  const parts = [
    `Project: ${projectInfo.title}`,
    `Summary: ${projectInfo.abstract}`,
    projectInfo.mainFeatures?.length 
      ? `Core Features: ${projectInfo.mainFeatures.join('; ')}` 
      : '',
    projectInfo.coreModules?.length
      ? `System Modules: ${projectInfo.coreModules.join('; ')}`
      : '',
    projectInfo.workflows?.length
      ? `User Workflows: ${projectInfo.workflows.join('; ')}`
      : '',
  ];
  
  return parts.filter(Boolean).join('\n\n');
}
```

### Extracted Project Information

The AI extracts the following from uploaded documents:

| Field | Description | Example |
|-------|-------------|---------|
| `title` | Project name | "Smart Campus Navigation System" |
| `abstract` | 300-400 word summary | Detailed project description |
| `description` | Brief one-liner | "Mobile app for indoor navigation" |
| `categories` | 1-3 predefined categories | ["Mobile App", "IoT"] |
| `mainFeatures` | 6-8 key functionalities | ["Real-time location tracking", "Route optimization"] |
| `coreModules` | 4-6 system components | ["User Management", "Map Rendering"] |
| `workflows` | 3-5 user journeys | ["User login → Set destination → Navigate"] |
| `techStack` | Technologies used | ["React Native", "Firebase"] |

---

## Vector Database (Qdrant)

### Collection Structure

```typescript
interface ProjectPayload {
  projectId: number;       // Database project ID
  title: string;           // Project title
  abstract: string;        // Project abstract
  description: string;     // Brief description
  documentUrl: string;     // Uploaded document URL
  createdById: number;     // Creator's user ID
  campusId: number;        // Campus ID
  createdAt: string;       // ISO timestamp
}

// Each point in Qdrant:
{
  id: UUID,
  vector: number[1024],    // Cohere embedding
  payload: ProjectPayload
}
```

### Retry Logic

All Qdrant operations include retry logic for resilience:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = 1000 * attempt; // Exponential backoff
        await sleep(delay);
      }
    }
  }
  throw lastError;
}
```

---

## Similarity Detection Algorithm

### Uniqueness Threshold

```typescript
// Threshold: 50% similarity = NOT UNIQUE
const UNIQUENESS_THRESHOLD = 0.5;

export function checkUniqueness(
  similarProjects: SimilarProject[], 
  threshold: number = 0.5
): boolean {
  if (similarProjects.length === 0) return true;
  
  const highestScore = Math.max(...similarProjects.map(p => p.score));
  return highestScore < threshold;
}
```

### Similarity Score Interpretation

| Score Range | Interpretation | UI Display |
|-------------|---------------|------------|
| 0-30% | Low similarity | ✅ Unique |
| 30-50% | Moderate overlap | ⚠️ Similar elements found |
| 50-70% | High similarity | ❌ Not unique |
| 70-100% | Very high overlap | ❌ Likely duplicate |

### Search Algorithm

```typescript
export async function searchSimilarProjects(
  embedding: number[],
  limit: number = 3,
  excludeProjectId?: number,
  campusId?: number
): Promise<SimilarProject[]> {
  const results = await client.search(COLLECTION_NAME, {
    vector: embedding,
    limit,
    filter: excludeProjectId ? {
      must_not: [{
        key: 'projectId',
        match: { value: excludeProjectId }
      }]
    } : undefined,
    with_payload: true,
    score_threshold: 0.1, // Only return results with at least 10% similarity
  });
  
  return results.map(result => ({
    id: String(result.id),
    score: result.score,
    payload: result.payload as ProjectPayload,
  }));
}
```

---

## Feasibility Report Generation

### Report Structure

```typescript
interface FeasibilityReport {
  overallFeasibility: 'high' | 'medium' | 'low';
  summary: string;
  targetAudience: string;
  timelineFeasibility: {
    isPossible: boolean;
    verdict: string;
    considerations: string[];
  };
  requiredSkills: string[];
  recommendedSupervisorExpertise: string[];
  suggestedEnhancements: string[];
}
```

### AI Prompt Engineering

The feasibility report is generated with context-aware prompts:

```typescript
// Key context provided to AI:
- Project title, abstract, categories
- Team size: 3 students
- Timeline: 2 semesters (8-10 months)
- Required output: Structured JSON response
```

### Stored Feasibility Reports

Once generated, feasibility reports are stored in the `Project` model:

```prisma
model Project {
  // ... other fields
  feasibilityReport Json? @map("feasibility_report")
}
```

This prevents regeneration and allows quick access on project detail pages.

---

## API Routes & Endpoints

### Primary Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/check-similarity` | POST | Check project uniqueness before creation |
| `/api/projects` | POST | Create project (saves embedding if unique) |
| `/api/projects/[id]` | DELETE | Delete project (removes embedding from Qdrant) |
| `/api/projects/[id]/feasibility` | GET | Generate/retrieve feasibility report |

### Check Similarity Flow (`/api/projects/check-similarity`)

```typescript
// POST /api/projects/check-similarity
// Body: FormData with 'file' (PDF or DOCX)

export async function POST(request: Request) {
  // 1. Authenticate user
  const session = await auth();
  
  // 2. Validate file type
  if (!supportedTypes.includes(file.type)) {
    return { error: 'Only PDF and DOCX supported' };
  }
  
  // 3. Extract text from document
  const documentText = await extractTextFromDocument(buffer, file.type);
  
  // 4. Extract project info using AI
  const extractedInfo = await extractProjectInfo(documentText);
  
  // 5. Generate feature-based embedding
  const embeddingText = generateFeatureBasedEmbeddingText(extractedInfo);
  const embedding = await generateEmbedding(embeddingText);
  
  // 6. Search for similar projects
  const similarProjects = await searchSimilarProjects(embedding, 3);
  
  // 7. Check uniqueness
  const isUnique = checkUniqueness(similarProjects, 0.5);
  
  // 8. Generate reports
  const feasibilityReport = await generateFeasibilityReport(extractedInfo);
  const similarityExplanation = isUnique ? null : 
    await generateSimilarityExplanation(extractedInfo, similarProjects);
  
  // 9. Return comprehensive result
  return {
    isUnique,
    extractedInfo,
    similarProjects,
    similarityExplanation,
    feasibilityReport,
    differentiationSuggestions
  };
}
```

---

## Edge Cases & Validations

### File Validation

| Edge Case | Handling |
|-----------|----------|
| Empty file | Return error: "No document provided" |
| Wrong file type | Return error: "Only PDF and DOCX supported" |
| Corrupted PDF | Try fallback extraction, return error if fails |
| Corrupted DOCX | Multiple fallbacks: mammoth → adm-zip → JSZip |
| Image-only PDF | Return error: "Could not extract sufficient text" |
| Very short document | Minimum 100 characters required |

### Similarity Edge Cases

| Edge Case | Handling |
|-----------|----------|
| No existing projects | Return isUnique: true, empty similarProjects |
| All projects below threshold | Return isUnique: true with similar projects for reference |
| Exact duplicate detected | Return detailed explanation with highest similarity |
| Same title, different content | Similarity based on content, not just title |

### API Resilience

```typescript
// Qdrant connection failures
- 3 retry attempts with exponential backoff
- Graceful degradation: project still created without embedding

// Cohere API failures
- Fallback to default feasibility report
- Truncated text as fallback for extraction
```

---

## Performance Optimizations

### 1. Caching Feasibility Reports

```typescript
// Stored in database after first generation
const project = await prisma.project.update({
  where: { projectId },
  data: { feasibilityReport: report }
});

// Retrieved from database on subsequent requests
if (project.feasibilityReport) {
  return project.feasibilityReport;
}
```

### 2. Embedding Storage

- Embeddings stored in Qdrant Cloud (managed service)
- Local project metadata in PostgreSQL
- UUID reference (`embeddingId`) links project to vector

### 3. Text Processing Limits

```typescript
// Limit text sent to AI to prevent token overflow
documentText.substring(0, 18000) // Max ~18k characters for extraction
```

### 4. Parallel Processing

```typescript
// Generate reasons for similar projects in parallel
const similarProjectsWithReasons = await Promise.all(
  similarProjects.map(async (p) => {
    const reason = await generateSimilarityReason(newProject, p);
    return { ...p, reason };
  })
);
```

---

## Database Models

### Project Model (PostgreSQL)

```prisma
model Project {
  projectId         Int               @id @default(autoincrement())
  title             String            @db.VarChar(255)
  description       String            @db.Text
  abstractText      String?           @db.Text
  category          String?           @db.VarChar(100)
  status            ProjectStatus     @default(in_progress)
  visibility        ProjectVisibility @default(private)
  thumbnailUrl      String?           @db.VarChar(500)
  documentUrl       String?           @db.VarChar(500)
  documentName      String?           @db.VarChar(255)
  
  // RAG-specific fields
  embeddingId       String?           @db.VarChar(100) // Qdrant point ID
  isUnique          Boolean           @default(false)
  similarityScore   Float?
  feasibilityReport Json?             // Cached report
  
  createdById       Int
  campusId          Int
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}
```

### Qdrant Payload Structure

```typescript
interface ProjectPayload {
  projectId: number;
  title: string;
  abstract: string;
  description: string;
  documentUrl: string | null;
  createdById: number;
  campusId: number;
  createdAt: string;
}
```

---

## UI Components

### Similarity Check Page

Located at `/student/projects/similarity-check` and `/supervisor/projects/similarity-check`:

**Key States:**
- `SimilarityResult`: Contains all analysis data
- `FeasibilityReport`: AI-generated project assessment
- `SimilarProject[]`: List of similar projects with scores

**UI Elements:**
- Similarity score display (color-coded)
- Similar projects list with reasons
- Feasibility report cards
- Differentiation suggestions
- "Proceed Anyway" option for borderline cases

### Analysis Modal

Shows progressive stages during analysis:
1. 📄 Extracting text from document
2. 🤖 Processing with AI
3. 🔢 Generating embeddings
4. 🔍 Checking similarity
5. ✅ Analysis complete

---

## Environment Variables

```env
# Cohere AI API
cohere_api_key=your_cohere_api_key

# Qdrant Vector Database
clusterurl=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
```

---

## Future Improvements

1. **Real-time Updates**: Update embeddings when project is modified
2. **Cross-Campus Similarity**: Option to check against all campuses
3. **Historical Tracking**: Track similarity scores over time
4. **Supervisor Recommendations**: Match projects to supervisors based on domain expertise
5. **Batch Processing**: Allow bulk similarity checking for coordinators
