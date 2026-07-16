// execution-service/index.js
import { runInDocker } from "./runners/dockerRunner.js";
import { validate } from "./validators/staticValidator.js";

async function executeCode({ language, code, input }) {
 //const violation = validate(language, code);
  const violation = validate(language, code);
  if (violation) {
    return {
      stdout: "",
      stderr: `Rejected: ${violation}`,
      exitCode: 126,
      executionTime: 0,
    };
  }
  return runInDocker({ language, code, input });
}

export { executeCode };
