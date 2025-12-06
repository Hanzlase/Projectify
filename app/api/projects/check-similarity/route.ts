import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extractTextFromDocument, cleanExtractedText } from '@/lib/document-parser';
import { generateEmbedding, extractProjectInfo, generateSimilarityExplanation } from '@/lib/cohere';
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

    // Extract title, abstract, description and categories using Cohere
    const { title, abstract, description, categories } = await extractProjectInfo(documentText);

    // Generate embedding for the project
    const combinedText = `${title} ${abstract} ${description}`;
    console.log('Generating embedding for similarity search...');
    const embedding = await generateEmbedding(combinedText);

    // Search for similar projects - ALWAYS get top 3 if they exist
    // This searches ALL projects in Qdrant (both public and private)
    console.log('Searching for similar projects...');
    const similarProjects = await searchSimilarProjects(embedding, 3);
    console.log(`Found ${similarProjects.length} similar projects`);

    // Log similarity scores for debugging
    similarProjects.forEach((p, i) => {
      console.log(`  ${i + 1}. "${p.payload.title}" - ${(p.score * 100).toFixed(1)}% similar`);
    });

    // Check uniqueness (threshold: 50% similarity = not unique)
    const isUnique = checkUniqueness(similarProjects, 0.5);

    // If not unique, generate explanation
    let similarityExplanation = null;
    if (!isUnique && similarProjects.length > 0) {
      similarityExplanation = await generateSimilarityExplanation(
        { title, abstract, description },
        similarProjects.map(p => ({
          title: p.payload.title,
          abstract: p.payload.abstract,
          description: p.payload.description,
          similarityScore: p.score,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      isUnique,
      extractedInfo: {
        title,
        abstract,
        description,
        categories,
      },
      similarProjects: similarProjects.map(p => ({
        projectId: p.payload.projectId,
        title: p.payload.title,
        abstract: p.payload.abstract,
        description: p.payload.description,
        documentUrl: p.payload.documentUrl,
        similarityScore: p.score,
        similarityPercentage: (p.score * 100).toFixed(1),
      })),
      similarityExplanation,
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
