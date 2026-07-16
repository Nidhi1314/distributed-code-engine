// execution-service/runners/dockerRunner.js
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import languageConfig from "../languages.js";

const TIMEOUT_MS = 5000;
const MEMORY_LIMIT = "128m";
const PIDS_LIMIT = "64";

async function runInDocker({ language, code, input = "" }) {
  const config = languageConfig[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  // Create isolated temp dir per job (not shared like before)
  const jobId = randomUUID().slice(0, 8);
  const jobDir = path.join(os.tmpdir(), `job-${jobId}`);
  await fs.mkdir(jobDir, { recursive: true });

  const filename = `main.${config.extension}`;
  const filepath = path.join(jobDir, filename);
  await fs.writeFile(filepath, code);

  // Build hardened docker command
  const containerCommand = config.getRunCommand(filename, jobId);
  const args = [
    "run",
    "--rm",
    "--name", `exec-${jobId}`,
    "--network", "none",                  // no internet access
    "--read-only",                        // immutable root filesystem
    "--tmpfs", "/tmp:size=16m",           // small writable scratch
    "--memory", MEMORY_LIMIT,
    "--memory-swap", MEMORY_LIMIT,        // disable swap
    "--cpus", "0.5",
    "--pids-limit", PIDS_LIMIT,           // fork-bomb protection
    "--security-opt", "no-new-privileges",
    "-v", `${jobDir}:/app:ro`,            // code mounted read-only
    config.image,
    "sh", "-c", containerCommand,
  ];

  return new Promise((resolve) => {
    const proc = spawn("docker", args);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const start = Date.now();

    // Watchdog — kills container if it exceeds time limit
    const killer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, TIMEOUT_MS);

    // Send stdin if provided (for competitive programming inputs)
    if (input) proc.stdin.write(input);
    proc.stdin.end();

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", async (exitCode) => {
      clearTimeout(killer);
      // Clean up temp files
      await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});

      resolve({
        stdout,
        stderr: timedOut ? "Error: Time Limit Exceeded. Your code took longer than 5 seconds to run." : stderr,
        exitCode: timedOut ? 124 : exitCode,
        executionTime: Date.now() - start,
      });
    });
  });
}

export { runInDocker };
