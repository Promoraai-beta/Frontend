// Judge0 API integration for code execution
// Free tier: 50 requests/day
// https://rapidapi.com/hermanzdosilovic/api/judge0

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

export class Judge0Service {
  private apiKey: string;
  private baseUrl = 'https://judge0-ce.p.rapidapi.com';

  constructor() {
    // For now, using free public API
    // In production, get API key from RapidAPI
    this.apiKey = process.env.NEXT_PUBLIC_JUDGE0_API_KEY || '';
  }

  private getLanguageId(language: string): number {
    const languageMap: Record<string, number> = {
      'javascript': 63,   // Node.js
      'python': 71,       // Python 3
      'java': 62,         // Java
      'cpp': 54,          // C++17
      'c': 50,            // C
      'typescript': 74,   // TypeScript
      'go': 60,           // Go
      'rust': 73,         // Rust
    };
    return languageMap[language.toLowerCase()] || 63; // Default to Node.js
  }

  async executeCode(code: string, language: string, stdin: string = ''): Promise<ExecutionResult> {
    try {
      const languageId = this.getLanguageId(language);

      // Submit code for execution
      const submitResponse = await fetch(`${this.baseUrl}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: stdin
        })
      });

      if (!submitResponse.ok) {
        throw new Error(`Judge0 submission failed: ${submitResponse.statusText}`);
      }

      const submission = await submitResponse.json();
      const token = submission.token;

      // Poll for result
      const result = await this.pollResult(token);

      return result;
    } catch (error: any) {
      console.error('Judge0 execution error:', error);
      return {
        success: false,
        error: error.message || 'Failed to execute code'
      };
    }
  }

  private async pollResult(token: string, maxAttempts: number = 10): Promise<ExecutionResult> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const response = await fetch(`${this.baseUrl}/submissions/${token}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      });

      const result = await response.json();

      // Status 1-2 means still processing
      if (result.status.id === 1 || result.status.id === 2) {
        continue;
      }

      // Status 3 means successful
      if (result.status.id === 3) {
        return {
          success: true,
          output: result.stdout || '',
          executionTime: result.time
        };
      }

      // Status 4+ means runtime error, compile error, etc.
      return {
        success: false,
        error: result.stderr || result.compile_output || result.message || 'Execution failed',
        output: result.stdout
      };
    }

    return {
      success: false,
      error: 'Execution timeout'
    };
  }

  // Simple JavaScript execution (fallback for development)
  async executeJavaScript(code: string): Promise<ExecutionResult> {
    try {
      // Capture console.log
      let output = '';
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        output += args.map(arg => String(arg)).join(' ') + '\n';
        originalLog(...args);
      };

      // Capture errors
      let error = '';
      try {
        const func = new Function(code);
        func();
      } catch (e: any) {
        error = e.message;
      }

      // Restore console.log
      console.log = originalLog;

      return {
        success: !error,
        output: output.trim(),
        error: error || undefined
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message
      };
    }
  }
}

