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
 * Extract title, abstract, description, categories and main features from document text using Cohere
 * Enhanced to extract detailed features for better similarity comparison
 */
export async function extractProjectInfo(documentText: string): Promise<{ 
  title: string; 
  abstract: string; 
  description: string;
  categories: string[];
  mainFeatures: string[];
  coreModules: string[];
  workflows: string[];
  techStack: string[];
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
      message: `You are an expert at analyzing academic and FYP (Final Year Project) documents. Your task is to extract detailed information that will be used for similarity comparison with other projects.

CRITICAL: Focus on extracting the CORE FUNCTIONALITY and FEATURES, not just surface-level keywords. Two projects implementing the same core features should be detected as similar even if they use different tech stacks or UI designs.

Extract the following from this document:

1. Title: The project/document title (max 100 characters). Look for it at the beginning or extract from main topic.

2. Abstract: A detailed summary (300-400 words) focusing on:
   - What problem does it solve?
   - What are the main functionalities?
   - Who are the target users?
   - What makes it unique?

3. Description: A brief one-paragraph description (max 100 words) capturing the essence.

4. Categories: Select 1-3 most relevant categories from: ${availableCategories.join(', ')}

5. Main Features: Extract 6-8 KEY FEATURES/FUNCTIONALITIES of the project. Be specific about what each feature DOES, not what technology it uses.
   Example: "User authentication with role-based access" NOT "Uses JWT tokens"

6. Core Modules: List 4-6 main system modules/components (e.g., "User Management Module", "Payment Processing Module", "Report Generation Module")

7. Workflows: Describe 3-5 key user workflows or system processes (e.g., "User registration → Profile setup → Dashboard access")

8. Tech Stack: List technologies mentioned (for reference only, not for similarity)

If the document doesn't have a clear title/abstract, create appropriate ones based on content.

Document Text:
${documentText.substring(0, 18000)}

Respond in JSON format only:
{
  "title": "extracted or generated title here",
  "abstract": "detailed abstract focusing on functionality",
  "description": "brief description here",
  "categories": ["Category1", "Category2"],
  "mainFeatures": ["Feature 1: description", "Feature 2: description", ...],
  "coreModules": ["Module 1", "Module 2", ...],
  "workflows": ["Workflow 1", "Workflow 2", ...],
  "techStack": ["Tech 1", "Tech 2", ...]
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
        mainFeatures: parsed.mainFeatures || [],
        coreModules: parsed.coreModules || [],
        workflows: parsed.workflows || [],
        techStack: parsed.techStack || [],
      };
    }

    // Fallback if JSON parsing fails
    return {
      title: 'Untitled Project',
      abstract: documentText.substring(0, 1000),
      description: documentText.substring(0, 300),
      categories: ['Other'],
      mainFeatures: [],
      coreModules: [],
      workflows: [],
      techStack: [],
    };
  } catch (error) {
    console.error('Cohere extraction error:', error);
    // Return truncated text as fallback
    return {
      title: 'Untitled Project',
      abstract: documentText.substring(0, 1000),
      description: documentText.substring(0, 300),
      categories: ['Other'],
      mainFeatures: [],
      coreModules: [],
      workflows: [],
      techStack: [],
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

/**
 * Generate a simplified feasibility report for a project
 */
export interface FeasibilityReport {
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

export async function generateFeasibilityReport(
  projectInfo: { title: string; abstract: string; description: string; categories: string[] }
): Promise<FeasibilityReport> {
  try {
    const response = await cohere.chat({
      model: 'command-a-03-2025',
      message: `You are an expert project analyst for Final Year Projects (FYP). Generate a brief feasibility report for the following project:

PROJECT DETAILS:
Title: ${projectInfo.title}
Categories: ${projectInfo.categories.join(', ')}
Abstract: ${projectInfo.abstract}
Description: ${projectInfo.description}

CONTEXT: This project will be done by a GROUP OF 3 STUDENTS over 2 SEMESTERS (approximately 8-10 months).

Generate a feasibility report with:
1. Overall Feasibility (high/medium/low)
2. A 2-3 sentence summary about the project's viability
3. Target Audience: Who would benefit from this project? (1 concise sentence)
4. Timeline Assessment: Is this project possible for a group of 3 members to complete in 2 semesters? Include verdict (yes/no/maybe) and key considerations
5. Top 6-7 required technical skills for students
6. What kind of supervisor expertise would be ideal (2-3 areas)
7. 4-5 enhancement suggestions to make the project better/unique

Respond ONLY with valid JSON:
{
  "overallFeasibility": "high|medium|low",
  "summary": "Brief summary of project viability",
  "targetAudience": "Brief description of target users",
  "timelineFeasibility": {
    "isPossible": true,
    "verdict": "Yes, this project is achievable in 2 semesters with 3 team members",
    "considerations": ["consideration1", "consideration2"]
  },
  "requiredSkills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6"],
  "recommendedSupervisorExpertise": ["expertise1", "expertise2"],
  "suggestedEnhancements": ["enhancement1", "enhancement2", "enhancement3", "enhancement4"]
}`,
      temperature: 0.4,
    });

    const responseText = response.text || '';
    
    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        overallFeasibility: parsed.overallFeasibility || 'medium',
        summary: parsed.summary || 'Project appears feasible with proper planning and resources.',
        targetAudience: parsed.targetAudience || 'General users and stakeholders in the relevant domain.',
        timelineFeasibility: parsed.timelineFeasibility || {
          isPossible: true,
          verdict: 'Project timeline needs manual assessment.',
          considerations: ['Break down into manageable milestones', 'Ensure team has required skills']
        },
        requiredSkills: parsed.requiredSkills || ['Programming', 'Problem Solving', 'Research'],
        recommendedSupervisorExpertise: parsed.recommendedSupervisorExpertise || ['Related domain expertise'],
        suggestedEnhancements: parsed.suggestedEnhancements || ['Additional features based on user feedback'],
      };
    }

    // Return default report if parsing fails
    return getDefaultFeasibilityReport();
  } catch (error) {
    console.error('Cohere feasibility report error:', error);
    return getDefaultFeasibilityReport();
  }
}

function getDefaultFeasibilityReport(): FeasibilityReport {
  return {
    overallFeasibility: 'medium',
    summary: 'Project feasibility could not be fully analyzed. Please review manually.',
    targetAudience: 'General users and stakeholders in the relevant domain.',
    timelineFeasibility: {
      isPossible: true,
      verdict: 'Timeline assessment requires manual review.',
      considerations: ['Break down into manageable milestones', 'Ensure team has required skills']
    },
    requiredSkills: ['Programming', 'Problem Solving', 'Communication', 'Time Management'],
    recommendedSupervisorExpertise: ['Related domain expertise', 'Software Development'],
    suggestedEnhancements: ['Add more features based on user feedback', 'Improve UI/UX'],
  };
}

/**
 * Generate detailed similarity reason with feature overlap analysis
 */
export async function generateSimilarityReason(
  newProject: { title: string; abstract: string; mainFeatures?: string[] },
  similarProject: { title: string; abstract: string; similarityScore: number; mainFeatures?: string[] }
): Promise<string> {
  try {
    const newFeatures = newProject.mainFeatures?.join(', ') || '';
    const simFeatures = similarProject.mainFeatures?.join(', ') || '';
    
    const response = await cohere.chat({
      model: 'command-a-03-2025',
      message: `Compare these two projects and explain their functional similarity in 2-3 complete sentences.

PROJECT A: "${newProject.title}"
${newProject.abstract.substring(0, 400)}
${newFeatures ? `Features: ${newFeatures}` : ''}

PROJECT B: "${similarProject.title}"
${similarProject.abstract.substring(0, 400)}
${simFeatures ? `Features: ${simFeatures}` : ''}

Write 2-3 complete sentences explaining what core functionalities or features these projects share. Focus on specific overlapping capabilities. Use plain text only, no markdown or formatting symbols.`,
      temperature: 0.3,
      maxTokens: 350,
    });

    let reason = response.text?.trim() || '';
    if (reason) {
      // Remove any markdown formatting
      reason = reason.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
      
      // Ensure we have complete sentences - find the last sentence ending
      const lastPeriod = reason.lastIndexOf('.');
      const lastExclamation = reason.lastIndexOf('!');
      const lastQuestion = reason.lastIndexOf('?');
      const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
      
      // Only truncate to last sentence if it's past the minimum length
      if (lastSentenceEnd > 100) {
        reason = reason.substring(0, lastSentenceEnd + 1);
      }
      
      return reason;
    }
    
    return 'Both projects share similar core functionalities and system modules.';
  } catch (error) {
    console.error('Cohere similarity reason error:', error);
    return 'Projects share similar core features and workflows.';
  }
}

/**
 * Generate feature-based embedding text for better similarity comparison
 * This creates a normalized representation focusing on core functionality
 */
export function generateFeatureBasedEmbeddingText(projectInfo: {
  title: string;
  abstract: string;
  description: string;
  mainFeatures?: string[];
  coreModules?: string[];
  workflows?: string[];
}): string {
  const parts = [
    projectInfo.title,
    projectInfo.abstract,
    projectInfo.description,
  ];
  
  // Add features with emphasis
  if (projectInfo.mainFeatures && projectInfo.mainFeatures.length > 0) {
    parts.push('Key Features: ' + projectInfo.mainFeatures.join('. '));
  }
  
  // Add modules
  if (projectInfo.coreModules && projectInfo.coreModules.length > 0) {
    parts.push('System Modules: ' + projectInfo.coreModules.join(', '));
  }
  
  // Add workflows
  if (projectInfo.workflows && projectInfo.workflows.length > 0) {
    parts.push('Workflows: ' + projectInfo.workflows.join('. '));
  }
  
  return parts.filter(Boolean).join(' ').substring(0, 8000);
}

/**
 * Generate detailed duplication warning and differentiation suggestions
 */
export async function generateDifferentiationSuggestions(
  newProject: { title: string; abstract: string; mainFeatures?: string[] },
  similarProjects: Array<{ title: string; abstract: string; similarityScore: number; mainFeatures?: string[] }>
): Promise<{
  isDuplicate: boolean;
  duplicateWarning: string | null;
  overlappingFeatures: string[];
  uniqueFeatures: string[];
  differentiationSuggestions: string[];
}> {
  try {
    const highestScore = Math.max(...similarProjects.map(p => p.similarityScore));
    const isDuplicate = highestScore >= 0.7; // 70% or more is considered duplicate
    
    const similarProjectsText = similarProjects.slice(0, 3).map((p, i) => 
      `Project ${i + 1} (${(p.similarityScore * 100).toFixed(0)}% similar):
Title: ${p.title}
Abstract: ${p.abstract.substring(0, 300)}
Features: ${p.mainFeatures?.join(', ') || 'N/A'}`
    ).join('\n\n');

    const response = await cohere.chat({
      model: 'command-a-03-2025',
      message: `Analyze feature overlap between a new project and existing similar projects.

NEW PROJECT:
Title: ${newProject.title}
Abstract: ${newProject.abstract.substring(0, 400)}
Features: ${newProject.mainFeatures?.join(', ') || 'N/A'}

EXISTING SIMILAR PROJECTS:
${similarProjectsText}

Provide:
1. Which specific features OVERLAP between new and existing projects
2. What features are UNIQUE to the new project (if any)
3. 4-5 specific modifications/additions that would make the new project sufficiently different and innovative

Focus on FUNCTIONALITY, not tech stack. Be specific and actionable.

Respond in JSON:
{
  "overlappingFeatures": ["feature1", "feature2"],
  "uniqueFeatures": ["feature1"],
  "differentiationSuggestions": ["suggestion1", "suggestion2", "suggestion3", "suggestion4"]
}`,
      temperature: 0.4,
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isDuplicate,
        duplicateWarning: isDuplicate 
          ? `⚠️ HIGH SIMILARITY DETECTED (${(highestScore * 100).toFixed(0)}%): This project closely resembles existing submissions. Consider making significant modifications to differentiate your work.`
          : null,
        overlappingFeatures: parsed.overlappingFeatures || [],
        uniqueFeatures: parsed.uniqueFeatures || [],
        differentiationSuggestions: parsed.differentiationSuggestions || [],
      };
    }

    return {
      isDuplicate,
      duplicateWarning: isDuplicate ? 'This project is very similar to existing submissions.' : null,
      overlappingFeatures: [],
      uniqueFeatures: [],
      differentiationSuggestions: ['Consider adding unique features to differentiate your project'],
    };
  } catch (error) {
    console.error('Cohere differentiation suggestions error:', error);
    return {
      isDuplicate: false,
      duplicateWarning: null,
      overlappingFeatures: [],
      uniqueFeatures: [],
      differentiationSuggestions: [],
    };
  }
}

export default cohere;
