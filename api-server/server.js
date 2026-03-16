import express from "express";
import dotenv from "dotenv";
import Redis from "ioredis";
import crypto from "crypto";
dotenv.config();
const app=express();
const port=3000;
console.log("My Redis URL is:", process.env.REDIS_URL);
const redis=new Redis(process.env.REDIS_URL);
app.use(express.json());
app.get('/ping',(req,res)=>{
   res.status(200).json({status:"api is running"});
});
//main route
app.post('/submit',async (req,res)=>{
    const {language,code}=req.body;
    console.log(language,code);
    const jobId=crypto.randomUUID();
    const jobData={
        jobId,language,code
    };
    try{
        await redis.lpush('code_queue',JSON.stringify(jobData));
        console.log(`job ${jobId} added to queue`);
        res.status(200).json({
            message:"code sbmitted sucessfully",
            jobId:jobId
        });
    }catch(error){
        console.log("redis error",error);
        res.status(500).json({error:"failed to add job to queue"});
    }
})
app.listen(port,()=>{
    console.log('server is running on http://localhost:${port}')
})