export interface Job {
  id: string
  title: string
  department: string
  location: string
  candidatesSelected: number
  candidatesAttempted: number
  candidatesCompleted: number
  assessmentType: string
  createdAt: string
  status: "active" | "closed" | "draft"
}

export interface Candidate {
  id: string // Session ID (used for "View Live" and "View Result" links)
  sessionId?: string // Explicit session ID (optional, for clarity)
  name: string
  email: string
  jobId: string
  assessmentStatus: "not-started" | "in-progress" | "completed"
  score?: number
  attemptedAt?: string
  submittedAt?: string
  duration?: string
  complianceViolations: number
}

export interface Assessment {
  id: string
  candidateId: string
  title: string
  description: string
  duration: string
  totalQuestions: number
  passingScore: number
  attemptedAt: string
  submittedAt: string
  timeSpent: string
}

export interface AssessmentResult {
  id: string
  candidateId: string
  assessmentId: string
  score: number
  totalScore: number
  percentage: number
  passed: boolean
  videoUrl: string
  compliances: Compliance[]
  answers: Answer[]
}

export interface Compliance {
  id: string
  rule: string
  description: string
  satisfied: boolean
  violationCount: number
  timestamp?: string
}

export interface Answer {
  questionId: string
  question: string
  answer: string
  correct: boolean
  points: number
}

export const mockJobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    department: "Engineering",
    location: "Remote",
    candidatesSelected: 45,
    candidatesAttempted: 38,
    candidatesCompleted: 35,
    assessmentType: "Technical Assessment",
    createdAt: "2024-03-01",
    status: "active",
  },
  {
    id: "2",
    title: "Product Manager",
    department: "Product",
    location: "San Francisco, CA",
    candidatesSelected: 28,
    candidatesAttempted: 24,
    candidatesCompleted: 22,
    assessmentType: "Case Study",
    createdAt: "2024-03-05",
    status: "active",
  },
  {
    id: "3",
    title: "UX Designer",
    department: "Design",
    location: "New York, NY",
    candidatesSelected: 32,
    candidatesAttempted: 28,
    candidatesCompleted: 26,
    assessmentType: "Design Challenge",
    createdAt: "2024-03-10",
    status: "active",
  },
  {
    id: "4",
    title: "Data Scientist",
    department: "Data",
    location: "Remote",
    candidatesSelected: 18,
    candidatesAttempted: 15,
    candidatesCompleted: 14,
    assessmentType: "Technical Assessment",
    createdAt: "2024-03-12",
    status: "active",
  },
]

export const mockCandidates: Candidate[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex.johnson@email.com",
    jobId: "1",
    assessmentStatus: "completed",
    score: 92,
    attemptedAt: "2024-03-15 10:30 AM",
    submittedAt: "2024-03-15 12:15 PM",
    duration: "1h 45m",
    complianceViolations: 0,
  },
  {
    id: "2",
    name: "Sarah Williams",
    email: "sarah.w@email.com",
    jobId: "1",
    assessmentStatus: "completed",
    score: 88,
    attemptedAt: "2024-03-15 02:00 PM",
    submittedAt: "2024-03-15 03:50 PM",
    duration: "1h 50m",
    complianceViolations: 1,
  },
  {
    id: "3",
    name: "Michael Chen",
    email: "mchen@email.com",
    jobId: "1",
    assessmentStatus: "completed",
    score: 76,
    attemptedAt: "2024-03-16 09:00 AM",
    submittedAt: "2024-03-16 10:55 AM",
    duration: "1h 55m",
    complianceViolations: 3,
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily.davis@email.com",
    jobId: "1",
    assessmentStatus: "in-progress",
    attemptedAt: "2024-03-16 11:30 AM",
    duration: "45m",
    complianceViolations: 0,
  },
  {
    id: "5",
    name: "James Wilson",
    email: "jwilson@email.com",
    jobId: "1",
    assessmentStatus: "not-started",
    complianceViolations: 0,
  },
]

export const mockAssessment: Assessment = {
  id: "assessment-1",
  candidateId: "1",
  title: "Senior Frontend Developer Technical Assessment",
  description:
    "This comprehensive assessment evaluates your proficiency in modern frontend development technologies including React, TypeScript, and state management. You will be tested on your ability to build scalable applications, write clean code, and solve complex problems.",
  duration: "2 hours",
  totalQuestions: 25,
  passingScore: 70,
  attemptedAt: "2024-03-15 10:30 AM",
  submittedAt: "2024-03-15 12:15 PM",
  timeSpent: "1h 45m",
}

export const mockResult: AssessmentResult = {
  id: "result-1",
  candidateId: "1",
  assessmentId: "assessment-1",
  score: 92,
  totalScore: 100,
  percentage: 92,
  passed: true,
  videoUrl: "/placeholder.svg?height=400&width=600",
  compliances: [
    {
      id: "c1",
      rule: "No Tab Switching",
      description: "Candidate must not switch to other browser tabs during assessment",
      satisfied: true,
      violationCount: 0,
    },
    {
      id: "c2",
      rule: "No External Search",
      description: "Candidate must not search for answers on Google or other search engines",
      satisfied: true,
      violationCount: 0,
    },
    {
      id: "c3",
      rule: "Camera Always On",
      description: "Candidate must keep their camera on throughout the assessment",
      satisfied: true,
      violationCount: 0,
    },
    {
      id: "c4",
      rule: "Single Person Detected",
      description: "Only one person should be visible in the camera frame",
      satisfied: true,
      violationCount: 0,
    },
    {
      id: "c5",
      rule: "No Copy-Paste",
      description: "Candidate must not copy-paste code from external sources",
      satisfied: true,
      violationCount: 0,
    },
  ],
  answers: [
    {
      questionId: "q1",
      question: "What is the purpose of React hooks?",
      answer: "React hooks allow functional components to use state and lifecycle features",
      correct: true,
      points: 4,
    },
    {
      questionId: "q2",
      question: "Explain the difference between useMemo and useCallback",
      answer: "useMemo memoizes values while useCallback memoizes functions",
      correct: true,
      points: 4,
    },
  ],
}

export const mockCompanyInfo = {
  name: "TechCorp Solutions",
  logo: "/placeholder.svg?height=80&width=80",
  industry: "Technology",
  size: "500-1000 employees",
  location: "San Francisco, CA",
  website: "www.techcorp.com",
  description: "Leading technology solutions provider specializing in enterprise software and cloud services.",
}
