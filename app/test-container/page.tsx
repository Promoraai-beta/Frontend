'use client';

import { useState } from 'react';

export default function TestContainerPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions/start-container', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: 'test',
          candidate_id: crypto.randomUUID()
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start container');
      }

      const data = await res.json();
      setSession(data.session);
    } catch (err: any) {
      setError(err.message || 'Failed to start container');
      console.error('Error starting container:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Setting up environment...</h1>
        <p>This may take 30-60 seconds</p>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Error</h1>
        <p style={{ color: 'red' }}>{error}</p>
        <button 
          onClick={start}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (session) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f5f5f5', 
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0 }}>VS Code Environment</h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
              IDE: <a href={session.ide_url} target="_blank" rel="noopener noreferrer">{session.ide_url}</a>
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
              Terminal: <a href={session.terminal_url} target="_blank" rel="noopener noreferrer">{session.terminal_url}</a>
            </p>
          </div>
          <button
            onClick={() => {
              setSession(null);
              setError(null);
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>
        <iframe
          src={session.ide_url}
          style={{ 
            width: '100%', 
            height: 'calc(100vh - 120px)', 
            border: 'none',
            flex: 1
          }}
          title="VS Code IDE"
        />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '600px', 
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h1>Test Container Provisioner</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Click the button below to provision an Azure Container Instance with VS Code.
        This will create a container, start it, and load the IDE in an iframe.
      </p>
      <button
        onClick={start}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2980b9'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3498db'}
      >
        Start Test Assessment
      </button>
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', textAlign: 'left' }}>
        <h3 style={{ marginTop: 0 }}>What happens:</h3>
        <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>Creates an Azure Container Instance</li>
          <li>Starts code-server (VS Code in browser) on port 8080</li>
          <li>Starts ttyd (terminal) on port 7681</li>
          <li>Loads the IDE in an iframe</li>
        </ol>
      </div>
    </div>
  );
}
