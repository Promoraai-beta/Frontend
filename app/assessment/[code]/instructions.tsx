'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface InstructionsPageProps {
  sessionCode: string;
  candidateName?: string;
  timeLimit?: number;
  onStart: () => void;
  isStarting: boolean;
  assessmentType?: 'recruiter' | 'candidate'; // Add assessment type prop
}

export default function InstructionsPage({
  sessionCode,
  candidateName,
  timeLimit = 3600,
  onStart,
  isStarting,
  assessmentType = 'recruiter' // Default to recruiter for backward compatibility
}: InstructionsPageProps) {
  const isRecruiterAssessment = assessmentType === 'recruiter';
  const isCandidateAssessment = assessmentType === 'candidate';
  const [accepted, setAccepted] = useState(false);

  const formatTimeLimit = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? ` and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="max-w-3xl w-full bg-gray-900 border border-gray-800 rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Your Assessment</h1>
          {candidateName && (
            <p className="text-gray-400">Hello, {candidateName}</p>
          )}
          <p className="text-gray-500 text-sm mt-2 font-mono">Session Code: {sessionCode}</p>
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Instructions</h2>
            <div className="space-y-4 text-gray-300">
              <div className="flex gap-3">
                <span className="text-blue-400 font-bold">1.</span>
                <p>You will have <strong className="text-white">{formatTimeLimit(timeLimit)}</strong> to complete this assessment.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-400 font-bold">2.</span>
                <p>The timer will start immediately after you click "Start Assessment".</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-400 font-bold">3.</span>
                <p>You can use the Chat tab to get help from an AI assistant.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-400 font-bold">4.</span>
                <p>Run your code to test it before submitting.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-400 font-bold">5.</span>
                <p>You can end the session early using the "End Session" button if needed.</p>
              </div>
              {isRecruiterAssessment && (
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold">6.</span>
                  <p>Your screen and webcam will be recorded during the assessment for the recruiter to review.</p>
                </div>
              )}
              {isCandidateAssessment && (
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold">6.</span>
                  <p>You may be prompted to share your screen and webcam, but no recording will be saved (this is a self-assessment).</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-300 text-sm">
              <strong>⚠️ Important:</strong> Once you start, the timer cannot be paused. Make sure you're ready before beginning.
            </p>
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              <strong>💡 Tip:</strong> Read all problems first, then prioritize based on difficulty and time.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-1"
            />
            <span className="text-gray-300 text-sm">
              {isRecruiterAssessment 
                ? "I understand the instructions and agree to begin the assessment. I acknowledge that my screen and webcam will be recorded for the recruiter to review."
                : "I understand the instructions and agree to begin the assessment. I acknowledge that I may be prompted for screen share and webcam access, but no recording will be saved (self-assessment)."
              }
            </span>
          </label>

          <Button
            onClick={onStart}
            disabled={!accepted || isStarting}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition-colors"
          >
            {isStarting ? 'Starting Assessment...' : 'Start Assessment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

