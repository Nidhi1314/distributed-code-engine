import { useState } from 'react'
import axios from 'axios';
import Editor from '@monaco-editor/react';
import './App.css'


const defaultCode={
  cpp:'#include <iostream>\n\nint main() {\n    std::cout << "Hello from c++!" << std::endl;\n    return 0;\n}',
  python:'print("Hello from python!")',
  javascript:'console.log("Hello from javascript!")'
}
function App() {
  //state variables
  const [language,setLanguage]=useState('cpp');
  const [code,setCode]=useState(defaultCode['cpp']);
  const [output,setOutput]=useState('Click "Run Code" to see the output here...');
  const [isProcessing,setIsProcessing]=useState(false);
 
  const handleLanguageChange=(e)=>{
    const newLang=e.target.value;
    setLanguage(newLang);
    setCode(defaultCode[newLang]);
  }
  const handleRunCode=async()=>{
    setOutput('submitting code');
    setIsProcessing(true);
    try{

      const submitRes=await axios.post('http://localhost:3000/submit',{
        language:language,code:code
      });
      const jobId=submitRes.data.jobId;
      setOutput(`jobid: ${jobId}\n waiitng for docker container`);

      const pollInterval=setInterval(async()=>{
        const statusRes=await axios.get(`http://localhost:3000/status/${jobId}`);
        if(statusRes.data.status==='success' || statusRes.data.status=='error'){
          clearInterval(pollInterval);
          setOutput(statusRes.data.output);
          setIsProcessing(false);
        }
      },1000);
    }catch(error){
      console.log(error);
      setOutput('failed to connect to backend server');
      setIsProcessing(false);
    }
  }
  //ui
  return (
      <div style={{backgroundColor:'#1e1e1e',color:'white',minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'20px',borderBottom:'1px solid #333',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2> Nidhis code engine</h2>
        <div>
          <select 
          value={language}
          onChange={handleLanguageChange}
          style={{marginRight:'15px',padding:'10px',fontSize:'16px',borderRadius:'5px',backgroundColor:'#333',color:'white',border:'1px solid #555',cursor:'pointer'}}>
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>

        </div>
        <button
        onClick={handleRunCode}
        disabled={isProcessing}
        style={{padding:'10px 20px',backgroundColor:isProcessing?'#555':'#4CAF50',color:'white',border:'none',borderRadius:'5px',cursor:isProcessing?'not-allowed':'pointer',fonstSize:'16px'}}
          >
            {isProcessing?'processing':'run code'}
          </button>
        </div>
        <div style={{display:'flex',flex:1}}>
        <div style={{flex:1,broderRight:'1px solid #333'}}>
          <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value)=>setCode(value)}
          options={{fontSize:16,minimap:{enabled:false}}}
          />
        </div>
        {/*right side -execution side*/}
        <div style={{flex:1,padding:'20px',backgroundColor:'#000',fontfamily:'monospace',whitespace:'prep-wrap'}}>
           <h3 style={{color:'#888',marginTop:0}}>Terminal output</h3>
           <div style={{color:'#0f0'}}>{output}</div>
        </div>
      
      </div>
    </div>
  );
}
export default App
