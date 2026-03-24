import {Redis} from "@upstash/redis";
import * as dotenv from "dotenv";
import path from 'path';
import fs from 'fs/promises';
import {exec} from 'child_process';
import util from 'util';
const execPromise=util.promisify(exec);
dotenv.config();
const redis =new Redis({
    url:process.env.REDIS_URL,
    token:process.env.REDIS_TOKEN
});
const temp=path.join(process.cwd(),'temp');

const languageConfig={
  cpp:{
    image:'cpp-runner',
    extension:'cpp',
    getRunCommand:(filename,compileName)=>`g++ ${filename} -o ${compileName} && ./${compileName}`},

  python:{
    image:'python-runner',
    extension:'py',
    getRunCommand:(filename)=>`python3 ${filename}`
  },
  javascript:{
    image:'node-runner',
    extension:'js',
    getRunCommand:(filename)=>`node ${filename}`
  }
};
const processQueue=async()=>{
    try{
          const job=await redis.rpop('code_queue');
          if(job){
            console.log("\ngot new job queue");
            console.log(job);
            const {jobId,language,code}=job;

            const config=languageConfig[language];
            if(!config){
              console.log('unsupported language');
              await redis.set(jobId,JSON.stringify({status:'error',output:'unsupported language'}),{ex:3600});
              processQueue();
              return ;
            }
            await fs.mkdir(temp,{recursive:true});
            const filename=`${jobId}.${config.extension}`;
            const filepath=path.join(temp,filename);
            await fs.writeFile(filepath,code);
            console.log(`code written to ${filepath}`);

            //containerised
            console.log(`spinning up docker container..${config.image}`);
            const containerCommand=config.getRunCommand(filename,jobId);
            const dockerCommand=`docker run --rm -v "${temp}:/app" ${config.image} sh -c "${containerCommand}"`;

            try{
              const {stdout,stderr}=await execPromise(dockerCommand);

              let finaloutput=stdout;
              let jobstatus="success";
              if(stderr){
                console.log(`code compiles with error ${stderr}`);
                finaloutput=stderr;
                jobstatus="error";
              }
              else {
              console.log(`\n execution output-----\n${stdout}-------\n`);
              }
              await redis.set(jobId,JSON.stringify({status:jobstatus,output:finaloutput}));
              console.log(`result saved to redis job ${jobId} updated`);
            }catch(execError){
              console.log(`compliation error ${execError.stderr}`);
              await redis.set(jobId,JSON.stringify({status:"error",output:execError.stderr}),{ex:3600});
              console.log(`error saved to redis job ${jobId}`);
            }

            
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

