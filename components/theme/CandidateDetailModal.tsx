"use client";

import { RetroModal } from "./RetroModal";
import { RetroButton } from "./RetroButton";
import { getAvatarUrl, getGithubUsername, type DiscoverResult, type SwipeDirection } from "@/lib/api";

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: DiscoverResult | null;
  onSwipe: (targetUserId: number, direction: SwipeDirection) => void;
  isSwiping: boolean;
}

export function CandidateDetailModal({
  isOpen,
  onClose,
  candidate,
  onSwipe,
  isSwiping,
}: CandidateDetailModalProps) {
  if (!candidate) return null;

  const { profile, sharedSkillCount, sharedSkills } = candidate;
  const avatarUrl = getAvatarUrl(profile.githubUrl);
  const githubHandle = getGithubUsername(profile.githubUrl);

  return (
    <RetroModal
      isOpen={isOpen}
      onClose={onClose}
      title={`SIGNAL_DOSSIER // ${profile.name.toUpperCase()}`}
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* Header Profile Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-border pb-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={profile.name}
              className="h-16 w-16 border-2 border-accent object-cover shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center border-2 border-accent bg-olive font-display text-3xl text-accent shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              {profile.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] text-text-secondary">
                ID::{profile.id}
              </span>
              {profile.location && (
                <span className="border border-border bg-olive-light/20 px-2 py-0.5 font-mono text-[9px] text-text-secondary">
                  📍 {profile.location}
                </span>
              )}
            </div>
            <h2 className="font-display text-4xl text-accent leading-none mt-1">
              {profile.name}
            </h2>
            {githubHandle && (
              <a
                href={`https://github.com/${githubHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] text-accent hover:bg-accent hover:text-olive transition-colors"
              >
                <span>GITHUB: @{githubHandle}</span>
                <span>↗</span>
              </a>
            )}
          </div>
        </div>

        {/* Looking For / Intent */}
        {profile.lookingFor && (
          <div className="space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
              COLLABORATION INTENT & HACKATHON GOAL
            </span>
            <div className="border-l-2 border-accent bg-olive-light/25 p-3 font-mono text-xs text-text-primary">
              {profile.lookingFor}
            </div>
          </div>
        )}

        {/* Bio */}
        <div className="space-y-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
            DEVELOPER BIOGRAPHY
          </span>
          <p className="font-body text-sm leading-relaxed text-text-primary whitespace-pre-wrap bg-olive-light/10 p-3 border border-border/60">
            {profile.bio || "No expanded dossier provided by this developer."}
          </p>
        </div>

        {/* Technical Stack with Shared Skills Highlighted */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
              TECHNICAL STACK ({profile.skills.length} REGISTERED)
            </span>
            <span className="font-mono text-[9px] text-accent font-bold">
              SHARED STACK::{sharedSkillCount}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => {
              const isShared = sharedSkills.includes(skill);
              return (
                <span
                  key={skill}
                  className={`px-2.5 py-1 font-mono text-[10px] border ${
                    isShared
                      ? "border-accent bg-accent/25 text-accent font-bold shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                      : "border-border text-text-secondary bg-olive-light/20"
                  }`}
                >
                  {isShared ? `★ ${skill}` : skill}
                </span>
              );
            })}
          </div>
        </div>

        {/* Swipe Actions Inside Modal */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <RetroButton
            variant="outline"
            onClick={() => {
              onSwipe(profile.id, "PASS");
              onClose();
            }}
            disabled={isSwiping}
            className="py-2.5 text-xs"
          >
            PASS (SKIP)
          </RetroButton>
          <RetroButton
            onClick={() => {
              onSwipe(profile.id, "LIKE");
              onClose();
            }}
            disabled={isSwiping}
            className="py-2.5 text-xs"
          >
            LIKE & CONNECT
          </RetroButton>
        </div>
      </div>
    </RetroModal>
  );
}
