import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, onChange, language = 'cpp' }) => {
  
  const handleEditorChange = (value) => {
    onChange(value);
  };

  return (
    <div className="w-full h-full border border-neutral-800 rounded-lg overflow-hidden shadow-2xl">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        options={{
          fontSize: 14,
          minimap: { enabled: true },
          automaticLayout: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 16, bottom: 16 },
          fontFamily: "'Fira Code', 'Courier New', monospace",
          fontLigatures: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;