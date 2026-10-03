"use client";

import { RetroModal } from "./RetroModal";
import { RetroButton } from "./RetroButton";
import { getAvatarUrl, getGithubUsername, type Profile } from "@/lib/api";

interface IncomingRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: Profile[];
  onAccept: (candidate: Profile) => Promise<void>;
  onDecline: (candidateId: number) => Promise<void>;
  actionInProgressId: number | null;
}

export function IncomingRequestsModal({
  isOpen,
  onClose,
  requests,
  onAccept,
  onDecline,
  actionInProgressId,
}: IncomingRequestsModalProps) {
  return (
    <RetroModal
      isOpen={isOpen}
      onClose={onClose}
      title={`RADAR // INCOMING SIGNALS (${requests.length})`}
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {requests.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center">
            <p className="font-mono text-xs text-text-secondary">
              NO_PENDING_INCOMING_SIGNALS. YOUR PROFILE IS BROADCASTING ACROSS THE NETWORK.
            </p>
          </div>
        ) : (
          requests.map((candidate) => {
            const avatarUrl = getAvatarUrl(candidate.githubUrl);
            const githubHandle = getGithubUsername(candidate.githubUrl);
            const isProcessing = actionInProgressId === candidate.id;

            return (
              <article
                key={candidate.id}
                className="border-2 border-accent bg-olive-light/20 p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={candidate.name}
                        className="h-12 w-12 border border-accent object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center border border-accent bg-olive font-display text-xl text-accent">
                        {candidate.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-display text-2xl text-accent">{candidate.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] text-text-secondary">
                        {candidate.location && (
                          <span className="border border-border px-1.5 py-0.5">
                            📍 {candidate.location}
                          </span>
                        )}
                        {githubHandle && (
                          <a
                            href={`https://github.com/${githubHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent underline hover:opacity-80"
                          >
                            @{githubHandle} ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[8px] tracking-wider text-accent">
                    INTERESTED IN YOU
                  </span>
                </div>

                <p className="font-body text-xs leading-relaxed text-text-secondary">
                  {candidate.bio || candidate.lookingFor || "Ready to collaborate and build together."}
                </p>

                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill) => (
                      <span
                        key={skill}
                        className="border border-accent/30 bg-olive-light/30 px-2 py-0.5 font-mono text-[9px] text-accent"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <RetroButton
                    variant="outline"
                    onClick={() => void onDecline(candidate.id)}
                    disabled={isProcessing}
                    className="py-2 text-xs"
                  >
                    {isProcessing ? "PROCESSING..." : "DECLINE"}
                  </RetroButton>
                  <RetroButton
                    onClick={() => void onAccept(candidate)}
                    disabled={isProcessing}
                    className="py-2 text-xs"
                  >
                    {isProcessing ? "ACCEPTING..." : "ACCEPT & MATCH"}
                  </RetroButton>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex justify-end">
        <RetroButton variant="outline" onClick={onClose}>
          CLOSE_RADAR
        </RetroButton>
      </div>
    </RetroModal>
  );
}
