export const learningPaths = {
  currentGoal: {
    role: "Senior Software Engineer",
    company: "Google",
    targetDate: "2025-12-31",
    progress: 45,
  },
  skillGaps: [
    { skill: "System Design", current: 72, target: 90, priority: "high" },
    { skill: "Distributed Systems", current: 65, target: 85, priority: "high" },
    { skill: "Leadership", current: 58, target: 80, priority: "medium" },
    { skill: "Cloud Architecture", current: 78, target: 92, priority: "medium" },
  ],
  learningModules: [
    {
      id: "1",
      title: "Scalable System Design Patterns",
      description: "Learn to design systems that handle millions of users",
      duration: "4 weeks",
      difficulty: "Advanced",
      progress: 60,
      skills: ["System Design", "Architecture"],
      aiRecommended: true,
      lessons: 12,
      completed: 7,
    },
    {
      id: "2",
      title: "Microservices Architecture",
      description: "Build and deploy microservices-based applications",
      duration: "3 weeks",
      difficulty: "Advanced",
      progress: 30,
      skills: ["Distributed Systems", "Docker", "Kubernetes"],
      aiRecommended: true,
      lessons: 10,
      completed: 3,
    },
    {
      id: "3",
      title: "Technical Leadership Fundamentals",
      description: "Develop skills to lead engineering teams",
      duration: "2 weeks",
      difficulty: "Intermediate",
      progress: 0,
      skills: ["Leadership", "Communication"],
      aiRecommended: false,
      lessons: 8,
      completed: 0,
    },
  ],
  aiInsights: [
    {
      type: "strength",
      message:
        "Your PromptIQ scores show excellent AI collaboration skills. This aligns perfectly with modern senior engineer requirements.",
    },
    {
      type: "improvement",
      message:
        "Focus on system design patterns. Google typically asks 2-3 system design questions in senior engineer interviews.",
    },
    {
      type: "tip",
      message:
        "Practice explaining your thought process while solving problems. Senior roles emphasize communication and mentorship.",
    },
  ],
  weeklyPlan: [
    { day: "Monday", task: "Complete: Database Sharding module", duration: "2 hours" },
    { day: "Tuesday", task: "Practice: System Design Mock Interview", duration: "1.5 hours" },
    { day: "Wednesday", task: "Learn: CAP Theorem & Consistency Models", duration: "2 hours" },
    { day: "Thursday", task: "Build: Distributed Cache Implementation", duration: "3 hours" },
    { day: "Friday", task: "Review: Weekly Progress & AI Feedback", duration: "1 hour" },
  ],
}
