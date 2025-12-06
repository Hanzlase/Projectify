import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.cohere_api_key || '',
});

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export interface SimilarityExplanation {
  explanation: string;
  keyOverlaps: string[];
  uniqueAspects: string[];
}

/**
 * Generate embeddings for text using Cohere's embed-english-v3.0 model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await cohere.embed({
      texts: [text],
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    });

    // Handle different response formats
    const embeddings = response.embeddings;
    if (embeddings && Array.isArray(embeddings) && embeddings.length > 0) {
      // embeddings should be number[][] (array of embedding arrays)
      const firstEmbedding = embeddings[0];
      if (Array.isArray(firstEmbedding)) {
        return firstEmbedding;
      }
    }
    
    throw new Error('No embeddings returned from Cohere');
  } catch (error: any) {
    console.error('Cohere embedding error:', error?.message || error);
    throw new Error(`Cohere embedding failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for query text (for searching)
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const response = await cohere.embed({
      texts: [text],
      model: 'embed-english-v3.0',
      inputType: 'search_query',
    });

    const embeddings = response.embeddings;
    if (embeddings && Array.isArray(embeddings) && embeddings.length > 0) {
      const firstEmbedding = embeddings[0];
      if (Array.isArray(firstEmbedding)) {
        return firstEmbedding;
      }
    }
    
    throw new Error('No embeddings returned from Cohere');
  } catch (error: any) {
    console.error('Cohere query embedding error:', error?.message || error);
    throw new Error(`Cohere query embedding failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Extract title, abstract, description and categories from document text using Cohere
 */
export async function extractProjectInfo(documentText: string): Promise<{ 
  title: string; 
  abstract: string; 
  description: string;
  categories: string[];
}> {
  const availableCategories = [
    'Web Development',
    'Mobile App',
    'Machine Learning',
    'Data Science',
    'IoT',
    'Blockchain',
    'Game Development',
    'Desktop Application',
    'API/Backend',
    'Cloud Computing',
    'Cybersecurity',
    'Computer Vision',
    'Natural Language Processing',
    'Robotics',
    'Embedded Systems',
    'Database Systems',
    'DevOps',
    'AR/VR',
    'E-commerce',
    'Healthcare Tech',
    'FinTech',
    'EdTech',
    'Social Media',
    'Other'
  ];

  try {
    const response = await cohere.chat({
      model: 'command-a-03-2025',
      message: `You are an expert at analyzing academic and project documents. Extract the following from this document:

1. Title: The project/document title (max 100 characters). Look for it at the beginning of the document or extract from the main topic.
2. Abstract: A concise summary (max 300 words) of what the project is about, its objectives, and methodology.
3. Description: A brief one-paragraph description (max 100 words) that captures the essence of the project.
4. Categories: Select 1-3 most relevant categories from this list: ${availableCategories.join(', ')}

If the document doesn't have a clear title, create an appropriate one based on the content.
If the document doesn't have a clear abstract section, create one based on the content.

Document Text:
${documentText.substring(0, 15000)}

Respond in JSON format only:
{
  "title": "extracted or generated title here",
  "abstract": "extracted or generated abstract here",
  "description": "brief description here",
  "categories": ["Category1", "Category2"]
}`,
      temperature: 0.3,
    });

    const responseText = response.text || '';
    
    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Validate categories against available list
      const validCategories = (parsed.categories || []).filter((cat: string) => 
        availableCategories.includes(cat)
      );
      return {
        title: parsed.title || 'Untitled Project',
        abstract: parsed.abstract || documentText.substring(0, 1000),
        description: parsed.description || documentText.substring(0, 300),
        categories: validCategories.length > 0 ? validCategories : ['Other'],
      };
    }

    // Fallback if JSON parsing fails
    return {
      title: 'Untitled Project',
      abstract: documentText.substring(0, 1000),
      description: documentText.substring(0, 300),
      categories: ['Other'],
    };
  } catch (error) {
    console.error('Cohere extraction error:', error);
    // Return truncated text as fallback
    return {
      title: 'Untitled Project',
      abstract: documentText.substring(0, 1000),
      description: documentText.substring(0, 300),
      categories: ['Other'],
    };
  }
}

/**
 * Generate explanation for why projects are similar
 */
export async function generateSimilarityExplanation(
  newProject: { title: string; abstract: string; description: string },
  similarProjects: Array<{ title: string; abstract: string; description: string; similarityScore: number }>
): Promise<SimilarityExplanation> {
  try {
    const similarProjectsText = similarProjects.map((p, i) => 
      `Project ${i + 1} (${(p.similarityScore * 100).toFixed(1)}% similar):
Title: ${p.title}
Abstract: ${p.abstract}
`).join('\n\n');

    const response = await cohere.chat({
      model: 'command-a-03-2025',
      message: `Analyze why the following new project idea is similar to existing projects in our database.

NEW PROJECT:
Title: ${newProject.title}
Abstract: ${newProject.abstract}
Description: ${newProject.description}

EXISTING SIMILAR PROJECTS:
${similarProjectsText}

Provide:
1. A detailed explanation of why the new project is similar to the existing ones
2. Key overlapping areas/concepts between the projects
3. What unique aspects (if any) the new project brings

Respond in JSON format:
{
  "explanation": "detailed explanation here",
  "keyOverlaps": ["overlap1", "overlap2", "overlap3"],
  "uniqueAspects": ["unique1", "unique2"]
}`,
      temperature: 0.5,
    });

    const responseText = response.text || '';
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        explanation: parsed.explanation || 'Projects share similar concepts and objectives.',
        keyOverlaps: parsed.keyOverlaps || [],
        uniqueAspects: parsed.uniqueAspects || [],
      };
    }

    return {
      explanation: 'The projects share similar concepts, methodologies, or objectives.',
      keyOverlaps: ['Similar domain', 'Overlapping methodology'],
      uniqueAspects: [],
    };
  } catch (error) {
    console.error('Cohere similarity explanation error:', error);
    return {
      explanation: 'Unable to generate detailed explanation. The projects appear to have overlapping concepts.',
      keyOverlaps: ['Similar concepts detected'],
      uniqueAspects: [],
    };
  }
}

export default cohere;
