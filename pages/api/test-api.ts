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

  try {
    // Full test request with more complex prompt
    const response = await axios.post(
      apiUrl,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Please provide a brief response.'
          },
          {
            role: 'user',
            content: 'What are three key principles of good software development?'
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout for longer response
      }
    );

    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', response.headers);
    console.log('API Response Usage:', response.data.usage);

    return res.status(200).json({
      success: true,
      message: 'API test completed successfully',
      details: {
        model: response.data.model,
        content: response.data.choices[0]?.message?.content,
        usage: response.data.usage,
        finish_reason: response.data.choices[0]?.finish_reason
      }
    });

  } catch (error: any) {
    console.error('API Test error:', error);

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
      error: 'API test failed',
      details: {
        message: errorData?.error?.message || error.message || 'Unknown error occurred',
        status: status,
        code: error.code
      }
    });
  }
} 