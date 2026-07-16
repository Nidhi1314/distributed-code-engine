import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const submitCode = createAsyncThunk(
  "job/submit",
  async ({ language, code, input }) => {
    const { data } = await axios.post(`${API_URL}/submit`, {
      language,
      code,
      input,
    });
    return data.jobId;
  }
);

export const pollJob = createAsyncThunk("job/poll", async (jobId) => {
  const { data } = await axios.get(`${API_URL}/status/${jobId}`);
  return data;
});

const jobSlice = createSlice({
  name: "job",
  initialState: {
    jobId: null,
    status: "idle", // idle | queued | polling | success | error
    result: null,
    error: null,
  },
  reducers: {
    resetJob(state) {
      state.jobId = null;
      state.status = "idle";
      state.result = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitCode.pending, (state) => {
        state.status = "queued";
        state.result = null;
        state.error = null;
      })
      .addCase(submitCode.fulfilled, (state, action) => {
        state.jobId = action.payload;
        state.status = "polling";
      })
      .addCase(submitCode.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message;
      })
      .addCase(pollJob.fulfilled, (state, action) => {
        const { status, output } = action.payload;
        if (status === "success") {
          state.status = "success";
          state.result = output;
        } else if (status === "error") {
          state.status = "error";
          state.result = output;
        }
        // if still pending, status stays "polling"
      });
  },
});

export const { resetJob } = jobSlice.actions;
export default jobSlice.reducer;
