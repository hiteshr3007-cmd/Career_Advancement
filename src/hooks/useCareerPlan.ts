"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

import { extractApiError } from "@/lib/api";
import careerService from "@/services/career.service";
import { CareerPlanOut } from "@/types/career";

const POLL_INTERVAL_MS = 2000;

// Shared by the Gap Analysis and Career Roadmap pages — both read off the same
// CareerPlan row and need the same "no plan yet / generating / ready" states.
export function useCareerPlan() {
  const [plan, setPlan] = useState<CareerPlanOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPlan = async () => {
    try {
      const data = await careerService.getMyPlan();
      setPlan(data);
      setError(null);
    } catch (err) {
      // No plan generated yet is expected the first time — not an error state.
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setPlan(null);
        setError(null);
      } else {
        setError(extractApiError(err, "Couldn't load your career plan. Please try again."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const isInFlight = plan?.status === "pending" || plan?.status === "processing";

    if (isInFlight && !pollRef.current) {
      pollRef.current = setInterval(loadPlan, POLL_INTERVAL_MS);
    } else if (!isInFlight && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.status]);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const status = await careerService.generateMyPlan();
      setPlan((prev) => ({
        gap_report: null,
        recommendations: null,
        roadmap: null,
        notes: [],
        ...prev,
        ...status,
      }));
    } catch (err) {
      setError(
        extractApiError(err, "Couldn't start career plan generation. Please try again.")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return { plan, isLoading, isGenerating, error, generate };
}
