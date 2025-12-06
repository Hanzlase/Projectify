// @ts-ignore - pdf-parse doesn't have proper types
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF document.');
  }
}

/**
 * Extract text from DOCX using adm-zip (handles corrupted files better)
 */
function extractTextFromDOCXWithAdmZip(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer);
    const documentXml = zip.readAsText('word/document.xml');
    
    if (!documentXml) {
      throw new Error('Could not find document.xml in DOCX file');
    }
    
    // Extract text content from XML using regex
    // Match <w:t> tags which contain the actual text
    const textParts: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = regex.exec(documentXml)) !== null) {
      if (match[1]) {
        textParts.push(match[1]);
      }
    }
    
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('AdmZip DOCX extraction failed:', error);
    throw error;
  }
}

/**
 * Fallback method to extract text from DOCX by parsing XML directly with JSZip
 */
async function extractTextFromDOCXFallback(buffer: Buffer): Promise<string> {
  try {
    // Dynamically import JSZip to handle the async loading
    const JSZip = (await import('jszip')).default;
    
    const zip = new JSZip();
    
    // Try loading with different options to handle corrupted files
    let zipContent;
    try {
      zipContent = await zip.loadAsync(buffer, { 
        checkCRC32: false,
        optimizedBinaryString: true
      });
    } catch (zipError) {
      // Try with base64 encoding as fallback
      const base64 = buffer.toString('base64');
      zipContent = await zip.loadAsync(base64, { 
        base64: true,
        checkCRC32: false
      });
    }
    
    const documentFile = zipContent.file('word/document.xml');
    if (!documentFile) {
      throw new Error('Could not find document.xml in DOCX file');
    }
    
    // Use 'string' type for text content
    const documentXml = await documentFile.async('text');
    
    if (!documentXml) {
      throw new Error('Document.xml is empty');
    }
    
    // Extract text content from XML using regex
    const textParts: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = regex.exec(documentXml)) !== null) {
      if (match[1]) {
        textParts.push(match[1]);
      }
    }
    
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('JSZip fallback DOCX extraction failed:', error);
    throw error;
  }
}

/**
 * Extract text from a DOCX buffer
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const errors: string[] = [];
  
  // Method 1: Try with adm-zip first (most robust for corrupted files)
  try {
    const admZipText = extractTextFromDOCXWithAdmZip(buffer);
    if (admZipText && admZipText.length > 50) {
      console.log('AdmZip extraction successful');
      return admZipText;
    }
  } catch (admError: any) {
    console.error('AdmZip extraction failed:', admError.message);
    errors.push(`AdmZip: ${admError.message}`);
  }
  
  // Method 2: Try with mammoth (best quality extraction)
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result.value && result.value.length > 50) {
      console.log('Mammoth extraction successful');
      return result.value;
    }
  } catch (error: any) {
    console.error('Mammoth extraction failed:', error.message);
    errors.push(`Mammoth: ${error.message}`);
  }
  
  // Method 3: Try JSZip fallback
  try {
    const fallbackText = await extractTextFromDOCXFallback(buffer);
    if (fallbackText && fallbackText.length > 50) {
      console.log('JSZip fallback extraction successful');
      return fallbackText;
    }
  } catch (fallbackError: any) {
    console.error('JSZip fallback failed:', fallbackError.message);
    errors.push(`JSZip: ${fallbackError.message}`);
  }
  
  console.error('All DOCX extraction methods failed:', errors);
  throw new Error('Failed to extract text from DOCX. The file may be corrupted. Please try: 1) Opening the file in Microsoft Word and saving it again, 2) Converting the document to PDF format before uploading.');
}

/**
 * Extract text from various document types
 * Supports PDF and DOCX formats.
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(buffer);
  }
  
  // DOCX support
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDOCX(buffer);
  }

  // DOC (old format) not supported
  if (mimeType === 'application/msword') {
    throw new Error('Old DOC format not supported. Please upload DOCX or PDF format.');
  }
  
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    throw new Error('PPT/PPTX extraction not yet supported. Please upload PDF or DOCX format.');
  }
  
  throw new Error(`Unsupported document type: ${mimeType}`);
}

/**
 * Clean and normalize extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters that might interfere
    .replace(/[^\w\s.,!?;:()\-'"]/g, '')
    // Trim
    .trim();
}
