"use client";

import { useEffect, useState } from "react";
import { Award, Briefcase, GraduationCap, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import candidateService from "@/services/candidate.service";
import { CandidateProfile } from "@/types/candidate";

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    candidateService
      .getMyProfile()
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch(() => {
        if (isMounted) {
          setError(
            "We couldn't load your profile yet. Upload a resume to get started."
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading your profile...</p>;
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <User className="mx-auto text-slate-300" size={40} />
        <p className="mt-3 text-slate-600">{error ?? "No profile found."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
        <p className="text-sm text-slate-500">
          {profile.phone} · {profile.location}
        </p>
        {profile.summary && (
          <p className="mt-4 text-slate-700">{profile.summary}</p>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Award size={18} className="text-indigo-600" />
          Skills & Certifications
        </h2>

        {profile.skills?.length || profile.certifications?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.skills?.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
            {profile.certifications?.map((cert) => (
              <Badge key={cert} variant="outline">
                {cert}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No skills or certifications extracted yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Briefcase size={18} className="text-indigo-600" />
          Experience
        </h2>

        {profile.experience?.length ? (
          <ul className="mt-4 space-y-4">
            {profile.experience.map((exp, index) => (
              <li key={index} className="border-l-2 border-indigo-100 pl-4">
                <p className="font-medium text-slate-900">
                  {exp.title} · {exp.company}
                </p>
                {exp.duration && (
                  <p className="text-sm text-slate-500">{exp.duration}</p>
                )}
                {exp.description && (
                  <p className="mt-1 text-sm text-slate-600">
                    {exp.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No work experience on file yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <GraduationCap size={18} className="text-indigo-600" />
          Education
        </h2>

        {profile.education?.length ? (
          <ul className="mt-4 space-y-3">
            {profile.education.map((edu, index) => (
              <li key={index}>
                <p className="font-medium text-slate-900">{edu.degree}</p>
                <p className="text-sm text-slate-500">
                  {edu.institution}
                  {edu.year ? ` · ${edu.year}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No education history on file yet.
          </p>
        )}
      </section>
    </div>
  );
}
