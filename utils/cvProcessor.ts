import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface CVContent {
  text: string;
  language: string;
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

// Extract skills and requirements from text
function extractSkillsAndRequirements(text: string): string[] {
  const commonSkills = [
    // Programming Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust',
    // Web Technologies
    'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'elasticsearch',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd', 'terraform',
    // Frontend
    'html', 'css', 'sass', 'less', 'typescript', 'redux', 'graphql', 'webpack', 'babel',
    // Testing
    'jest', 'mocha', 'cypress', 'selenium', 'junit', 'pytest',
    // Methodologies
    'agile', 'scrum', 'kanban', 'waterfall',
    // Soft Skills
    'leadership', 'communication', 'teamwork', 'problem-solving', 'time management',
    // Other
    'rest', 'api', 'microservices', 'machine learning', 'ai', 'data science', 'big data', 'analytics'
  ];

  const words = text.toLowerCase().split(/\s+/);
  return commonSkills.filter(skill => words.includes(skill));
}

// Calculate match percentage based on skills and text similarity
function calculateMatch(jobDescription: CVContent, candidateCV: CVContent): number {
  try {
    const jobRequirements = extractSkillsAndRequirements(jobDescription.text);
    const candidateSkills = extractSkillsAndRequirements(candidateCV.text);
    
    if (jobRequirements.length === 0) {
      console.warn('No requirements found in job description');
      return 0;
    }
    
    // Calculate skill match
    const matchingSkills = jobRequirements.filter(skill => candidateSkills.includes(skill));
    const skillMatchPercentage = (matchingSkills.length / jobRequirements.length) * 100;
    
    // Calculate text similarity
    const jobWords = new Set(jobDescription.text.toLowerCase().split(/\s+/));
    const candidateWords = new Set(candidateCV.text.toLowerCase().split(/\s+/));
    const commonWords = new Set([...jobWords].filter(word => candidateWords.has(word)));
    const textMatchPercentage = (commonWords.size / jobWords.size) * 100;
    
    // Combine both scores (70% weight for skills, 30% for text similarity)
    return (skillMatchPercentage * 0.7) + (textMatchPercentage * 0.3);
  } catch (error: any) {
    console.error('Error in calculateMatch:', error);
    return 0;
  }
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

export async function compareCVs(jobDescription: CVContent, candidateCVs: CVContent[]): Promise<{ index: number; matchPercentage: number }[]> {
  try {
    if (!jobDescription.text.trim()) {
      throw new Error('Job description is empty');
    }

    if (candidateCVs.length === 0) {
      throw new Error('No candidate CVs provided');
    }

    const results = candidateCVs.map((cv, index) => {
      try {
        const matchPercentage = calculateMatch(jobDescription, cv);
        return { index, matchPercentage };
      } catch (error: any) {
        console.error(`Error processing CV ${index}:`, error);
        return { index, matchPercentage: 0 };
      }
    });

    // Sort by match percentage in descending order
    return results.sort((a, b) => b.matchPercentage - a.matchPercentage);
  } catch (error: any) {
    console.error('Error comparing CVs:', error);
    throw new Error(`Failed to compare CVs: ${error.message}`);
  }
} 