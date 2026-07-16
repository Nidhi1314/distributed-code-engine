import { configureStore } from "@reduxjs/toolkit";
import editorReducer from "../features/editor/editorSlice";
import jobReducer from "../features/job/jobSlice";

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    job: jobReducer,
  },
});
