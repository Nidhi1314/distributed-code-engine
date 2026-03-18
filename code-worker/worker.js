import {Redis} from "@upstash/redis";
import * as dotenv from "dotenv";
import path from 'path';
import fs from 'fs/promises';
dotenv.config();
const redis =new Redis({
    url:process.env.REDIS_URL,
    token:process.env.REDIS_TOKEN
});
const temp=path.join(process.cwd(),'temp');
const processQueue=async()=>{
    try{
          const job=await redis.rpop('code_queue');
          if(job){
            console.log("\ngot new job queue");
            console.log(job);
            const {jobId,language,code}=job;
            await fs.mkdir(temp,{recursive:true});
            const filepath=path.join(temp,`${jobId}.${language}`);
            await fs.writeFile(filepath,code);
            console.log(`code written to ${filepath}`);
            await fs.unlink(filepath);
            console.log(`code deleted from ${filepath}`);
          }else{
            process.stdout.write('.');
          }
    }catch(error){
        console.log("error in processing queue",error);
    }
    setTimeout(processQueue,1000);
}
console.log("worker node wokring ");
processQueue();

