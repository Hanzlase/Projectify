import { Pinecone } from '@pinecone-database/pinecone';

// ─── Configuration ───────────────────────────────────────────────────────────
const PINECONE_API_KEY = (process.env.PINECONE_API_KEY || '').trim();
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'project-embeddings';
const PINECONE_SUPERVISORS_INDEX_NAME = process.env.PINECONE_SUPERVISORS_INDEX_NAME || 'supervisors';
const VECTOR_DIMENSION = 1024; // Cohere embed-english-v3.0 produces 1024-dimensional vectors
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const NAMESPACE = 'projects'; // Pinecone namespace for project embeddings

// ─── Singleton Client ────────────────────────────────────────────────────────
let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    if (!PINECONE_API_KEY) {
      throw new Error('Pinecone API key not configured. Set PINECONE_API_KEY in .env');
    }
    console.log('Initializing Pinecone client...');
    pineconeClient = new Pinecone({ apiKey: PINECONE_API_KEY });
  }
  return pineconeClient;
}

function getIndex() {
  const client = getPineconeClient();
  return client.index(PINECONE_INDEX_NAME);
}

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
}

// ─── Index Initialization ────────────────────────────────────────────────────
let indexVerifiedAt = 0;
const INDEX_VERIFY_TTL_MS = 5 * 60 * 1000; // Re-verify every 5 minutes

/**
 * Verify the Pinecone index exists and is ready.
 * Caches the result for 5 minutes to avoid repeated health-check calls.
 */
export async function initializeIndex(): Promise<boolean> {
  if (Date.now() - indexVerifiedAt < INDEX_VERIFY_TTL_MS) {
    return true; // Recently verified, skip network call
  }
  return withRetry(async () => {
    const index = getIndex();
    const stats = await index.describeIndexStats();
    console.log(`Pinecone index "${PINECONE_INDEX_NAME}" ready — ${stats.totalRecordCount ?? 0} vectors stored`);
    indexVerifiedAt = Date.now();
    return true;
  }, 'Initialize Pinecone index');
}

// ─── Add Embedding ───────────────────────────────────────────────────────────
/**
 * Store a project embedding in Pinecone.
 * Uses the projectId as the vector ID for easy lookup/deletion.
 */
export async function addProjectEmbedding(
  embedding: number[],
  payload: ProjectPayload
): Promise<string> {
  const vectorId = `project-${payload.projectId}`;

  return withRetry(async () => {
    const index = getIndex();
    const ns = index.namespace(NAMESPACE);

    await ns.upsert({
      records: [
        {
          id: vectorId,
          values: embedding,
          metadata: {
            projectId: payload.projectId,
            title: payload.title,
            abstract: payload.abstract,
            description: payload.description,
            documentUrl: payload.documentUrl || '',
            createdById: payload.createdById,
            campusId: payload.campusId,
            createdAt: payload.createdAt,
          },
        },
      ],
    });

    console.log(`Embedding stored in Pinecone: ${vectorId}`);
    return vectorId;
  }, 'Add project embedding');
}

// ─── Search Similar ──────────────────────────────────────────────────────────
/**
 * Search for similar projects using cosine similarity.
 * Throws on connectivity errors so the caller knows the DB is down
 * (instead of silently returning [] which would make everything appear "unique").
 */
export async function searchSimilarProjects(
  embedding: number[],
  limit: number = 3,
  excludeProjectId?: number,
  campusId?: number
): Promise<SimilarProject[]> {
  // Validate connectivity first — throw on failure
  try {
    await initializeIndex();
  } catch (error: any) {
    console.error('Pinecone unavailable for similarity search:', error?.message || error);
    throw new Error('Vector database is currently unavailable. Cannot perform similarity check. Please try again later.');
  }

  return await withRetry(async () => {
    const index = getIndex();
    const ns = index.namespace(NAMESPACE);

    // Build metadata filter
    const filter: Record<string, any> = {};
    if (excludeProjectId) {
      filter.projectId = { $ne: excludeProjectId };
    }

    console.log(`Searching Pinecone for ${limit} similar projects...`);

    const results = await ns.query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
      ...(Object.keys(filter).length > 0 && { filter }),
    });

    // Filter out low-similarity results (below 10% threshold)
    const filtered = (results.matches || []).filter(m => (m.score ?? 0) >= 0.1);

    console.log(`Found ${filtered.length} similar projects in Pinecone`);

    return filtered.map(match => ({
      id: match.id,
      score: match.score ?? 0,
      payload: {
        projectId: (match.metadata?.projectId as number) ?? 0,
        title: (match.metadata?.title as string) ?? '',
        abstract: (match.metadata?.abstract as string) ?? '',
        description: (match.metadata?.description as string) ?? '',
        documentUrl: (match.metadata?.documentUrl as string) || null,
        createdById: (match.metadata?.createdById as number) ?? 0,
        campusId: (match.metadata?.campusId as number) ?? 0,
        createdAt: (match.metadata?.createdAt as string) ?? '',
      },
    }));
  }, 'Search similar projects');
}

// ─── Delete Embedding ────────────────────────────────────────────────────────
/**
 * Delete a project embedding by its vector ID (e.g. "project-123").
 */
export async function deleteProjectEmbedding(vectorId: string): Promise<boolean> {
  try {
    return await withRetry(async () => {
      const index = getIndex();
      const ns = index.namespace(NAMESPACE);
      await ns.deleteOne({ id: vectorId });
      console.log(`Deleted embedding from Pinecone: ${vectorId}`);
      return true;
    }, 'Delete project embedding');
  } catch (error: any) {
    console.error('Error deleting project embedding:', error?.message || error);
    return false;
  }
}

/**
 * Delete a project embedding by project ID.
 */
export async function deleteProjectEmbeddingByProjectId(projectId: number): Promise<boolean> {
  return deleteProjectEmbedding(`project-${projectId}`);
}

// ─── Collection Info ─────────────────────────────────────────────────────────
/**
 * Get index statistics.
 */
export async function getCollectionInfo() {
  try {
    const index = getIndex();
    const stats = await index.describeIndexStats();
    console.log(`Pinecone index stats: ${stats.totalRecordCount ?? 0} vectors stored`);
    return {
      points_count: stats.totalRecordCount ?? 0,
      dimensions: stats.dimension ?? VECTOR_DIMENSION,
      namespaces: stats.namespaces,
    };
  } catch (error: any) {
    console.error('Error getting index info:', error?.message || error);
    return null;
  }
}

/**
 * Get the count of project embeddings stored.
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

// ─── Uniqueness Check ────────────────────────────────────────────────────────
/**
 * Check if a project passes the uniqueness threshold.
 * Returns true if the highest similarity score is below the threshold (default 50%).
 */
export function checkUniqueness(similarProjects: SimilarProject[], threshold: number = 0.5): boolean {
  if (similarProjects.length === 0) return true;
  const highestScore = Math.max(...similarProjects.map(p => p.score));
  return highestScore < threshold;
}

// ─── Supervisor Embeddings ───────────────────────────────────────────────────
export interface SupervisorEmbeddingPayload {
  supervisorId: number;
  name: string;
  specialization: string;
  description: string;
  domains: string;
  skills: string;
  achievements: string;
  campusId: number;
}

/**
 * Upsert a supervisor profile embedding into Pinecone.
 * Attempts to use the index named 'supervisors' first.
 * If that fails (e.g. index not found), it falls back to using the default index with namespace 'supervisors'.
 */
export async function upsertSupervisorEmbedding(
  embedding: number[],
  payload: SupervisorEmbeddingPayload
): Promise<string> {
  const vectorId = `supervisor-${payload.supervisorId}`;
  const record = {
    id: vectorId,
    values: embedding,
    metadata: {
      supervisorId: payload.supervisorId,
      name: payload.name,
      specialization: payload.specialization,
      description: payload.description,
      domains: payload.domains,
      skills: payload.skills,
      achievements: payload.achievements,
      campusId: payload.campusId,
    },
  };

  return withRetry(async () => {
    const client = getPineconeClient();
    try {
      const index = client.index(PINECONE_SUPERVISORS_INDEX_NAME);
      // Verify/healthcheck index
      await index.describeIndexStats();
      await index.upsert({
        records: [record],
      });
      console.log(`Supervisor embedding stored in Pinecone index "${PINECONE_SUPERVISORS_INDEX_NAME}": ${vectorId}`);
      return vectorId;
    } catch (err: any) {
      console.warn(`Could not upsert to index "${PINECONE_SUPERVISORS_INDEX_NAME}": ${err?.message || err}. Falling back to default index namespace "supervisors".`);
    }

    // Fallback
    const index = client.index(PINECONE_INDEX_NAME);
    const ns = index.namespace('supervisors');
    await ns.upsert({
      records: [record],
    });
    console.log(`Supervisor embedding stored in default index namespace "supervisors": ${vectorId}`);
    return vectorId;
  }, 'Upsert supervisor embedding');
}

/**
 * Query Pinecone to find top-K matching supervisors for a project embedding vector.
 * Attempts index 'supervisors' first, then falls back to namespace 'supervisors' on default index.
 */
export async function matchSupervisorsForProject(
  projectVector: number[],
  limit: number = 5,
  campusId?: number
): Promise<Array<{ supervisorId: number; score: number }>> {
  return withRetry(async () => {
    const client = getPineconeClient();
    const filter: Record<string, any> = {};
    if (campusId) {
      filter.campusId = campusId;
    }

    // Try index PINECONE_SUPERVISORS_INDEX_NAME
    try {
      const index = client.index(PINECONE_SUPERVISORS_INDEX_NAME);
      await index.describeIndexStats();
      const results = await index.query({
        vector: projectVector,
        topK: limit,
        includeMetadata: true,
        ...(Object.keys(filter).length > 0 && { filter }),
      });
      return (results.matches || []).map(m => ({
        supervisorId: (m.metadata?.supervisorId as number) || parseInt(m.id.replace('supervisor-', '')),
        score: m.score ?? 0,
      }));
    } catch (err: any) {
      console.warn(`Could not query index "${PINECONE_SUPERVISORS_INDEX_NAME}": ${err?.message || err}. Falling back to default index namespace "supervisors".`);
    }

    // Fallback
    const index = client.index(PINECONE_INDEX_NAME);
    const ns = index.namespace('supervisors');
    const results = await ns.query({
      vector: projectVector,
      topK: limit,
      includeMetadata: true,
      ...(Object.keys(filter).length > 0 && { filter }),
    });
    return (results.matches || []).map(m => ({
      supervisorId: (m.metadata?.supervisorId as number) || parseInt(m.id.replace('supervisor-', '')),
      score: m.score ?? 0,
    }));
  }, 'Match supervisors for project');
}

