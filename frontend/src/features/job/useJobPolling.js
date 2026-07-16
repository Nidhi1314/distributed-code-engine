import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { pollJob } from "./jobSlice";

export function useJobPolling() {
  const dispatch = useDispatch();
  const { jobId, status } = useSelector((s) => s.job);

  useEffect(() => {
    if (!jobId || status !== "polling") return;

    const interval = setInterval(() => {
      dispatch(pollJob(jobId));
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId, status, dispatch]);
}
