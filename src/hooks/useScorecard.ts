"use client";

import { useEffect, useState } from "react";

import { extractApiError } from "@/lib/api";
import candidateService from "@/services/candidate.service";
import scorecardService from "@/services/scorecard.service";
import { SkillOut } from "@/types/candidate";
import { ScorecardOut } from "@/types/scorecard";

// The scorecard's skill_scores are keyed by name, not skill id (it's a
// computed-on-demand projection, not a stored row) — fetch the candidate's
// actual skill list alongside it so the manual-score editor has an id to
// PATCH /candidates/me/skills/{id} against.
export function useScorecard() {
  const [scorecard, setScorecard] = useState<ScorecardOut | null>(null);
  const [skills, setSkills] = useState<SkillOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const [scorecardData, profile] = await Promise.all([
        scorecardService.getMyScorecard(),
        candidateService.getMyProfile(),
      ]);
      setScorecard(scorecardData);
      setSkills(profile.skills);
      setError(null);
    } catch (err) {
      setError(extractApiError(err, "Couldn't load your scorecard. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { scorecard, skills, isLoading, error, refresh: load };
}
