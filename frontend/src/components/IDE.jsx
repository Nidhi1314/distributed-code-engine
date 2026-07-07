import React, { useState } from 'react';
import axios from 'axios';
import CodeEditor from './CodeEditor'; // Adjust path if needed

const defaultCode={
  cpp:'#include <iostream>\n\nint main() {\n    std::cout << "Hello from c++!" << std::endl;\n    return 0;\n}',
  python:'print("Hello from python!")',
  javascript:'console.log("Hello from javascript!")'
};

const IDE = () => {
  const [language,setLanguage]=useState('cpp');
  const [code,setCode]=useState(defaultCode['cpp']);
  const [output,setOutput]=useState('Click "Run Code" to execute your program.');
  const [isProcessing,setIsProcessing]=useState(false);
  const [activeTab, setActiveTab] = useState('output');
 
  const handleLanguageChange=(e)=>{
    const newLang=e.target.value;
    setLanguage(newLang);
    setCode(defaultCode[newLang]);
  }

  const handleRunCode=async()=>{
    setOutput('Submitting code...');
    setIsProcessing(true);
    setActiveTab('output');
    try{
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const submitRes=await axios.post(`${backendUrl}/submit`,{ language, code });
      const jobId=submitRes.data.jobId;
      setOutput(`Job ID: ${jobId}\nWaiting for execution environment...`);

      const pollInterval=setInterval(async()=>{
        const statusRes=await axios.get(`${backendUrl}/status/${jobId}`);
        if(statusRes.data.status==='success' || statusRes.data.status==='error'){
          clearInterval(pollInterval);
          setOutput(statusRes.data.output);
          setIsProcessing(false);
        }
      },1000);
    }catch(error){
      console.log(error);
      setOutput('Failed to connect to backend server');
      setIsProcessing(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 65px)', backgroundColor: '#000', padding: '10px', gap: '10px', boxSizing: 'border-box' }}>
      
      {/* Left Panel: Editor Area */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
        
        {/* Editor Header / Toolbar */}
        <div style={{ padding: '8px 15px', backgroundColor: '#252526', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#00C9FF', fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace' }}>{"</>"} Code</span>
          </div>
          <div>
            <select 
              value={language}
              onChange={handleLanguageChange}
              style={{ padding:'4px 8px', fontSize:'13px', borderRadius:'4px', backgroundColor:'#1e1e1e', color:'#e0e0e0', border:'1px solid #444', cursor:'pointer', outline: 'none' }}>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>
        </div>
        
        {/* Editor Container */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor code={code} onChange={setCode} language={language} />
        </div>
      </div>

      {/* Right Panel: Output & Controls Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
        
        {/* Output Header / Toolbar */}
        <div style={{ padding: '8px 15px', backgroundColor: '#252526', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
             <div 
               onClick={() => setActiveTab('output')}
               style={{ color: activeTab === 'output' ? '#fff' : '#888', cursor: 'pointer', fontSize: '13px', borderBottom: activeTab === 'output' ? '2px solid #00C9FF' : '2px solid transparent', paddingBottom: '4px', transition: 'all 0.2s', fontWeight: activeTab === 'output' ? 'bold' : 'normal' }}>
               Terminal
             </div>
             <div 
               onClick={() => setActiveTab('testcases')}
               style={{ color: activeTab === 'testcases' ? '#fff' : '#888', cursor: 'pointer', fontSize: '13px', borderBottom: activeTab === 'testcases' ? '2px solid #00C9FF' : '2px solid transparent', paddingBottom: '4px', transition: 'all 0.2s', fontWeight: activeTab === 'testcases' ? 'bold' : 'normal' }}>
               Test Cases
             </div>
          </div>
          <button
            onClick={handleRunCode}
            disabled={isProcessing}
            style={{ 
              padding:'6px 14px', 
              backgroundColor: isProcessing ? '#444' : 'rgba(76, 175, 80, 0.15)', 
              color: isProcessing ? '#888' : '#4CAF50', 
              border: isProcessing ? '1px solid #555' : '1px solid rgba(76, 175, 80, 0.5)', 
              borderRadius:'6px', 
              cursor: isProcessing ? 'not-allowed' : 'pointer', 
              fontSize:'13px', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s' 
            }}
            onMouseEnter={(e) => { if(!isProcessing) e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.25)' }}
            onMouseLeave={(e) => { if(!isProcessing) e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.15)' }}
          >
            {isProcessing ? 'Running...' : '▶ Run Code'}
          </button>
        </div>

        {/* Console Container */}
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#0d0d0d', fontFamily: "'Courier New', Courier, monospace", whiteSpace: 'pre-wrap', overflowY: 'auto' }}>
           {activeTab === 'output' ? (
             <div style={{ color: (output.toLowerCase().includes('failed') || output.toLowerCase().includes('error')) ? '#ff4b4b' : '#e0e0e0', fontSize: '14px', lineHeight: '1.6' }}>
               {output}
             </div>
           ) : (
             <div style={{ color: '#888', fontSize: '13px' }}>
               [Test cases placeholder] <br/>
               You can add problem descriptions or custom inputs here in the future!
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default IDE;
