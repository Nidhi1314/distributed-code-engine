import { Worker } from 'bullmq';
import Redis from 'ioredis';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import util from 'util';
import * as dotenv from 'dotenv';
const execPromise = util.promisify(exec);
dotenv.config();

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null });

const temp = path.join(process.cwd(), 'temp');

const languageConfig = {
  cpp: {
    image: 'cpp-runner',
    extension: 'cpp',
    getRunCommand: (filename, compileName) => `g++ ${filename} -o ${compileName} && ./${compileName}`
  },

  python: {
    image: 'python-runner',
    extension: 'py',
    getRunCommand: (filename) => `python3 ${filename}`
  },
  javascript: {
    image: 'node-runner',
    extension: 'js',
    getRunCommand: (filename) => `node ${filename}`
  }
};
const worker = new Worker('execution-queue', async (job) => {
  try {
    console.log("\ngot new job from queue");
    console.log(job.data);
    const { jobId, language, code } = job.data;

    const config = languageConfig[language];
    if (!config) {
      console.log('unsupported language');
      await redisConnection.set(jobId, JSON.stringify({ status: 'error', output: 'unsupported language' }), 'EX', 3600);
      return;
    }
    await fs.mkdir(temp, { recursive: true });
    const filename = `${jobId}.${config.extension}`;
    const filepath = path.join(temp, filename);
    await fs.writeFile(filepath, code);
    console.log(`code written to ${filepath}`);

    //containerised
    console.log(`spinning up docker container..${config.image}`);
    const containerCommand = config.getRunCommand(filename, jobId);
    const dockerCommand = `docker run --name ${jobId} --rm -v "${temp}:/app" ${config.image} sh -c "${containerCommand}"`;

    //watchdog acting as independent alarm clock
    const watchdog = setTimeout(() => {
      console.log(`\n watchdog triggered ${jobId}`);
      exec(`docker rm -f ${jobId}`)
    }, 5000);

    try {
      const { stdout, stderr } = await execPromise(dockerCommand);

      //turnoff alrm when successfully executed
      clearTimeout(watchdog);

      let finaloutput = stdout;
      let jobstatus = "success";
      if (stderr) {
        console.log(`code compiles with error ${stderr}`);
        finaloutput = stderr;
        jobstatus = "error";
      }
      else {
        console.log(`\n execution output-----\n${stdout}-------\n`);
      }
      await redisConnection.set(jobId, JSON.stringify({ status: jobstatus, output: finaloutput }), 'EX', 3600);
      console.log(`result saved to redis job ${jobId} updated`);

      return { status: jobstatus, output: finaloutput };
    } catch (execError) {
      clearTimeout(watchdog);
      let errorMessage = execError.stderr || execError.message;
      if (execError.code == 137 || String(errorMessage).includes('Command failed') || execError.killed) {
        console.log(`execution assassinated :tle for job ${jobId}`);
        errorMessage = "error:time limit exceeded. Your code took longer than 5 seconds to run";
      } else {
        console.log(`execution error:\n${errorMessage}`);
      }
      await redisConnection.set(jobId, JSON.stringify({ status: "error", output: errorMessage }), 'EX', 3600);
      console.log(`error saved to redis job ${jobId}`);

      throw new Error(errorMessage);
    } finally {
      await fs.unlink(filepath).catch(() => { });
      console.log(`code deleted from ${filepath}`);
    }
  } catch (error) {
    console.log("error in processing queue", error);
    throw error;
  }
}, { connection: redisConnection });

worker.on('ready', () => {
  console.log("worker node working and listening to execution-queue");
});

worker.on('error', (err) => {
  console.error("Worker error:", err);
});

