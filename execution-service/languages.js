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

export default languageConfig;