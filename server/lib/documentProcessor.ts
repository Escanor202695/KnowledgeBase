import mammoth from 'mammoth';
import { promises as fs } from 'fs';
import { PDFParse } from 'pdf-parse';

/**
 * Extract text from PDF file
 */
export async function extractPdfText(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await PDFParse(dataBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains only images (scanned PDF). Please use a text-based PDF or OCR the document first.');
    }
    
    return data.text;
  } catch (error: any) {
    // Provide helpful error messages  
    if (error.message.includes('empty') || error.message.includes('images')) {
      throw error;
    }
    if (error.message.includes('Invalid PDF') || error.message.includes('Invalid XRef stream')) {
      throw new Error('Invalid or corrupted PDF file. Please check the file and try again.');
    }
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractDocxText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error: any) {
    throw new Error(`Failed to extract DOCX text: ${error.message}`);
  }
}

/**
 * Extract text from TXT file
 */
export async function extractTxtText(filePath: string): Promise<string> {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    return text;
  } catch (error: any) {
    throw new Error(`Failed to read TXT file: ${error.message}`);
  }
}

/**
 * Extract text from any supported document type
 */
export async function extractDocumentText(filePath: string, fileType: string): Promise<string> {
  const type = fileType.toLowerCase();
  
  if (type === 'pdf' || type === 'application/pdf') {
    return extractPdfText(filePath);
  } else if (type === 'docx' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractDocxText(filePath);
  } else if (type === 'txt' || type === 'text/plain') {
    return extractTxtText(filePath);
  } else {
    throw new Error(`Unsupported document type: ${type}`);
  }
}

/**
 * Get a title from document content (first line or first 100 chars)
 */
export function generateDocumentTitle(content: string, filename: string): string {
  // Try to get first non-empty line
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length > 0 && firstLine.length <= 100) {
      return firstLine;
    }
    if (firstLine.length > 100) {
      return firstLine.substring(0, 97) + '...';
    }
  }
  
  // Fallback to filename without extension
  return filename.replace(/\.[^/.]+$/, '');
}
