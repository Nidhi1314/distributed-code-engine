import express from "express";
import dotenv from "dotenv";
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import crypto from "crypto";
import cors from "cors";
dotenv.config();
const app=express();
app.use(cors());
const port=3000;


console.log("My Redis URL is:", process.env.REDIS_URL);
const redisConnection= new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const executionQueue = new Queue('execution-queue', { connection: redisConnection });
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
        await executionQueue.add('execute-code', jobData, { jobId });
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

app.get('/status/:jobId',async(req,res)=>{
   const {jobId}=req.params;
   try{
    const result = await redisConnection.get(jobId);
    if(!result){
        return res.status(202).json({
            status:'pending',
            message:'Job is still in the queue or processing...'
        });
    }
    return res.status(200).json(JSON.parse(result));
   }catch(error){
    console.error("error fetching status:",error);
    return res.status(500).json({error:"failed to fetch job status"});
   }
});     
app.listen(port,()=>{
    console.log('server is running on http://localhost:${port}')
})