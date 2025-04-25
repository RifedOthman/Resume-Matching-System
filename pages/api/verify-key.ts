import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  // Check if API key exists
  if (!apiKey) {
    console.error('API key is missing');
    return res.status(400).json({
      success: false,
      error: 'OpenAI API key is not configured',
      details: {
        message: 'Please check your .env.local file and ensure OPENAI_API_KEY is set correctly'
      }
    });
  }

  // Log masked API key for debugging
  console.log('Using API key:', `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    // Simple test request to verify the API key
    const response = await axios.post(
      apiUrl,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Test message'
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', response.headers);

    return res.status(200).json({
      success: true,
      message: 'API key verified successfully',
      details: {
        model: response.data.model,
        usage: response.data.usage
      }
    });

  } catch (error: any) {
    console.error('API Key verification error:', error);

    // Extract error details
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    // Handle specific error cases
    if (status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        details: {
          message: 'The provided API key is invalid or has been revoked'
        }
      });
    }
    
    if (status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        details: {
          message: 'Too many requests. Please try again later'
        }
      });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Connection failed',
        details: {
          message: 'Could not connect to OpenAI API. Please check your internet connection'
        }
      });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout',
        details: {
          message: 'The request to OpenAI API timed out'
        }
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'API key verification failed',
      details: {
        message: errorData?.error?.message || error.message || 'Unknown error occurred',
        status: status,
        code: error.code
      }
    });
  }
} 