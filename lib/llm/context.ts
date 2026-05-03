/**
 * Full Workflow Context for assessment chat.
 * Gives the AI access to IDE files, problems, instructions, output, and active tab.
 */

export interface FullWorkflowContext {
  /** IDE: file tree and contents */
  ide?: {
    fileTree: string[];
    files: Array<{ path: string; content: string }>;
    focusedFile?: string;
  };
  /** Assessment: problems, instructions, metadata */
  assessment?: {
    problems: Array<{
      id: string;
      title: string;
      description: string;
      constraints?: string;
      examples?: string;
    }>;
    instructions?: string;
    metadata?: {
      jobTitle: string;
      role: string;
      timeRemaining?: number;
    };
  };
  /** Runtime output: last run, test results */
  output?: {
    lastRunResult?: string;
    testResults?: string;
  };
  /** Current tab: task | chat | code | ide */
  activeTab?: string;
}

const MAX_CHARS_PER_FILE = 2000;
const MAX_FILES = 8;

/** Build system prompt from full workflow context */
export function buildFullWorkflowSystemPrompt(context: FullWorkflowContext | undefined): string {
  if (!context) {
    return `You are an AI assistant helping a candidate during a coding assessment. Answer helpfully and guide without giving full solutions.`;
  }

  const parts: string[] = [
    `You are an AI assistant helping a candidate during a coding assessment. You have access to the full assessment workflow, not just the IDE.`,
    ``,
    `## Your context includes`,
    ``,
    `1. **Assessment overview** – role, job title, instructions, time limits`,
    `2. **Problems** – all problem statements, constraints, examples, expected behavior`,
    `3. **Codebase** – file tree and file contents from the IDE (when available)`,
    `4. **Output** – last run result, test output, errors (when available)`,
    `5. **Current location** – which tab the candidate is on`,
    ``,
    `## Your role`,
    ``,
    `- Answer questions using the context above, regardless of which tab the candidate is on`,
    `- When they ask about a problem, use the problem statement and examples`,
    `- When they ask about code, use the relevant file contents`,
    `- When they ask about errors or test failures, use the run/test output and code`,
    `- When they ask about instructions or rules, use the assessment overview`,
    `- Do not give full solutions or complete implementations – guide, clarify, and explain instead`,
    `- Stay within assessment integrity rules (no full-code answers, no external search)`,
    ``,
    `## How to respond`,
    ``,
    `1. Identify which part of the workflow their question refers to`,
    `2. Use the appropriate context (problems, code, output, instructions)`,
    `3. Give focused, actionable guidance`,
    `4. Reference specific files, problem numbers, or line ranges when helpful`,
    `5. If information is missing from the context, say so and suggest where to look`,
    ``,
    `The candidate is currently on: **${context.activeTab || 'unknown'}** tab.`,
    ``,
  ];

  if (context.assessment?.metadata) {
    parts.push(`### Assessment`);
    parts.push(`- Role: ${context.assessment.metadata.role || 'N/A'}`);
    parts.push(`- Job: ${context.assessment.metadata.jobTitle || 'N/A'}`);
    if (context.assessment.metadata.timeRemaining !== undefined) {
      const mins = Math.floor(context.assessment.metadata.timeRemaining / 60000);
      parts.push(`- Time remaining: ~${mins} minutes`);
    }
    parts.push(``);
  }

  if (context.assessment?.problems && context.assessment.problems.length > 0) {
    parts.push(`### Problems`);
    context.assessment.problems.forEach((p, i) => {
      parts.push(`--- Problem ${i + 1}: ${p.title} ---`);
      parts.push(p.description);
      if (p.constraints) parts.push(`Constraints: ${p.constraints}`);
      if (p.examples) parts.push(`Examples: ${p.examples}`);
      parts.push(``);
    });
  }

  if (context.assessment?.instructions) {
    parts.push(`### Instructions`);
    parts.push(context.assessment.instructions);
    parts.push(``);
  }

  if (context.ide?.fileTree && context.ide.fileTree.length > 0) {
    parts.push(`### Codebase (file tree)`);
    parts.push(context.ide.fileTree.join('\n'));
    parts.push(``);
  }

  if (context.ide?.files && context.ide.files.length > 0) {
    parts.push(`### File contents`);
    context.ide.files.forEach(f => {
      const truncated = f.content.length > MAX_CHARS_PER_FILE
        ? f.content.slice(0, MAX_CHARS_PER_FILE) + '\n...[truncated]'
        : f.content;
      parts.push(`--- ${f.path} ---`);
      parts.push(truncated);
      parts.push(``);
    });
  }

  if (context.output?.lastRunResult || context.output?.testResults) {
    parts.push(`### Output (last run / tests)`);
    if (context.output.lastRunResult) parts.push(context.output.lastRunResult);
    if (context.output.testResults) parts.push(context.output.testResults);
    parts.push(``);
  }

  parts.push(`Use the context above to answer the candidate's question. Do not give full solutions.`);

  return parts.join('\n');
}

/** Select and truncate files for context (prioritize by path, limit size) */
export function selectFilesForContext(
  allFiles: Record<string, string>,
  maxFiles = MAX_FILES,
  maxCharsPerFile = MAX_CHARS_PER_FILE
): Array<{ path: string; content: string }> {
  const paths = Object.keys(allFiles)
    .filter(p => !p.includes('node_modules') && !p.includes('.git'))
    .sort();
  
  const result: Array<{ path: string; content: string }> = [];
  for (const path of paths) {
    if (result.length >= maxFiles) break;
    const content = allFiles[path];
    if (typeof content !== 'string') continue;
    const truncated = content.length > maxCharsPerFile
      ? content.slice(0, maxCharsPerFile) + '\n...[truncated]'
      : content;
    result.push({ path, content: truncated });
  }
  return result;
}
