// execution-service/validators/staticValidator.js

const RULES = {
  javascript: [
    { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, reason: "child_process module is blocked" },
    { pattern: /require\s*\(\s*['"]net['"]\s*\)/, reason: "net module is blocked" },
    { pattern: /require\s*\(\s*['"]dgram['"]\s*\)/, reason: "dgram module is blocked" },
    { pattern: /require\s*\(\s*['"]fs['"]\s*\)/, reason: "fs module is blocked" },
    { pattern: /require\s*\(\s*['"]cluster['"]\s*\)/, reason: "cluster module is blocked" },
    { pattern: /process\.binding/, reason: "process.binding is blocked" },
    { pattern: /process\.env/, reason: "process.env access is blocked" },
    { pattern: /process\.exit/, reason: "process.exit is blocked" },
  ],
  python: [
    { pattern: /import\s+os\b/, reason: "os module is blocked" },
    { pattern: /from\s+os\s+import/, reason: "os module is blocked" },
    { pattern: /import\s+subprocess/, reason: "subprocess module is blocked" },
    { pattern: /import\s+socket/, reason: "socket module is blocked" },
    { pattern: /import\s+shutil/, reason: "shutil module is blocked" },
    { pattern: /__import__\s*\(/, reason: "__import__() is blocked" },
    { pattern: /open\s*\(.*['"]\/etc/, reason: "reading system files is blocked" },
    { pattern: /exec\s*\(/, reason: "exec() is blocked" },
    { pattern: /eval\s*\(/, reason: "eval() is blocked" },
  ],
  cpp: [
    { pattern: /#include\s*<sys\/socket\.h>/, reason: "socket programming is blocked" },
    { pattern: /system\s*\(/, reason: "system() is blocked" },
    { pattern: /fork\s*\(/, reason: "fork() is blocked" },
    { pattern: /exec[lv]p?\s*\(/, reason: "exec functions are blocked" },
    { pattern: /popen\s*\(/, reason: "popen() is blocked" },
    { pattern: /#include\s*<fstream>/, reason: "file I/O is blocked" },
  ],
};

function validate(language, code) {
  const rules = RULES[language] || [];
  for (const { pattern, reason } of rules) {
    if (pattern.test(code)) {
      return reason;
    }
  }
  return null; // null = safe, no violation
}

export { validate };
