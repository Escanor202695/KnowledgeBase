import mammoth from 'mammoth';
import { promises as fs } from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// pdfjs-dist is a robust PDF parser used by Firefox
// Using legacy build for Node.js compatibility (no DOMMatrix required)

/**
 * Extract text from PDF file using pdfjs-dist
 */
export async function extractPdfText(filePath: string): Promise<string> {
  let loadingTask: any = null;
  let pdf: any = null;
  
  try {
    const dataBuffer = await fs.readFile(filePath);
    
    // Load the PDF document
    loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer),
      useSystemFonts: true,
      verbosity: 0, // Suppress warnings
    });
    
    pdf = await loadingTask.promise;
    
    // Extract text from all pages
    const textPages: string[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items with proper spacing
      const pageText = textContent.items
        .map((item: any) => {
          // Handle both text items and marked content
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (pageText) {
        textPages.push(pageText);
      }
    }
    
    const fullText = textPages.join('\n\n').trim();
    
    if (!fullText || fullText.length === 0) {
      throw new Error('PDF appears to be empty or contains only images (scanned PDF). Please use a text-based PDF or OCR the document first.');
    }
    
    return fullText;
  } catch (error: any) {
    // Check for specific pdfjs error types
    if (error.name === 'PasswordException' || error.message.includes('encrypted')) {
      throw new Error('PDF is password-protected. Please provide an unprotected PDF file.');
    }
    
    // User-facing error messages
    if (error.message.includes('empty') || error.message.includes('images') || error.message.includes('scanned')) {
      throw error;
    }
    if (error.name === 'InvalidPDFException' || error.message.includes('Invalid PDF') || error.message.includes('corrupted')) {
      throw new Error('Invalid or corrupted PDF file. Please check the file and try again.');
    }
    
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  } finally {
    // Ensure proper cleanup even on errors to prevent resource leaks
    try {
      if (pdf) {
        await pdf.cleanup();
        await pdf.destroy();
      }
      if (loadingTask) {
        await loadingTask.destroy();
      }
    } catch (cleanupError) {
      console.error('PDF cleanup error:', cleanupError);
    }
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
