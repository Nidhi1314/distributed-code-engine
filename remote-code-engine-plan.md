# Remote Code Engine — Advanced Implementation Plan
### (Post-BullMQ) — Execution Service → Security → Frontend → Containerization → Kubernetes → KEDA → Observability

> **Status:** BullMQ queue migration ✅ done.
> **Deferred on purpose:** MongoDB models and Authentication — these plug in later without changing anything below. Job results will continue to live on the BullMQ job object (`job.returnvalue`) until Mongo is added, so nothing here needs to be re-architected when you do add it.

---

## 0. Target Folder Structure

```
remote-code-engine/
├── api-server/
│   ├── server.js
│   ├── queue.js              # BullMQ Queue producer (done)
│   └── package.json
├── execution-service/        # NEW — extracted from worker.js
│   ├── index.js               # public executeCode() interface
│   ├── validators/
│   │   └── staticValidator.js # security: static code analysis
│   ├── runners/
│   │   ├── dockerRunner.js     # current execution backend
│   │   └── k8sRunner.js        # future backend (Phase 8)
│   ├── languages.js            # per-language config (image, cmd, ext)
│   └── package.json
├── code-worker/
│   ├── worker.js               # NOW THIN — BullMQ consumer only
│   └── package.json
├── frontend/
│   └── src/
│       ├── app/store.js        # Redux Toolkit store
│       ├── features/editor/
│       ├── features/job/
│       └── components/CodeEditor/  # Monaco
├── docker-compose.yml
└── k8s/
    ├── namespace.yaml
    ├── api-deployment.yaml
    ├── worker-deployment.yaml
    ├── redis.yaml
    ├── keda-scaledobject.yaml
    └── execution-job-template.yaml
```

---

## Phase 2 — Extract the Execution Service

**Why:** Right now `worker.js` does three jobs at once — pull from queue, validate/run code, manage Docker. Splitting "run untrusted code safely" into its own module means the Worker never has to change again, even when you swap Docker for Kubernetes Jobs in Phase 8.

### 2.1 `execution-service/languages.js`

```js
// execution-service/languages.js
module.exports = {
  cpp: {
    image: "remote-exec-cpp:latest",
    ext: "cpp",
    // compiled inside the container entrypoint script
  },
  python: {
    image: "remote-exec-python:latest",
    ext: "py",
  },
  javascript: {
    image: "remote-exec-node:latest",
    ext: "js",
  },
};
```

### 2.2 `execution-service/runners/dockerRunner.js`

This is your existing worker.js Docker logic, lifted out and given hardened flags (ties into Phase 4 too).

```js
// execution-service/runners/dockerRunner.js
const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { randomUUID } = require("crypto");
const languages = require("../languages");

const TIMEOUT_MS = 5000;
const MEMORY_LIMIT = "128m";
const PIDS_LIMIT = "64";

async function runInDocker({ language, code, input = "" }) {
  const cfg = languages[language];
  if (!cfg) throw new Error(`Unsupported language: ${language}`);

  const jobDir = path.join(os.tmpdir(), `job-${randomUUID()}`);
  await fs.mkdir(jobDir, { recursive: true });
  const codeFile = path.join(jobDir, `main.${cfg.ext}`);
  await fs.writeFile(codeFile, code);

  const args = [
    "run",
    "--rm",
    "--network", "none",              // no network access
    "--read-only",                    // immutable root fs
    "--tmpfs", "/tmp:size=16m",        // writable scratch space only
    "--memory", MEMORY_LIMIT,
    "--memory-swap", MEMORY_LIMIT,     // disable swap
    "--cpus", "0.5",
    "--pids-limit", PIDS_LIMIT,        // fork-bomb protection
    "--security-opt", "no-new-privileges",
    "-v", `${jobDir}:/sandbox:ro`,     // code mounted read-only
    cfg.image,
  ];

  return new Promise((resolve) => {
    const proc = spawn("docker", args);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const start = Date.now();

    const killer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, TIMEOUT_MS);

    if (input) proc.stdin.write(input);
    proc.stdin.end();

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", async (exitCode) => {
      clearTimeout(killer);
      await fs.rm(jobDir, { recursive: true, force: true });
      resolve({
        stdout,
        stderr: timedOut ? "Time Limit Exceeded" : stderr,
        exitCode: timedOut ? 124 : exitCode,
        executionTime: Date.now() - start,
      });
    });
  });
}

module.exports = { runInDocker };
```

### 2.3 `execution-service/index.js` — the public interface

```js
// execution-service/index.js
const { runInDocker } = require("./runners/dockerRunner");
const { validate } = require("./validators/staticValidator");

async function executeCode({ language, code, input }) {
  const violation = validate(language, code);
  if (violation) {
    return {
      stdout: "",
      stderr: `Rejected: ${violation}`,
      exitCode: 126,
      executionTime: 0,
    };
  }

  // Swap this line for k8sRunner.run(...) in Phase 8 —
  // nothing else in the system needs to know.
  return runInDocker({ language, code, input });
}

module.exports = { executeCode };
```

### 2.4 `code-worker/worker.js` — now thin

```js
// code-worker/worker.js
const { Worker } = require("bullmq");
const { executeCode } = require("../execution-service");

const connection = { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT };

const worker = new Worker(
  "execution-queue",
  async (job) => {
    const { language, code, input } = job.data;
    const result = await executeCode({ language, code, input });
    return result; // becomes job.returnvalue, fetched via GET /job/:id
  },
  { connection, concurrency: 4 }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

module.exports = worker;
```

---

## Phase 4 — Security Hardening

### 4.1 Static validation — `execution-service/validators/staticValidator.js`

Blocks obviously dangerous patterns **before** code ever reaches Docker. This is a defense-in-depth layer, not a replacement for container isolation.

```js
// execution-service/validators/staticValidator.js
const RULES = {
  javascript: [
    /require\(['"]child_process['"]\)/,
    /require\(['"]net['"]\)/,
    /require\(['"]dgram['"]\)/,
    /process\.binding/,
    /\bfetch\(/,
  ],
  python: [
    /import\s+os\b/,
    /import\s+subprocess/,
    /import\s+socket/,
    /__import__\(/,
    /open\(.*['"]\/etc/,
  ],
  cpp: [
    /#include\s*<sys\/socket\.h>/,
    /system\s*\(/,
    /fork\s*\(/,
    /exec[lv]p?\s*\(/,
  ],
};

function validate(language, code) {
  const rules = RULES[language] || [];
  for (const pattern of rules) {
    if (pattern.test(code)) {
      return `Disallowed pattern detected: ${pattern}`;
    }
  }
  return null;
}

module.exports = { validate };
```

### 4.2 Test payloads to run through the pipeline

```js
// execution-service/validators/__tests__/malicious-samples.js
module.exports = [
  { language: "python", code: "import os\nos.system('rm -rf /')" },
  { language: "javascript", code: "while(true){}" },              // caught by watchdog, not validator
  { language: "cpp", code: "int main(){ while(1) fork(); }" },     // caught by pids-limit + validator
  { language: "python", code: "print(open('/etc/passwd').read())" },
];
```

Run these through `executeCode()` in a script and confirm each is rejected or times out cleanly with no host-level side effects.

### 4.3 Dockerfile hardening (per-language runtime images)

```dockerfile
# code-worker/python.Dockerfile (hardened)
FROM python:3.11-alpine
RUN adduser -D -H sandboxuser
USER sandboxuser
WORKDIR /sandbox
ENTRYPOINT ["python3", "main.py"]
```

Apply the same `adduser`/`USER` pattern to `node.Dockerfile` and the C++ `Dockerfile` — never run submitted code as root inside the container, even though `--network none` and read-only fs already contain most of the risk.

---

## Phase 5 — Frontend Upgrade (Monaco + Redux Toolkit)

### 5.1 Redux store — `frontend/src/app/store.js`

```js
// frontend/src/app/store.js
import { configureStore } from "@reduxjs/toolkit";
import editorReducer from "../features/editor/editorSlice";
import jobReducer from "../features/job/jobSlice";

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    job: jobReducer,
  },
});
```

### 5.2 `frontend/src/features/editor/editorSlice.js`

```js
import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_SNIPPETS = {
  cpp: `#include <iostream>\nint main(){ std::cout << "Hello World"; }`,
  python: `print("Hello World")`,
  javascript: `console.log("Hello World");`,
};

const editorSlice = createSlice({
  name: "editor",
  initialState: { language: "python", code: DEFAULT_SNIPPETS.python },
  reducers: {
    setLanguage(state, action) {
      state.language = action.payload;
      state.code = DEFAULT_SNIPPETS[action.payload];
    },
    setCode(state, action) {
      state.code = action.payload;
    },
  },
});

export const { setLanguage, setCode } = editorSlice.actions;
export default editorSlice.reducer;
```

### 5.3 `frontend/src/features/job/jobSlice.js` (async thunk + polling)

```js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const submitCode = createAsyncThunk("job/submit", async ({ language, code }) => {
  const { data } = await axios.post("/run/onlinecompiler", { language, code });
  return data.jobId;
});

export const pollJob = createAsyncThunk("job/poll", async (jobId) => {
  const { data } = await axios.get(`/job/${jobId}`);
  return data; // { status, result }
});

const jobSlice = createSlice({
  name: "job",
  initialState: { jobId: null, status: "idle", result: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(submitCode.fulfilled, (state, action) => {
        state.jobId = action.payload;
        state.status = "queued";
        state.result = null;
      })
      .addCase(pollJob.fulfilled, (state, action) => {
        state.status = action.payload.status;
        if (action.payload.result) state.result = action.payload.result;
      });
  },
});

export default jobSlice.reducer;
```

### 5.4 `frontend/src/components/CodeEditor/CodeEditor.jsx` (Monaco)

```jsx
import Editor from "@monaco-editor/react";
import { useDispatch, useSelector } from "react-redux";
import { setCode } from "../../features/editor/editorSlice";

export default function CodeEditor() {
  const dispatch = useDispatch();
  const { language, code } = useSelector((s) => s.editor);

  return (
    <Editor
      height="70vh"
      language={language === "cpp" ? "cpp" : language}
      value={code}
      theme="vs-dark"
      onChange={(value) => dispatch(setCode(value ?? ""))}
      options={{ fontSize: 14, minimap: { enabled: false } }}
    />
  );
}
```

### 5.5 Polling hook — `frontend/src/features/job/useJobPolling.js`

```js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { pollJob } from "./jobSlice";

export function useJobPolling() {
  const dispatch = useDispatch();
  const { jobId, status } = useSelector((s) => s.job);

  useEffect(() => {
    if (!jobId || ["completed", "failed"].includes(status)) return;
    const interval = setInterval(() => dispatch(pollJob(jobId)), 1000);
    return () => clearInterval(interval);
  }, [jobId, status, dispatch]);
}
```

> **Practice Problems UI:** since Mongo is deferred, ship a static `problems.json` in the frontend for now (id, title, statement, starter code). Swap the fetch source for `GET /problems` once the `Problem` model exists — the component contract doesn't change.

---

## Phase 7 — Full Containerization (Docker Compose)

### 7.1 `api-server/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

### 7.2 `code-worker/Dockerfile` (worker host, not the execution runtimes)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "worker.js"]
```

> Note: this container needs Docker-in-Docker or a mounted `docker.sock` to spawn execution containers — see the compose file below. In Phase 8 this dependency disappears once the K8s runner takes over.

### 7.3 `docker-compose.yml`

```yaml
version: "3.9"
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api-server:
    build: ./api-server
    ports: ["4000:4000"]
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on: [redis]

  code-worker:
    build: ./code-worker
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock   # allows worker to spawn exec containers
    depends_on: [redis]

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [api-server]
```

Build the language runtime images once, locally, so the worker can reference them:

```bash
docker build -t remote-exec-python:latest -f code-worker/python.Dockerfile .
docker build -t remote-exec-node:latest -f code-worker/node.Dockerfile .
docker build -t remote-exec-cpp:latest -f code-worker/Dockerfile .
```

---

## Phase 8 — Kubernetes Migration

Two things change here: (1) the app services (api, worker) move to Deployments, and (2) **code execution itself** moves from `docker run` on the worker's host to a short-lived, hardened Kubernetes **Job** per submission — this is what `k8sRunner.js` implements.

### 8.1 `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codevault-exec
```

### 8.2 `k8s/redis.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: codevault-exec
spec:
  replicas: 1
  selector: { matchLabels: { app: redis } }
  template:
    metadata: { labels: { app: redis } }
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports: [{ containerPort: 6379 }]
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: codevault-exec
spec:
  selector: { app: redis }
  ports: [{ port: 6379, targetPort: 6379 }]
```

### 8.3 `k8s/api-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: codevault-exec
spec:
  replicas: 2
  selector: { matchLabels: { app: api-server } }
  template:
    metadata: { labels: { app: api-server } }
    spec:
      containers:
        - name: api-server
          image: <your-registry>/api-server:latest
          ports: [{ containerPort: 4000 }]
          env:
            - { name: REDIS_HOST, value: "redis" }
            - { name: REDIS_PORT, value: "6379" }
---
apiVersion: v1
kind: Service
metadata:
  name: api-server
  namespace: codevault-exec
spec:
  selector: { app: api-server }
  ports: [{ port: 4000, targetPort: 4000 }]
  type: ClusterIP
```

### 8.4 `k8s/worker-deployment.yaml`

Worker no longer needs `docker.sock` — it calls the Kubernetes API to spin up execution Jobs instead.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: code-worker
  namespace: codevault-exec
spec:
  replicas: 2  # KEDA will override this in Phase 9
  selector: { matchLabels: { app: code-worker } }
  template:
    metadata: { labels: { app: code-worker } }
    spec:
      serviceAccountName: code-worker-sa   # needs permission to create Jobs
      containers:
        - name: code-worker
          image: <your-registry>/code-worker:latest
          env:
            - { name: REDIS_HOST, value: "redis" }
            - { name: REDIS_PORT, value: "6379" }
            - { name: EXEC_BACKEND, value: "kubernetes" }
```

### 8.5 RBAC so the worker can create Jobs — `k8s/worker-rbac.yaml`

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: code-worker-sa
  namespace: codevault-exec
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: job-creator
  namespace: codevault-exec
rules:
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["create", "get", "list", "delete", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: code-worker-job-creator
  namespace: codevault-exec
subjects:
  - kind: ServiceAccount
    name: code-worker-sa
roleRef:
  kind: Role
  name: job-creator
  apiGroup: rbac.authorization.k8s.io
```

### 8.6 `k8s/execution-job-template.yaml` — hardened per-submission Job

This is a *template*; `k8sRunner.js` clones and fills it in per job (unique name, language image, code as a ConfigMap or mounted volume).

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: exec-job-<jobId>
  namespace: codevault-exec
spec:
  backoffLimit: 0
  activeDeadlineSeconds: 5        # hard execution deadline, replaces the manual watchdog
  ttlSecondsAfterFinished: 30     # auto-cleanup
  template:
    spec:
      restartPolicy: Never
      automountServiceAccountToken: false
      containers:
        - name: exec
          image: remote-exec-<language>:latest
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            seccompProfile: { type: RuntimeDefault }
            capabilities: { drop: ["ALL"] }
          resources:
            limits: { cpu: "500m", memory: "128Mi" }
          volumeMounts:
            - { name: code-vol, mountPath: /sandbox, readOnly: true }
            - { name: tmp-vol, mountPath: /tmp }
      volumes:
        - name: code-vol
          configMap: { name: code-<jobId> }
        - name: tmp-vol
          emptyDir: { sizeLimit: 16Mi }
      # networking: no NetworkPolicy = default allow; add a deny-all NetworkPolicy
      # in the namespace (below) to replicate --network none.
```

### 8.7 Deny-all NetworkPolicy for execution pods — `k8s/network-policy.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: exec-pods-deny-all
  namespace: codevault-exec
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
  ingress: []
  egress: []
```

### 8.8 `execution-service/runners/k8sRunner.js`

```js
// execution-service/runners/k8sRunner.js
const k8s = require("@kubernetes/client-node");
const { randomUUID } = require("crypto");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const batchApi = kc.makeApiClient(k8s.BatchV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const NAMESPACE = "codevault-exec";

async function runInKubernetes({ language, code, input }) {
  const jobId = randomUUID().slice(0, 8);

  await coreApi.createNamespacedConfigMap(NAMESPACE, {
    metadata: { name: `code-${jobId}` },
    data: { [`main.${extFor(language)}`]: code },
  });

  const jobManifest = buildJobManifest(jobId, language); // fills the YAML template above
  await batchApi.createNamespacedJob(NAMESPACE, jobManifest);

  const result = await waitForCompletionAndFetchLogs(jobId); // watch Job status, then pod logs
  await cleanup(jobId);
  return result;
}

module.exports = { runInKubernetes };
```

Then in `execution-service/index.js`, select the backend by env var:

```js
const backend = process.env.EXEC_BACKEND === "kubernetes"
  ? require("./runners/k8sRunner").runInKubernetes
  : require("./runners/dockerRunner").runInDocker;
```

---

## Phase 9 — KEDA Autoscaling

### 9.1 Install KEDA

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace
```

### 9.2 `k8s/keda-scaledobject.yaml`

Scales `code-worker` based on the BullMQ wait-list length in Redis.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: code-worker-scaler
  namespace: codevault-exec
spec:
  scaleTargetRef:
    name: code-worker
  minReplicaCount: 1
  maxReplicaCount: 20
  cooldownPeriod: 30
  triggers:
    - type: redis
      metadata:
        address: redis.codevault-exec.svc.cluster.local:6379
        listName: "bull:execution-queue:wait"
        listLength: "5"     # scale up once 5+ jobs are waiting per replica
```

Verify: `kubectl get scaledobject -n codevault-exec` and watch `kubectl get hpa -n codevault-exec` react as you push load.

---

## Phase 10 — Observability & Polish

### 10.1 Structured logging — `api-server/logger.js`

```js
const pino = require("pino");
module.exports = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: { level: (label) => ({ level: label }) },
});
```

### 10.2 Basic Prometheus metrics — `api-server/metrics.js`

```js
const client = require("prom-client");
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const jobsSubmitted = new client.Counter({
  name: "jobs_submitted_total",
  help: "Total code execution jobs submitted",
});
register.registerMetric(jobsSubmitted);

module.exports = { register, jobsSubmitted };
```

```js
// in server.js
const { register, jobsSubmitted } = require("./metrics");
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
// jobsSubmitted.inc() inside your POST /run/onlinecompiler handler
```

### 10.3 Rate limiting — `api-server/server.js`

```js
const rateLimit = require("express-rate-limit");
const submitLimiter = rateLimit({ windowMs: 60_000, max: 10 }); // 10 submissions/min/IP
app.post("/run/onlinecompiler", submitLimiter, handleSubmit);
```

---

## Execution Order Recap

| # | Phase | Depends on | Unlocks |
|---|---|---|---|
| 2 | Execution Service extraction | BullMQ (done) | Everything below — this is the fork point |
| 4 | Security hardening | Phase 2 | Safe to accept real user traffic |
| 5 | Frontend upgrade | none (parallel-safe) | Better UX, can be done anytime |
| 7 | Containerization | Phase 2 | One-command local environment |
| 8 | Kubernetes migration | Phase 7 | Real scalability, K8s hardening |
| 9 | KEDA autoscaling | Phase 8 + BullMQ | Worker count tracks load automatically |
| 10 | Observability | Phase 7/8 | Production readiness |

**Suggested next action:** implement Phase 2 in your existing repo first — it's a pure refactor (no new infra), low risk, and every later phase assumes it exists.

---

*MongoDB (Submission/User/Problem models) and Authentication (JWT) are intentionally deferred. When you're ready, they slot in as: (a) API writes a `Submission` doc alongside the BullMQ enqueue, (b) worker updates it on completion in addition to returning `job.returnvalue`, (c) an auth middleware gates `/run/*` and attaches `req.user` — none of Phases 2–10 need to change to accommodate this.*
