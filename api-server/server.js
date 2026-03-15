import express from "express";
const app=express();
const port=3000;
app.use(express.json());
app.get('/ping',(req,res)=>{
   res.status(200).json({status:"api is running"});
});
//main route
app.post('/submit',(req,res)=>{
    const {language,code}=req.body;
    console.log(language,code);
    res.status(200).json({status:"code received by api"});
})
app.listen(port,()=>{
    console.log('server is running on http://localhost:${port}')
})