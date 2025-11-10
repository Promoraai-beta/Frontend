'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Eye, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

export default function RecruiterDashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch in browser
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    fetch(`${API_BASE_URL}/api/sessions`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setSessions(data.data || []);
        }
      })
      .catch(err => {
        console.error('Error loading sessions:', err);
        // Silently fail - show empty state instead of error
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'active': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'submitted': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'expired': return 'bg-red-500/10 border-red-500/30 text-red-400';
      default: return 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400';
    }
  };

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
              href="/"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              title="Go Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-white">Recruiter Dashboard</h1>
          </div>
          <Link
            href="/dashboard/assessments/create"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Session</span>
            <span className="sm:hidden">Create</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-zinc-400">Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-12 text-center">
                <p className="text-zinc-400 mb-4">No sessions found</p>
                <Link
                  href="/dashboard/assessments/create"
                  className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg inline-flex items-center gap-2 hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Session
                </Link>
              </div>
            ) : (
              <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-900/50 border-b border-zinc-800">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">Session Code</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">Candidate</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300 hidden md:table-cell">Started</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300 hidden lg:table-cell">Submitted</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="px-4 sm:px-6 py-4">
                            <code className="text-emerald-400 font-mono text-xs sm:text-sm">{session.sessionCode || session.session_code || 'N/A'}</code>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-zinc-300 text-xs sm:text-sm">
                            {session.candidateName || session.candidate_name || 'N/A'}
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg border text-xs font-medium ${getStatusColor(session.status)}`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-zinc-400 text-xs sm:text-sm hidden md:table-cell">
                            {session.startedAt || session.started_at ? new Date(session.startedAt || session.started_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-zinc-400 text-xs sm:text-sm hidden lg:table-cell">
                            {session.submittedAt || session.submitted_at ? new Date(session.submittedAt || session.submitted_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex gap-2 sm:gap-3">
                              {session.status === 'active' && (
                                <Link
                                  href={`/dashboard/live/${session.id}`}
                                  className="text-red-400 hover:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-1"
                                >
                                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                  <span className="hidden sm:inline">Live</span>
                                </Link>
                              )}
                              <Link
                                href={`/dashboard/sessions/${session.id}`}
                                className="text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">View</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
