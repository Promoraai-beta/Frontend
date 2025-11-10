'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateSessionCode } from '@/lib/session';
import { API_BASE_URL } from '@/lib/config';
import { ArrowLeft, Plus, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedBackground } from '@/components/animated-background';
import { RecruiterNavbar } from '@/components/dashboard/recruiter-navbar';

export default function CreateSessionPage() {
  const router = useRouter();
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [timeLimit, setTimeLimit] = useState(60); // minutes
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<any>(null);
  
  // Assessment generation states
  const [assessmentMethod, setAssessmentMethod] = useState<'url' | 'manual' | 'existing' | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssessment, setGeneratedAssessment] = useState<any>(null);
  const [existingAssessmentId, setExistingAssessmentId] = useState('');
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);

  // Generate assessment from URL or manual input
  const handleGenerateAssessment = async () => {
    setIsGenerating(true);
    try {
      let response;
      
      if (assessmentMethod === 'url' && jobUrl) {
        response = await fetch(`${API_BASE_URL}/api/assessments/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: jobUrl })
        });
      } else if (assessmentMethod === 'manual' && jobTitle && company && jobDescription) {
        response = await fetch(`${API_BASE_URL}/api/assessments/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle,
            company,
            jobDescription
          })
        });
      } else {
        alert('Please fill in all required fields');
        setIsGenerating(false);
        return;
      }

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Verify that template is ready before allowing session creation
        if (data.data.templateBuild && data.data.templateBuild.status !== 'ready') {
          alert(`Template is still building (status: ${data.data.templateBuild.status}). Please wait and try again.`);
          setIsGenerating(false);
          return;
        }
        
        setGeneratedAssessment(data.data);
        alert('Assessment generated successfully! Template is ready for use.');
      } else {
        alert(`Failed to generate assessment: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error generating assessment:', error);
      
      // Better error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED')) {
        alert('⚠️ Cannot connect to backend server.\n\nMake sure:\n1. Backend is running on port 5001\n2. Server was restarted after CORS fix\n\nError: ' + error.message);
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Load existing assessments
  const loadExistingAssessments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assessments`);
      const data = await response.json();
      if (data.success) {
        setAvailableAssessments(data.data);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  };

  const handleCreateSession = async () => {
    if (!candidateEmail || !candidateName) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if assessment is required
    let assessmentId = null;
    if (assessmentMethod === 'url' || assessmentMethod === 'manual') {
      if (!generatedAssessment) {
        alert('Please generate an assessment first');
        return;
      }
      assessmentId = generatedAssessment.assessmentId;
    } else if (assessmentMethod === 'existing') {
      if (!existingAssessmentId) {
        alert('Please select an existing assessment');
        return;
      }
      assessmentId = existingAssessmentId;
    }

    setIsCreating(true);

    try {
      const sessionCode = generateSessionCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

      const response = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_code: sessionCode,
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          time_limit: timeLimit * 60, // Convert to seconds
          expires_at: expiresAt.toISOString(),
          assessment_id: assessmentId,
          status: 'pending'
        })
      });

      const data = await response.json();

      if (data.success) {
        setCreatedSession({
          ...data.data,
          sessionCode,
          assessmentUrl: `${window.location.origin}/assessment/${sessionCode}`
        });
      } else {
        alert(`Failed to create session: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (createdSession) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
        {/* Corner Squares */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-600 z-50"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-600 z-50"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-600 z-50"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-600 z-50"></div>

        <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex flex-col overflow-hidden">
          {/* Top Navbar */}
          <div className="h-12 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-white">Session Created</h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
              <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Assessment Invitation Sent Successfully!</h2>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 sm:p-8 text-center">
                    <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-emerald-400 mx-auto mb-4" />
                    <p className="text-emerald-300 text-lg sm:text-xl font-semibold mb-2">
                      Email Sent Successfully!
                    </p>
                    <p className="text-zinc-400 text-sm sm:text-base">
                      The assessment invitation has been sent to the candidate's email address. 
                      They will receive the session link and code to start the assessment.
                    </p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-300 text-sm font-semibold mb-2">
                      📧 The candidate will receive an email with:
                    </p>
                    <ul className="text-zinc-400 text-sm space-y-1 ml-4">
                      <li>• Assessment invitation link</li>
                      <li>• Session code</li>
                      <li>• Time limit information</li>
                      <li>• What to expect during the assessment</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCreatedSession(null);
                      setCandidateEmail('');
                      setCandidateName('');
                    }}
                    className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm transition-colors"
                  >
                    Create Another
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
      {/* Corner Squares */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-600 z-50"></div>

      <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-12 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-white">Create Assessment Session</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Create Assessment Session</h2>
              <p className="text-zinc-400 mb-6 text-sm sm:text-base">Generate a session for a candidate to take an assessment</p>

              <div className="space-y-6">
                {/* Assessment Selection */}
                <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-3">
                    Assessment Type
                  </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="assessmentMethod"
                    value="url"
                    checked={assessmentMethod === 'url'}
                    onChange={(e) => {
                      setAssessmentMethod('url');
                      setGeneratedAssessment(null);
                    }}
                    className="mr-2"
                  />
                  <span className="text-zinc-300">Generate from Job URL</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="assessmentMethod"
                    value="manual"
                    checked={assessmentMethod === 'manual'}
                    onChange={(e) => {
                      setAssessmentMethod('manual');
                      setGeneratedAssessment(null);
                    }}
                    className="mr-2 accent-emerald-500"
                  />
                  <span className="text-zinc-300">Generate from Job Description</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="assessmentMethod"
                    value="existing"
                    checked={assessmentMethod === 'existing'}
                    onChange={(e) => {
                      setAssessmentMethod('existing');
                      loadExistingAssessments();
                    }}
                    className="mr-2 accent-emerald-500"
                  />
                  <span className="text-zinc-300">Use Existing Assessment</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="assessmentMethod"
                    value="none"
                    checked={assessmentMethod === null}
                    onChange={(e) => {
                      setAssessmentMethod(null);
                      setGeneratedAssessment(null);
                    }}
                    className="mr-2 accent-emerald-500"
                  />
                  <span className="text-zinc-300">No Assessment (Manual Setup)</span>
                </label>
              </div>
            </div>

                {/* Job URL Input */}
                {assessmentMethod === 'url' && (
                  <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Job Posting URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="https://company.com/careers/engineer"
                        className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <button
                      onClick={handleGenerateAssessment}
                      disabled={isGenerating || !jobUrl}
                      className="w-full px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isGenerating ? 'Generating Assessment & Building IDE Template...' : 'Generate Assessment'}
                    </button>
                    {isGenerating && (
                      <p className="text-xs text-zinc-400 mt-2">
                        ⏳ This may take a minute - building the IDE template...
                      </p>
                    )}
                    {generatedAssessment && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-emerald-300 text-sm font-medium">✅ Assessment Generated & IDE Template Ready!</p>
                        <p className="text-emerald-400 text-xs mt-1">
                          Role: {generatedAssessment.role} | Level: {generatedAssessment.level}
                        </p>
                        <p className="text-emerald-400 text-xs">
                          {generatedAssessment.suggestedAssessments?.length || 0} assessment tasks created
                        </p>
                        {generatedAssessment.templateBuild && (
                          <p className="text-emerald-400 text-xs mt-1">
                            IDE Template: {generatedAssessment.templateBuild.type === 'webcontainer' 
                              ? `Ready (${generatedAssessment.templateBuild.fileCount || 0} files)`
                              : generatedAssessment.templateBuild.type === 'docker'
                              ? `Docker image built (${generatedAssessment.templateBuild.imageSize || 0}MB)`
                              : 'Ready'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Job Description Input */}
                {assessmentMethod === 'manual' && (
                  <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Job Title <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Senior Frontend Developer"
                        className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Company <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="TechCorp Inc."
                        className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Job Description <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="We are looking for a Senior Frontend Developer with experience in React, TypeScript..."
                        rows={5}
                        className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                      />
                    </div>
                    <button
                      onClick={handleGenerateAssessment}
                      disabled={isGenerating || !jobTitle || !company || !jobDescription}
                      className="w-full px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isGenerating ? 'Generating Assessment & Building IDE Template...' : 'Generate Assessment'}
                    </button>
                    {isGenerating && (
                      <p className="text-xs text-zinc-400 mt-2">
                        ⏳ This may take a minute - building the IDE template...
                      </p>
                    )}
                    {generatedAssessment && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-emerald-300 text-sm font-medium">✅ Assessment Generated & IDE Template Ready!</p>
                        <p className="text-emerald-400 text-xs mt-1">
                          Role: {generatedAssessment.role} | Level: {generatedAssessment.level}
                        </p>
                        {generatedAssessment.templateBuild && (
                          <p className="text-emerald-400 text-xs mt-1">
                            IDE Template: {generatedAssessment.templateBuild.type === 'webcontainer' 
                              ? `Ready (${generatedAssessment.templateBuild.fileCount || 0} files)`
                              : generatedAssessment.templateBuild.type === 'docker'
                              ? `Docker image built (${generatedAssessment.templateBuild.imageSize || 0}MB)`
                              : 'Ready'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Existing Assessments */}
                {assessmentMethod === 'existing' && (
                  <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Select Assessment
                    </label>
                    <select
                      value={existingAssessmentId}
                      onChange={(e) => setExistingAssessmentId(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    >
                      <option value="">-- Select an assessment --</option>
                      {availableAssessments.map((assessment: any) => (
                        <option key={assessment.id} value={assessment.id}>
                          {assessment.jobTitle} at {assessment.company} ({assessment.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Candidate Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Candidate Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                    className="w-full px-4 py-3 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
                    min="15"
                    max="180"
                    className="w-full px-4 py-3 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Default: 60 minutes</p>
                </div>

                <button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  className="w-full px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isCreating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
