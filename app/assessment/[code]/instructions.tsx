'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedBackground } from '@/components/animated-background';
import { 
  Clock, 
  Play, 
  MessageSquare, 
  Code, 
  Square, 
  Video, 
  AlertTriangle, 
  Lightbulb,
  CheckCircle2,
  User
} from 'lucide-react';

interface InstructionsPageProps {
  sessionCode: string;
  candidateName?: string;
  timeLimit?: number;
  onStart: () => void;
  isStarting: boolean;
  assessmentType?: 'recruiter' | 'candidate';
}

export default function InstructionsPage({
  sessionCode,
  candidateName,
  timeLimit = 3600,
  onStart,
  isStarting,
  assessmentType = 'recruiter'
}: InstructionsPageProps) {
  const isRecruiterAssessment = assessmentType === 'recruiter';
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
    <div className="relative min-h-screen bg-black flex items-center justify-center p-4 md:p-8">
      <AnimatedBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-3xl z-10"
      >
        <Card className="border-zinc-800/50 bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-zinc-900/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5" />
          
          <CardHeader className="relative text-center pb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-full blur-xl" />
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-3 bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Welcome to Your Assessment
              </CardTitle>
              {candidateName && (
                <div className="flex items-center justify-center gap-2 text-zinc-300">
                  <User className="h-4 w-4 text-zinc-400" />
                  <p className="text-lg">Hello, {candidateName}</p>
                </div>
              )}
            </motion.div>
          </CardHeader>

          <CardContent className="relative space-y-5">
            {/* Critical Warning - Tab Switching & Refreshing */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-600/50 rounded-lg p-4 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-300 text-base font-bold mb-2">⚠️ Critical Warning</p>
                  <p className="text-red-200/90 text-sm leading-relaxed">
                    <strong>Switching tabs, refreshing the page, or closing the browser window will cause you to lose your assessment progress.</strong> Please keep this browser tab open and active throughout the entire assessment.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Instructions Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-lg font-semibold text-white mb-3">Instructions</h2>
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
                <ul className="space-y-2.5 text-zinc-300 text-sm list-disc list-inside">
                  <li>
                    You will have <strong className="text-white">{formatTimeLimit(timeLimit)}</strong> to complete this assessment.
                  </li>
                  <li>
                    The timer will start immediately after you click "Start Assessment" and cannot be paused.
                  </li>
                  <li>
                    You can use the Chat tab to get help from an AI assistant.
                  </li>
                  <li>
                    Run your code to test it before submitting.
                  </li>
                  <li>
                    You can end the session early using the "End Session" button if needed.
                  </li>
                  {isRecruiterAssessment && (
                    <li>
                      Your screen and webcam will be recorded during the assessment for the recruiter to review.
                    </li>
                  )}
                </ul>
              </div>
            </motion.div>

            {/* Tip Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-blue-900/20 to-emerald-900/20 border border-blue-700/50 rounded-lg p-4 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-300 text-sm font-semibold mb-1">Tip</p>
                  <p className="text-blue-200/80 text-sm">
                    Read all problems first, then prioritize based on difficulty and time.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Agreement Checkbox */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-4 pt-2"
            >
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked === true)}
                  className="mt-1 h-5 w-5 border-2 border-zinc-500 bg-zinc-800/50 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-500 data-[state=checked]:text-white shadow-sm"
                />
                <span className="text-zinc-300 text-sm leading-relaxed">
                  {isRecruiterAssessment 
                    ? "I understand the instructions and agree to begin the assessment. I acknowledge that my screen and webcam will be recorded for the recruiter to review, and that switching tabs or refreshing will cause me to lose my progress."
                    : "I understand the instructions and agree to begin the assessment. I acknowledge that I may be prompted for screen share and webcam access, but no recording will be saved (self-assessment). I also understand that switching tabs or refreshing will cause me to lose my progress."
                  }
                </span>
              </label>

              <Button
                onClick={onStart}
                disabled={!accepted || isStarting}
                className="w-full px-6 py-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:shadow-none"
              >
                {isStarting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting Assessment...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Play className="h-5 w-5" />
                    Start Assessment
                  </span>
                )}
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

