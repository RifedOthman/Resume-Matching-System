import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { extractTextFromPDF, compareCVs, CVContent, detectLanguage } from '@/utils/cvProcessor';
import Layout from '@/components/Layout';

interface CV {
  id: string;
  name: string;
  file: File;
  matchPercentage?: number;
  content?: CVContent;
}

export default function Home() {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [jobDescription, setJobDescription] = useState<File | null>(null);
  const [jobDescriptionText, setJobDescriptionText] = useState<string>('');
  const [jobDescriptionContent, setJobDescriptionContent] = useState<CVContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMethod, setInputMethod] = useState<'pdf' | 'text'>('text');
  const [error, setError] = useState<string | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const newCVs = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file,
    }));
    setCvs(prev => [...prev, ...newCVs]);
    toast.success(`${acceptedFiles.length} CV(s) uploaded successfully!`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    }
  });

  const handleJobDescriptionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setJobDescription(file);
      try {
        const content = await extractTextFromPDF(file);
        setJobDescriptionContent(content);
        setError(null);
        toast.success('Job description uploaded and processed!');
      } catch (error: any) {
        setError(error.message);
        toast.error(`Error processing job description: ${error.message}`);
        console.error(error);
      }
    }
  };

  const handleTextInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setJobDescriptionText(text);
    if (text.trim()) {
      try {
        const language = detectLanguage(text);
        setJobDescriptionContent({
          text,
          language
        });
        setError(null);
      } catch (error: any) {
        setError(error.message);
        console.error(error);
      }
    } else {
      setJobDescriptionContent(null);
    }
  };

  const processCVs = async () => {
    if (!jobDescriptionContent) {
      setError('Please provide a job description first!');
      toast.error('Please provide a job description first!');
      return;
    }
    if (cvs.length === 0) {
      setError('Please upload candidate CVs first!');
      toast.error('Please upload candidate CVs first!');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      // Process all CVs
      const processedCVs = await Promise.all(
        cvs.map(async (cv) => {
          if (!cv.content) {
            try {
              const content = await extractTextFromPDF(cv.file);
              return { ...cv, content };
            } catch (error: any) {
              console.error(`Error processing CV ${cv.name}:`, error);
              toast.error(`Error processing CV ${cv.name}: ${error.message}`);
              return { ...cv, content: { text: '', language: 'Unknown' } };
            }
          }
          return cv;
        })
      );

      // Compare CVs
      const results = await compareCVs(
        jobDescriptionContent,
        processedCVs.map(cv => cv.content!)
      );

      // Update CVs with match percentages
      const updatedCVs = processedCVs.map((cv, index) => ({
        ...cv,
        matchPercentage: results.find(r => r.index === index)?.matchPercentage
      }));

      setCvs(updatedCVs);
      toast.success('CV matching completed!');
    } catch (error: any) {
      setError(error.message);
      toast.error(`Error processing CVs: ${error.message}`);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              CV Matching System
            </h1>
            <p className="mt-3 text-xl text-gray-500">
              Upload a job description and candidate CVs to find the best matches
            </p>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Job Description Input */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Job Description</h2>
              
              {/* Input Method Toggle */}
              <div className="mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="inputMethod"
                    checked={inputMethod === 'text'}
                    onChange={() => setInputMethod('text')}
                  />
                  <span className="ml-2">Text Input</span>
                </label>
                <label className="inline-flex items-center ml-6">
                  <input
                    type="radio"
                    className="form-radio"
                    name="inputMethod"
                    checked={inputMethod === 'pdf'}
                    onChange={() => setInputMethod('pdf')}
                  />
                  <span className="ml-2">PDF Upload</span>
                </label>
              </div>

              {inputMethod === 'text' ? (
                <textarea
                  className="w-full h-48 p-2 border border-gray-300 rounded-md"
                  placeholder="Enter job description here..."
                  value={jobDescriptionText}
                  onChange={handleTextInput}
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleJobDescriptionUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  {jobDescription && (
                    <p className="mt-2 text-sm text-gray-600">
                      Uploaded: {jobDescription.name}
                      {jobDescriptionContent && ` (${jobDescriptionContent.language})`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Candidate CVs Upload */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Candidate CVs</h2>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              >
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p>Drop the CVs here...</p>
                ) : (
                  <p>Drag and drop CVs here, or click to select files</p>
                )}
              </div>
            </div>
          </div>

          {/* CV List */}
          {cvs.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Uploaded CVs</h2>
              </div>
              <ul className="divide-y divide-gray-200">
                {cvs.map((cv) => (
                  <li key={cv.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg
                          className="h-6 w-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="ml-2 text-gray-900">{cv.name}</span>
                        {cv.content && (
                          <span className="ml-2 text-sm text-gray-500">
                            ({cv.content.language})
                          </span>
                        )}
                      </div>
                      {cv.matchPercentage && (
                        <span className="text-sm font-medium text-blue-600">
                          {cv.matchPercentage}% match
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Process Button */}
          <div className="mt-8 text-center">
            <button
              onClick={processCVs}
              disabled={isProcessing || !jobDescriptionContent || cvs.length === 0}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white
                ${isProcessing || !jobDescriptionContent || cvs.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isProcessing ? 'Processing...' : 'Find Best Matches'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
