"use client";

import { RetroButton } from "./RetroButton";
import { getAvatarUrl, getGithubUsername, type Profile } from "@/lib/api";

interface TeammateIntelPanelProps {
  user: Profile;
  onClose: () => void;
  onUnmatch?: () => void;
}

export function TeammateIntelPanel({ user, onClose, onUnmatch }: TeammateIntelPanelProps) {
  const avatarUrl = getAvatarUrl(user.githubUrl);
  const githubHandle = getGithubUsername(user.githubUrl);

  return (
    <aside className="border-t lg:border-t-0 lg:border-l border-accent bg-olive-light/25 p-5 flex flex-col gap-5 w-full lg:w-80 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-accent" />
          <span className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            TEAMMATE_INTEL
          </span>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-xs text-text-secondary hover:text-accent font-bold"
          aria-label="Close Intel Panel"
        >
          [X]
        </button>
      </div>

      <div className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={user.name}
            className="h-14 w-14 border-2 border-accent object-cover shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center border-2 border-accent bg-olive font-display text-2xl text-accent shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl text-accent truncate">{user.name}</h3>
          <p className="font-mono text-[9px] text-text-secondary truncate">{user.email}</p>
        </div>
      </div>

      {user.location && (
        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
            LOCATION // TIMEZONE
          </span>
          <p className="font-body text-xs text-text-primary">📍 {user.location}</p>
        </div>
      )}

      {githubHandle && (
        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
            SOURCE CODE REGISTRY
          </span>
          <div>
            <a
              href={`https://github.com/${githubHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] text-accent hover:bg-accent hover:text-olive transition-colors"
            >
              <span>GITHUB: @{githubHandle}</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}

      {user.lookingFor && (
        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
            COLLABORATION INTENT
          </span>
          <p className="border-l-2 border-accent bg-olive-light/20 p-2 font-body text-xs text-text-primary">
            {user.lookingFor}
          </p>
        </div>
      )}

      {user.projectPitch && (
        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-accent font-bold">
            HACKATHON PITCH // CONCEPT
          </span>
          <p className="border-l-2 border-accent bg-accent/10 p-2 font-mono text-xs text-text-primary italic">
            &quot;{user.projectPitch}&quot;
          </p>
        </div>
      )}

      <div className="space-y-2">
        <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
          TECHNICAL STACK ({user.skills.length})
        </span>
        <div className="flex flex-wrap gap-1.5">
          {user.skills.length > 0 ? (
            user.skills.map((skill) => (
              <span
                key={skill}
                className="border border-accent/40 bg-olive-light/40 px-2 py-0.5 font-mono text-[9px] text-accent"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="font-mono text-[9px] text-text-secondary">NONE SPECIFIED</span>
          )}
        </div>
      </div>

      {user.bio && (
        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
            DEVELOPER DOSSIER
          </span>
          <p className="font-body text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
            {user.bio}
          </p>
        </div>
      )}

      {onUnmatch && (
        <div className="pt-4 mt-auto border-t border-border">
          <RetroButton
            variant="outline"
            onClick={onUnmatch}
            className="w-full py-2 text-[10px] text-red-400 border-red-400/50 hover:bg-red-400/10 hover:border-red-400"
          >
            TERMINATE CONNECTION // UNMATCH
          </RetroButton>
        </div>
      )}
    </aside>
  );
}
