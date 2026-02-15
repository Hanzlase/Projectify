import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extractTextFromDocument, cleanExtractedText } from '@/lib/document-parser';
import { 
  generateEmbedding, 
  extractProjectInfo, 
  generateSimilarityExplanation, 
  generateFeasibilityReport, 
  generateSimilarityReason,
  generateFeatureBasedEmbeddingText,
  generateDifferentiationSuggestions
} from '@/lib/cohere';
import { searchSimilarProjects, checkUniqueness } from '@/lib/qdrant';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No document provided' }, { status: 400 });
    }

    // Validate file type - PDF and DOCX supported for text extraction
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Only PDF and DOCX documents are supported for similarity checking.' 
      }, { status: 400 });
    }

    // Extract text from document
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let documentText: string;
    try {
      documentText = await extractTextFromDocument(buffer, file.type);
      documentText = cleanExtractedText(documentText);
    } catch (error: any) {
      console.error('Document extraction error:', error);
      return NextResponse.json({ 
        error: error.message || 'Failed to extract text from document. Please try uploading a different file or converting it to PDF format.'
      }, { status: 400 });
    }

    if (!documentText || documentText.length < 100) {
      return NextResponse.json({ 
        error: 'Could not extract sufficient text from the document. Please ensure the document contains readable text (not just images) and try again.' 
      }, { status: 400 });
    }

    // Step 1: Extract project info from document (must be done first)
    const extractedInfo = await extractProjectInfo(documentText);
    const { title, abstract, description, categories, mainFeatures, coreModules, workflows, techStack } = extractedInfo;

    // Step 2: Run embedding generation AND feasibility report IN PARALLEL
    // These are independent operations — no need to wait for one before starting the other
    const embeddingText = generateFeatureBasedEmbeddingText({
      title, abstract, description, mainFeatures, coreModules, workflows,
    });
    
    console.log('Starting parallel: embedding + feasibility report...');
    const [embedding, feasibilityReport] = await Promise.all([
      generateEmbedding(embeddingText),
      generateFeasibilityReport({ title, abstract, description, categories }),
    ]);
    console.log('Embedding and feasibility report ready');

    // Step 3: Search for similar projects in Qdrant
    console.log('Searching for similar projects...');
    const similarProjects = await searchSimilarProjects(embedding, 3);
    console.log(`Found ${similarProjects.length} similar projects`);

    similarProjects.forEach((p, i) => {
      console.log(`  ${i + 1}. "${p.payload.title}" - Score: ${p.score} (${(p.score * 100).toFixed(2)}%)`);
    });

    const isUnique = checkUniqueness(similarProjects, 0.5);

    // Step 4: Run ALL post-similarity Cohere calls IN PARALLEL
    // Instead of sequential: explanation → reasons × N → differentiation
    // We fire them all at once
    let similarityExplanation = null;
    let similarProjectsWithReasons: any[] = [];
    let differentiationInfo = null;

    if (similarProjects.length > 0) {
      console.log('Generating similarity analysis in parallel...');
      
      // Task A: Similarity explanation (only if not unique)
      const explanationPromise = !isUnique
        ? generateSimilarityExplanation(
            { title, abstract, description },
            similarProjects.map(p => ({
              title: p.payload.title,
              abstract: p.payload.abstract,
              description: p.payload.description,
              similarityScore: p.score,
            }))
          )
        : Promise.resolve(null);
      
      // Task B: All similarity reasons in parallel
      const reasonsPromise = Promise.all(
        similarProjects.map(async (p) => {
          const reason = await generateSimilarityReason(
            { title, abstract, mainFeatures },
            { 
              title: p.payload.title, 
              abstract: p.payload.abstract, 
              similarityScore: p.score,
              mainFeatures: [],
            }
          );
          return {
            projectId: p.payload.projectId,
            title: p.payload.title,
            abstract: p.payload.abstract,
            description: p.payload.description,
            documentUrl: p.payload.documentUrl,
            similarityScore: p.score,
            similarityPercentage: (p.score * 100).toFixed(1),
            rawScore: p.score,
            reason,
          };
        })
      );
      
      // Task C: Differentiation suggestions
      const differentiationPromise = generateDifferentiationSuggestions(
        { title, abstract, mainFeatures },
        similarProjects.map(p => ({
          title: p.payload.title,
          abstract: p.payload.abstract,
          similarityScore: p.score,
          mainFeatures: [],
        }))
      );

      // Run all 3 tasks in parallel
      const [explanationResult, reasonsResult, differentiationResult] = await Promise.all([
        explanationPromise,
        reasonsPromise,
        differentiationPromise,
      ]);
      
      similarityExplanation = explanationResult;
      similarProjectsWithReasons = reasonsResult;
      differentiationInfo = differentiationResult;
      console.log('Similarity analysis complete');
    }

    return NextResponse.json({
      success: true,
      isUnique,
      extractedInfo: {
        title,
        abstract,
        description,
        categories,
        mainFeatures,
        coreModules,
        workflows,
        techStack,
      },
      similarProjects: similarProjectsWithReasons,
      similarityExplanation,
      feasibilityReport,
      differentiationInfo,
      documentText: documentText.substring(0, 500) + '...', // Preview only
    });
  } catch (error) {
    console.error('Error checking project similarity:', error);
    // Return more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      error: `Failed to check project similarity: ${errorMessage}` 
    }, { status: 500 });
  }
}
