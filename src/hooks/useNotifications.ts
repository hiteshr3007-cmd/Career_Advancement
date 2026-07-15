"use client";

import { useEffect, useState } from "react";

import { isCandidate, isViewerRole } from "@/lib/roles";
import benchmarkService from "@/services/benchmark.service";
import candidateService from "@/services/candidate.service";
import matchingService from "@/services/matching.service";
import resumeService from "@/services/resume.service";
import { useAuth } from "@/store/auth-context";
import { NotificationItem } from "@/types/notification";

async function buildCandidateNotifications(): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];

  const [profile, resumes, matches] = await Promise.all([
    candidateService.getMyProfile().catch(() => null),
    resumeService.listResumes().catch(() => []),
    matchingService.getMyMatches().catch(() => []),
  ]);

  if (profile && profile.profile_completeness < 100) {
    items.push({
      id: "profile-incomplete",
      tone: "warning",
      title: `Profile ${Math.round(profile.profile_completeness)}% complete`,
      description: "Fill in missing details to improve your match quality.",
      href: "/profile",
    });
  }

  if (resumes.length === 0) {
    items.push({
      id: "no-resume",
      tone: "info",
      title: "No resume uploaded",
      description: "Upload a resume to unlock parsing and matching.",
      href: "/upload",
    });
  } else {
    const failed = resumes.find((r) => r.parsing_status === "failed");
    const inProgress = resumes.find(
      (r) => r.parsing_status === "pending" || r.parsing_status === "processing"
    );
    if (failed) {
      items.push({
        id: "resume-failed",
        tone: "warning",
        title: "Resume parsing failed",
        description: failed.parsing_error ?? "We couldn't parse your latest resume.",
        href: "/upload",
      });
    } else if (inProgress) {
      items.push({
        id: "resume-processing",
        tone: "info",
        title: "Resume parsing in progress",
        description: "We're extracting your skills and experience — check back shortly.",
        href: "/upload",
      });
    }
  }

  if (matches.length === 0) {
    items.push({
      id: "no-matches",
      tone: "info",
      title: "No career matches yet",
      description: "Compute matches to see how you stack up against active roles.",
      href: "/matches",
    });
  } else {
    const ready = matches.filter((m) => m.gap_summary.overall_recommendation === "ready");
    if (ready.length > 0) {
      items.push({
        id: "ready-matches",
        tone: "success",
        title: `Ready to apply for ${ready.length} role${ready.length > 1 ? "s" : ""}`,
        description: "Your profile already meets the bar for these benchmarks.",
        href: "/matches",
      });
    }
  }

  return items;
}

async function buildViewerNotifications(): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];

  const [candidatePage, benchmarks] = await Promise.all([
    candidateService.searchCandidates({ limit: 1, offset: 0 }).catch(() => null),
    benchmarkService.listBenchmarks({ limit: 1 }).catch(() => []),
  ]);

  if (benchmarks.length === 0) {
    items.push({
      id: "no-benchmarks",
      tone: "warning",
      title: "No active benchmarks",
      description: "Create a benchmark so candidates can be scored and matched.",
      href: "/benchmarks",
    });
  }

  if (candidatePage) {
    if (candidatePage.total === 0) {
      items.push({
        id: "no-candidates",
        tone: "info",
        title: "No candidates yet",
        description: "Your talent pool is empty.",
        href: "/candidates",
      });
    } else {
      items.push({
        id: "candidate-pool",
        tone: "info",
        title: `${candidatePage.total} candidate${candidatePage.total > 1 ? "s" : ""} in your talent pool`,
        href: "/candidates",
      });
    }
  }

  return items;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!user) {
        if (isMounted) {
          setNotifications([]);
          setIsLoading(false);
        }
        return;
      }

      const items = isCandidate(user.role)
        ? await buildCandidateNotifications()
        : isViewerRole(user.role)
          ? await buildViewerNotifications()
          : [];

      if (isMounted) {
        setNotifications(items);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { notifications, isLoading };
}
