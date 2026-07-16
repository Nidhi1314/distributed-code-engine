import { Worker } from 'bullmq';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import { executeCode } from '../execution-service/index.js';
dotenv.config();

//redis connection
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null });

//fetching from queue
const worker = new Worker('execution-queue', async (job) => {
     console.log('\n got new job from queue');
     console.log(job.data);

     const {jobId,language,code,input}=job.data;
     try{
      const result=await executeCode({language,code,input});
      const status = result.exitCode==0?'success':'error';
      const output= result.exitCode==0? result.stdout: (result.stderr || result.stdout);

      await redisConnection.set(jobId, JSON.stringify({
        status,output
      }), 'EX', '3600'); //expires in 1 hour
        
      console.log(`result saved to redis ${jobId} (${status})`);

      return {status,output};
     }catch (error){
      console.error(`execution failed for job ${jobId}:`,error.message);
      await redisConnection.set(jobId, JSON.stringify({
        status:'error',
        output: error.message
      }), 'EX', '3600');
      throw error;
     }
    }, 
    {connection: redisConnection, concurrency:4}
  );
     

worker.on('ready', () => {
  console.log("worker node working and listening to execution-queue");
});

worker.on('error', (err) => {
  console.error("Worker error:", err);
});

