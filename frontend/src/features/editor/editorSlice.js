import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_SNIPPETS = {
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}`,
  python: `print("Hello from Python!")`,
  javascript: `console.log("Hello from JavaScript!");`,
};

const editorSlice = createSlice({
  name: "editor",
  initialState: {
    language: "python",
    code: DEFAULT_SNIPPETS.python,
    input: "",
  },
  reducers: {
    setLanguage(state, action) {
      state.language = action.payload;
      state.code = DEFAULT_SNIPPETS[action.payload];
    },
    setCode(state, action) {
      state.code = action.payload;
    },
    setInput(state, action) {
      state.input = action.payload;
    },
  },
});

export const { setLanguage, setCode, setInput } = editorSlice.actions;
export default editorSlice.reducer;
