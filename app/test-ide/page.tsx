'use client';

import React, { useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { StackBlitzIDEHandle } from '@/components/assessment/StackBlitzIDE';

const StackBlitzIDE = dynamic(() => import('@/components/assessment/StackBlitzIDE'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400 text-sm">
      Loading IDE sandbox...
    </div>
  ),
});

// ── Sample React + Vite project ──────────────────────────────
const SAMPLE_TEMPLATE_FILES: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'test-assessment-app',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.0.0',
        vite: '^5.0.0',
        vitest: '^1.0.0',
        '@testing-library/react': '^14.0.0',
        '@testing-library/jest-dom': '^6.0.0',
        jsdom: '^23.0.0',
      },
    },
    null,
    2
  ),

  'vite.config.js': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
});
`,

  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,

  'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,

  'src/index.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
}

.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #f1f5f9;
}

.add-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.add-form input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}

.add-form input:focus {
  border-color: #3b82f6;
}

.add-form button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: none;
  background: #3b82f6;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.add-form button:hover {
  background: #2563eb;
}

.task-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #1e293b;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  transition: border-color 0.15s;
}

.task-item:hover {
  border-color: #475569;
}

.task-item.done .task-text {
  text-decoration: line-through;
  color: #64748b;
}

.task-item input[type="checkbox"] {
  width: 1.1rem;
  height: 1.1rem;
  cursor: pointer;
  accent-color: #3b82f6;
}

.task-text {
  flex: 1;
  font-size: 0.875rem;
}

.delete-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1rem;
  line-height: 1;
  transition: color 0.15s;
}

.delete-btn:hover {
  color: #ef4444;
}

.stats {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
}
`,

  'src/App.jsx': `import React, { useState } from 'react';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';

export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Review pull request', done: false },
    { id: 2, text: 'Write unit tests', done: true },
    { id: 3, text: 'Deploy to staging', done: false },
  ]);

  const addTask = (text) => {
    setTasks([...tasks, { id: Date.now(), text, done: false }]);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="app">
      <h1>Task Manager</h1>
      <TaskForm onAdd={addTask} />
      <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
      <div className="stats">
        {tasks.filter(t => t.done).length} of {tasks.length} completed
      </div>
    </div>
  );
}
`,

  'src/components/TaskForm.jsx': `import React, { useState } from 'react';

export default function TaskForm({ onAdd }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    // BUG: input not cleared after adding
  };

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task..."
      />
      <button type="submit">Add</button>
    </form>
  );
}
`,

  'src/components/TaskList.jsx': `import React from 'react';
import TaskItem from './TaskItem';

export default function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No tasks yet. Add one above!</p>;
  }

  return (
    <ul className="task-list">
      {/* BUG: missing key prop */}
      {tasks.map((task) => (
        <TaskItem task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}
`,

  'src/components/TaskItem.jsx': `import React from 'react';

export default function TaskItem({ task, onToggle, onDelete }) {
  return (
    <li className={\`task-item \${task.done ? 'done' : ''}\`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => onToggle(task.id)}
      />
      <span className="task-text">{task.text}</span>
      {/* BUG: delete button has no visible focus styles for keyboard nav */}
      <button className="delete-btn" onClick={() => onDelete(task.id)}>
        ×
      </button>
    </li>
  );
}
`,

  'src/test-setup.js': `import '@testing-library/jest-dom';
`,

  'src/__tests__/App.test.jsx': `import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByText('Task Manager')).toBeInTheDocument();
  });

  it('shows initial tasks', () => {
    render(<App />);
    expect(screen.getByText('Review pull request')).toBeInTheDocument();
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
  });

  it('adds a new task', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a new task...');
    fireEvent.change(input, { target: { value: 'New task' } });
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('New task')).toBeInTheDocument();
  });

  it('clears input after adding task', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a new task...');
    fireEvent.change(input, { target: { value: 'Another task' } });
    fireEvent.click(screen.getByText('Add'));
    // This test will FAIL because of the bug — input is not cleared
    expect(input).toHaveValue('');
  });

  it('toggles task completion', () => {
    render(<App />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    // After toggle, first task should be done
    expect(checkboxes[0]).toBeChecked();
  });

  it('deletes a task', () => {
    render(<App />);
    const deleteButtons = screen.getAllByText('×');
    fireEvent.click(deleteButtons[0]);
    expect(screen.queryByText('Review pull request')).not.toBeInTheDocument();
  });
});
`,

  'README.md': `# Task Manager Assessment

## Your Goal
Build and fix a simple Task Manager app. There are **intentional bugs** in the code.

## Tasks
1. Run \`npm install\` then \`npm run dev\` to start the dev server
2. Run \`npm test\` to see which tests are failing
3. Find and fix the bugs:
   - Input field doesn't clear after adding a task
   - List items rendered without unique keys (React warning)
   - Delete button missing visible focus styles (accessibility)
4. Make all tests pass

## Commands
- \`npm run dev\` — Start dev server
- \`npm test\` — Run tests
- \`npm run test:watch\` — Run tests in watch mode

## Hints
- Check the browser console for React warnings
- Look at the test output for failing assertions
- Consider keyboard navigation for accessibility
`,
};

const SAMPLE_TASKS = [
  {
    id: 1,
    title: 'Fix Input Bug',
    description:
      'The input field does not clear after adding a task. Find and fix this bug in the TaskForm component.',
    requirements: [
      'Input field should be empty after a task is added',
      'The form should remain usable after submission',
    ],
    duration: '15 min',
  },
  {
    id: 2,
    title: 'Fix Missing Keys Warning',
    description:
      'React is warning about missing keys in the list. Add proper unique keys to the list items.',
    requirements: [
      'Each TaskItem should have a unique key prop',
      'No React warnings in the console',
    ],
    duration: '10 min',
  },
  {
    id: 3,
    title: 'Add Focus Styles',
    description:
      'The delete button has no visible focus indicator for keyboard users. Add accessible focus styles.',
    requirements: [
      'Delete button should have a visible focus ring',
      'Focus styles should follow accessibility best practices',
    ],
    duration: '10 min',
  },
  {
    id: 4,
    title: 'Make All Tests Pass',
    description:
      'Run `npm test` and ensure all 6 tests pass after your fixes.',
    requirements: ['All tests in App.test.jsx should pass'],
    duration: '10 min',
  },
];

export default function TestIDEPage() {
  const ideRef = useRef<StackBlitzIDEHandle>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const [showLLMSelector, setShowLLMSelector] = useState(false);

  const handleSendMessage = useCallback(
    (msg: string) => {
      if (!msg.trim()) return;
      setMessages((prev) => [...prev, { role: 'user', content: msg }]);
      // Echo back (no real LLM connected in sandbox mode)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `[Sandbox] AI chat is not connected in test mode. You typed: "${msg}"`,
          },
        ]);
      }, 300);
    },
    []
  );

  const handleCollectFiles = useCallback(async () => {
    if (!ideRef.current) return;
    const files = await ideRef.current.getAllFiles();
    console.log('Collected files:', files);
    alert(`Collected ${Object.keys(files).length} files — check console`);
  }, []);

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Thin top bar */}
      <div className="h-9 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
        <span className="text-xs font-semibold text-zinc-300 tracking-wide">
          IDE Sandbox
        </span>
        <span className="text-[10px] text-zinc-500">
          No auth &middot; No timer &middot; Test freely
        </span>
        <div className="flex-1" />
        <button
          onClick={handleCollectFiles}
          className="px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Collect Files
        </button>
        <a
          href="/"
          className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
        >
          Exit
        </a>
      </div>

      {/* IDE fills rest */}
      <div className="flex-1 min-h-0">
        <StackBlitzIDE
          ref={ideRef}
          sessionId={null}
          templateFiles={SAMPLE_TEMPLATE_FILES}
          tasks={SAMPLE_TASKS}
          messages={messages}
          onSendMessage={handleSendMessage}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          selectedLLM={selectedLLM}
          showLLMSelector={showLLMSelector}
          onSelectLLM={(llm: string) => {
            setSelectedLLM(llm);
            setShowLLMSelector(false);
          }}
          onFileChange={(path: string, content: string) => {
            // No-op in sandbox — just log
            console.log(`[sandbox] file changed: ${path}`);
          }}
          onTerminalOutput={(output: string) => {
            console.log('[sandbox] terminal:', output);
          }}
        />
      </div>
    </div>
  );
}
