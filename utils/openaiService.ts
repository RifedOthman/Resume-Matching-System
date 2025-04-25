import axios from 'axios';

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface MatchAnalysis {
  matchPercentage: number;
  technicalSkillsMatch: {
    matching: string[];
    missing: string[];
    score: number;
  };
  experienceMatch: {
    relevantExperience: string[];
    score: number;
  };
  overallAnalysis: string;
}

// Helper function to extract JSON from markdown-formatted string
function extractJsonFromString(str: string): string {
  // Remove markdown code block syntax if present
  str = str.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Find the first { and last } to extract the JSON object
  const start = str.indexOf('{');
  const end = str.lastIndexOf('}');
  
  if (start === -1 || end === -1) {
    throw new Error('No valid JSON object found in response');
  }
  
  return str.slice(start, end + 1);
}

export async function analyzeMatch(jobDescription: string, cvText: string): Promise<MatchAnalysis> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const prompt = `
      As an expert HR analyst, analyze the match between this job description and CV.
      Return ONLY a JSON object without any additional text or markdown formatting.
      
      Job Description:
      ${jobDescription}

      CV:
      ${cvText}

      Response format (fill in the values):
      {
        "matchPercentage": number between 0-100,
        "technicalSkillsMatch": {
          "matching": ["skill1", "skill2", ...],
          "missing": ["skill1", "skill2", ...],
          "score": number between 0-100
        },
        "experienceMatch": {
          "relevantExperience": ["experience1", "experience2", ...],
          "score": number between 0-100
        },
        "overallAnalysis": "detailed analysis string"
      }
    `;

    console.log('Making API request to OpenAI...');
    
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR analyst who evaluates CV matches. Always respond with clean JSON only, no markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('OpenAI API Raw Response:', response.data.choices[0]?.message?.content);

    if (!response.data.choices || !response.data.choices[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const cleanJson = extractJsonFromString(response.data.choices[0].message.content);
    console.log('Cleaned JSON:', cleanJson);

    try {
      const analysis = JSON.parse(cleanJson);
      return analysis as MatchAnalysis;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

  } catch (error: any) {
    console.error('Error in OpenAI API call:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    }
    if (error.response?.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    }
    throw new Error(`Failed to analyze match: ${error.message}`);
  }
}

// Utility function to handle rate limiting and retries
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      if (error.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
} 