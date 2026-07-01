import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, onChange, language = 'cpp' }) => {
  
  const handleEditorChange = (value) => {
    onChange(value);
  };

  return (
     <div style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        options={{
          fontSize: 16, // Increased font size for better readability
          minimap: { enabled: true },
          automaticLayout: true, // This tells Monaco to automatically resize when the window changes
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
};

export default CodeEditor;