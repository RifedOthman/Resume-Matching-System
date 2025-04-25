import * as pdfjs from 'pdfjs-dist';
import { analyzeMatch, MatchAnalysis } from './openaiService';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface CVContent {
  text: string;
  language: string;
  analysis?: MatchAnalysis;
}

// Simple language detection based on common words
export function detectLanguage(text: string): string {
  const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'est', 'dans', 'pour'];
  const englishWords = ['the', 'a', 'an', 'and', 'is', 'in', 'for', 'to', 'of', 'with'];
  
  const words = text.toLowerCase().split(/\s+/);
  let frenchCount = 0;
  let englishCount = 0;
  
  words.forEach(word => {
    if (frenchWords.includes(word)) frenchCount++;
    if (englishWords.includes(word)) englishCount++;
  });
  
  return frenchCount > englishCount ? 'French' : 'English';
}

export async function extractTextFromPDF(file: File): Promise<CVContent> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    if (!fullText.trim()) {
      throw new Error('No text content found in PDF');
    }

    // Detect language
    const language = detectLanguage(fullText);
    
    return {
      text: fullText,
      language
    };
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

export async function compareCVs(jobDescription: CVContent, candidateCVs: CVContent[]): Promise<{ index: number; matchPercentage: number; analysis: MatchAnalysis }[]> {
  try {
    if (!jobDescription.text.trim()) {
      throw new Error('Job description is empty');
    }

    if (candidateCVs.length === 0) {
      throw new Error('No candidate CVs provided');
    }

    // Process each CV with OpenAI analysis
    const results = await Promise.all(
      candidateCVs.map(async (cv, index) => {
        try {
          // Get analysis from OpenAI
          const analysis = await analyzeMatch(jobDescription.text, cv.text);
          return {
            index,
            matchPercentage: analysis.matchPercentage,
            analysis
          };
        } catch (error: any) {
          console.error(`Error processing CV ${index}:`, error);
          return {
            index,
            matchPercentage: 0,
            analysis: {
              matchPercentage: 0,
              technicalSkillsMatch: {
                matching: [],
                missing: [],
                score: 0
              },
              experienceMatch: {
                relevantExperience: [],
                score: 0
              },
              overallAnalysis: `Error analyzing CV: ${error.message}`
            }
          };
        }
      })
    );

    // Sort by match percentage in descending order
    return results.sort((a, b) => b.matchPercentage - a.matchPercentage);
  } catch (error: any) {
    console.error('Error comparing CVs:', error);
    throw new Error(`Failed to compare CVs: ${error.message}`);
  }
} 