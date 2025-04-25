import { useState } from 'react';
import Layout from '@/components/Layout';

interface KeyStatus {
  success: boolean;
  message: string;
}

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);

  const verifyApiKey = async () => {
    setLoading(true);
    setError(null);
    setKeyStatus(null);
    try {
      const response = await fetch('/api/verify-key', {
        method: 'POST',
      });
      
      const data = await response.json();
      console.log('API Key verification response:', data);
      
      if (!response.ok) {
        throw new Error(
          data.error || 
          data.details?.message || 
          `HTTP error! status: ${response.status}`
        );
      }
      
      setKeyStatus({
        success: data.success,
        message: data.message || 'API key verified successfully'
      });
      
      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'API key verification failed';
      setError(errorMessage);
      setKeyStatus({
        success: false,
        message: errorMessage
      });
      console.error('API key verification failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-api', {
        method: 'POST',
      });
      
      const data = await response.json();
      console.log('API test response:', data);
      
      if (!response.ok) {
        throw new Error(
          data.error || 
          data.details?.message || 
          `HTTP error! status: ${response.status}`
        );
      }
      
      setResult(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Test failed';
      setError(errorMessage);
      console.error('Test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              CV Matching with OpenAI
            </h1>
            <p className="mt-2 text-gray-600">
              Test the CV matching system powered by OpenAI
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              {/* API Key Verification */}
              <div>
                <button
                  onClick={verifyApiKey}
                  disabled={loading}
                  className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                    ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {loading ? 'Verifying...' : 'Verify API Key'}
                </button>

                {keyStatus && (
                  <div className={`mt-2 p-2 rounded-md ${keyStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {keyStatus.message}
                  </div>
                )}
              </div>

              {/* Full API Test */}
              <div>
                <button
                  onClick={testAPI}
                  disabled={loading || !keyStatus?.success}
                  className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                    ${loading || !keyStatus?.success ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {loading ? 'Testing...' : 'Test Full API'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {result && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold mb-2">API Response:</h2>
                <pre className="bg-gray-50 p-4 rounded-md overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 