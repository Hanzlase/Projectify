import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

// Use QDRANT_URL environment variable
let QDRANT_URL = process.env.QDRANT_URL || '';
// Remove trailing slash if present
QDRANT_URL = QDRANT_URL.replace(/\/+$/, '');
// For Qdrant Cloud (*.cloud.qdrant.io), strip :6333 — Cloud uses HTTPS on port 443
// For self-hosted, keep :6333 if present or add it
if (QDRANT_URL.includes('.cloud.qdrant.io')) {
  QDRANT_URL = QDRANT_URL.replace(':6333', '');
}
// Clean up API key in case it has line breaks
const QDRANT_API_KEY = (process.env.QDRANT_API_KEY || '').replace(/\s+/g, '');
const COLLECTION_NAME = 'project_embeddings';
const VECTOR_SIZE = 1024; // Cohere embed-english-v3.0 produces 1024-dimensional vectors
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

let qdrantClient: QdrantClient | null = null;
let qdrantClientUrl: string | null = null; // Track URL to detect changes

// Request semaphore for limiting concurrent Qdrant operations
let activeQdrantRequests = 0;
const MAX_CONCURRENT_QDRANT = 10;
const qdrantQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
  fn: () => Promise<any>;
}> = [];

async function processQdrantQueue() {
  if (activeQdrantRequests >= MAX_CONCURRENT_QDRANT || qdrantQueue.length === 0) {
    return;
  }

  const item = qdrantQueue.shift();
  if (!item) return;

  activeQdrantRequests++;
  
  try {
    const result = await item.fn();
    item.resolve(result);
  } catch (error) {
    item.reject(error);
  } finally {
    activeQdrantRequests--;
    processQdrantQueue();
  }
}

function queueQdrantRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    qdrantQueue.push({ resolve, reject, fn });
    processQdrantQueue();
  });
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for Qdrant operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}):`, error?.message || error);
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

function getQdrantClient(): QdrantClient {
  // Recreate client if URL changed (e.g. env reload in dev)
  if (qdrantClient && qdrantClientUrl !== QDRANT_URL) {
    qdrantClient = null;
  }
  if (!qdrantClient) {
    console.log('Initializing Qdrant client with URL:', QDRANT_URL);
    if (!QDRANT_URL) {
      throw new Error('Qdrant URL not configured. Set QDRANT_URL in .env');
    }
    qdrantClient = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      checkCompatibility: false, // Skip version check to avoid errors
      timeout: 10000, // 10 second timeout
    });
    qdrantClientUrl = QDRANT_URL;
  }
  return qdrantClient;
}

export interface ProjectPayload {
  projectId: number;
  title: string;
  abstract: string;
  description: string;
  documentUrl: string | null;
  createdById: number;
  campusId: number;
  createdAt: string;
}

export interface SimilarProject {
  id: string;
  score: number;
  payload: ProjectPayload;
}

/**
 * Initialize the Qdrant collection if it doesn't exist
 */
export async function initializeCollection(): Promise<boolean> {
  return withRetry(async () => {
    const client = getQdrantClient();
    console.log('Checking Qdrant collections...');
    console.log('Using Qdrant URL:', QDRANT_URL);
    const collections = await client.getCollections();
    console.log('Available collections:', collections.collections.map(c => c.name));
    const exists = collections.collections.some((c: { name: string }) => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`Creating collection: ${COLLECTION_NAME} with vector size ${VECTOR_SIZE}`);
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
    } else {
      console.log(`Collection ${COLLECTION_NAME} already exists`);
    }
    return true;
  }, 'Initialize Qdrant collection');
}

/**
 * Add a project embedding to Qdrant with retry logic
 */
export async function addProjectEmbedding(
  embedding: number[],
  payload: ProjectPayload
): Promise<string> {
  await initializeCollection();
  
  const pointId = uuidv4();
  
  return withRetry(async () => {
    const client = getQdrantClient();

    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: embedding,
          payload: payload as unknown as Record<string, unknown>,
        },
      ],
    });

    return pointId;
  }, 'Add project embedding');
}

/**
 * Search for similar projects with retry logic
 * Always returns up to `limit` projects sorted by similarity score
 */
export async function searchSimilarProjects(
  embedding: number[],
  limit: number = 3,
  excludeProjectId?: number,
  campusId?: number
): Promise<SimilarProject[]> {
  try {
    await initializeCollection();
  } catch (error: any) {
    console.error('Qdrant unavailable for similarity search:', error?.message || error);
    // Throw so the caller knows Qdrant is down — don't silently return []
    // which would make every project appear "100% unique"
    throw new Error('Vector database is currently unavailable. Cannot perform similarity check. Please try again later.');
  }
  
  return await withRetry(async () => {
    const client = getQdrantClient();

      // Build filter conditions
      const mustNot: any[] = [];
      const must: any[] = [];

      // Exclude specific project if provided
      if (excludeProjectId) {
        mustNot.push({
          key: 'projectId',
          match: { value: excludeProjectId },
        });
      }

      // Optionally filter by campus for more relevant results
      // Note: We search ALL projects regardless of visibility for similarity checking
      // Visibility only matters when displaying projects to users

      const filter = mustNot.length > 0 || must.length > 0
        ? {
            ...(mustNot.length > 0 && { must_not: mustNot }),
            ...(must.length > 0 && { must: must }),
          }
        : undefined;

      console.log(`Searching Qdrant for ${limit} similar projects...`);
      
      const results = await client.search(COLLECTION_NAME, {
        vector: embedding,
        limit,
        filter,
        with_payload: true,
        score_threshold: 0.1, // Only return results with at least 10% similarity
      });

      console.log(`Found ${results.length} similar projects in Qdrant`);

      return results.map((result: { id: string | number; score: number; payload?: Record<string, unknown> | null }) => ({
        id: String(result.id),
        score: result.score,
        payload: result.payload as unknown as ProjectPayload,
      }));
    }, 'Search similar projects');
}

/**
 * Delete a project embedding from Qdrant
 */
export async function deleteProjectEmbedding(pointId: string): Promise<boolean> {
  try {
    return await withRetry(async () => {
      const client = getQdrantClient();
      await client.delete(COLLECTION_NAME, {
        wait: true,
        points: [pointId],
      });
      return true;
    }, 'Delete project embedding');
  } catch (error: any) {
    console.error('Error deleting project embedding:', error?.message || error);
    return false;
  }
}

/**
 * Delete project embedding by project ID
 */
export async function deleteProjectEmbeddingByProjectId(projectId: number): Promise<boolean> {
  try {
    return await withRetry(async () => {
      const client = getQdrantClient();
      await client.delete(COLLECTION_NAME, {
        wait: true,
        filter: {
          must: [
            {
              key: 'projectId',
              match: { value: projectId },
            },
          ],
        },
      });
      return true;
    }, 'Delete project embedding by ID');
  } catch (error: any) {
    console.error('Error deleting project embedding by ID:', error?.message || error);
    return false;
  }
}

/**
 * Get collection info
 */
export async function getCollectionInfo() {
  try {
    await initializeCollection();
    const client = getQdrantClient();
    const info = await client.getCollection(COLLECTION_NAME);
    console.log(`Qdrant collection info: ${info.points_count} points stored`);
    return info;
  } catch (error: any) {
    console.error('Error getting collection info:', error?.message || error);
    return null;
  }
}

/**
 * Get the count of projects stored in Qdrant
 */
export async function getProjectCount(): Promise<number> {
  try {
    const info = await getCollectionInfo();
    return info?.points_count || 0;
  } catch (error) {
    console.error('Error getting project count:', error);
    return 0;
  }
}

/**
 * Check if a project passes the uniqueness threshold (at least 50% unique)
 * Returns true if the highest similarity score is less than 0.5 (50%)
 */
export function checkUniqueness(similarProjects: SimilarProject[], threshold: number = 0.5): boolean {
  if (similarProjects.length === 0) return true;
  
  const highestScore = Math.max(...similarProjects.map(p => p.score));
  return highestScore < threshold;
}

export { getQdrantClient };
