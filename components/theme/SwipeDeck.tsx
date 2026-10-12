"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { type DiscoverResult, type SwipeDirection, getAvatarUrl, getGithubUsername } from "@/lib/api";
import { RetroButton } from "./RetroButton";

interface SwipeDeckProps {
  candidates: DiscoverResult[];
  onSwipe: (targetUserId: number, direction: SwipeDirection) => void;
  onInspect: (candidate: DiscoverResult) => void;
  isSwiping: boolean;
  onRewind: () => void;
  isRewinding: boolean;
  selectedSkill: string | null;
  onResetFilter: () => void;
}

interface SwipeCardProps {
  candidate: DiscoverResult;
  onSwipe: (targetUserId: number, direction: SwipeDirection) => void;
  onInspect: (candidate: DiscoverResult) => void;
  forcedDirection: SwipeDirection | null;
  onDismissComplete: () => void;
}

function SwipeCard({
  candidate,
  onSwipe,
  onInspect,
  forcedDirection,
  onDismissComplete,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-16, 16]);
  const opacity = useTransform(x, [-500, -260, 0, 260, 500], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [20, 75], [0, 1]);
  const passOpacity = useTransform(x, [-20, -75], [0, 1]);

  const [isDismissing, setIsDismissing] = useState(false);
  const isDraggingRef = useRef(false);

  const dismiss = useCallback(
    (direction: SwipeDirection) => {
      if (isDismissing) return;
      setIsDismissing(true);

      const flyTarget =
        direction === "LIKE"
          ? Math.max(typeof window !== "undefined" ? window.innerWidth : 600, 600)
          : -Math.max(typeof window !== "undefined" ? window.innerWidth : 600, 600);

      animate(x, flyTarget, { duration: 0.22, ease: "easeOut" }).then(() => {
        onSwipe(candidate.profile.id, direction);
        onDismissComplete();
      });
    },
    [isDismissing, candidate.profile.id, onSwipe, onDismissComplete, x],
  );

  // Trigger dismissal if a programmatic action was requested (button or keyboard)
  useEffect(() => {
    if (forcedDirection && !isDismissing) {
      dismiss(forcedDirection);
    }
  }, [forcedDirection, isDismissing, dismiss]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Keep isDraggingRef active briefly so synthesized clicks on touch release are ignored
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);

    if (isDismissing) return;

    // Mobile-optimized swipe thresholds: 70px drag or 280px/s velocity flick
    const threshold = 70;
    const velocityThreshold = 280;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      dismiss("LIKE");
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      dismiss("PASS");
    } else {
      // Smooth spring back to center
      animate(x, 0, { type: "spring", stiffness: 450, damping: 28 });
    }
  };

  const handleInspectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current || isDismissing) return;
    onInspect(candidate);
  };

  const avatarUrl = getAvatarUrl(candidate.profile.githubUrl);
  const githubUser = getGithubUsername(candidate.profile.githubUrl);

  return (
    <motion.div
      style={{ x, rotate, opacity, touchAction: "pan-y" }}
      drag="x"
      dragElastic={0.65}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="touch-pan-y absolute inset-0 flex flex-col justify-between rounded-sm border-2 border-accent bg-olive p-4 sm:p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:shadow-[10px_10px_0_0_rgba(0,0,0,1)] cursor-grab active:cursor-grabbing select-none hover:border-accent"
    >
      {/* CONNECT // LIKE Stamp Overlay */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute top-4 left-4 sm:top-6 sm:left-6 z-40 rounded border-2 sm:border-4 border-emerald-400 bg-emerald-950/90 px-3 py-1 sm:px-4 sm:py-1.5 font-display text-2xl sm:text-3xl font-black tracking-wider text-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.6)] -rotate-12"
      >
        CONNECT // LIKE
      </motion.div>

      {/* DISCARD // PASS Stamp Overlay */}
      <motion.div
        style={{ opacity: passOpacity }}
        className="pointer-events-none absolute top-4 right-4 sm:top-6 sm:right-6 z-40 rounded border-2 sm:border-4 border-rose-500 bg-rose-950/90 px-3 py-1 sm:px-4 sm:py-1.5 font-display text-2xl sm:text-3xl font-black tracking-wider text-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6)] rotate-12"
      >
        DISCARD // PASS
      </motion.div>

      {/* Card Header */}
      <div>
        <div className="flex items-start justify-between border-b border-border pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={candidate.profile.name}
                className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-accent object-cover shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
              />
            ) : (
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center border-2 border-accent bg-olive-light/30 font-display text-xl sm:text-2xl text-accent shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                {candidate.profile.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[8px] sm:text-[9px] text-text-secondary">
                  SIGNAL::{candidate.profile.id}
                </span>
                <span className="border border-accent bg-accent/20 px-1.5 py-0.5 font-mono text-[8px] sm:text-[9px] text-accent font-bold">
                  ⚡ {candidate.synergyScore || 75}% SYNERGY
                </span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl text-accent leading-none mt-1">
                {candidate.profile.name}
              </h3>
              {candidate.profile.location && (
                <p className="font-mono text-[9px] sm:text-[10px] text-text-secondary mt-0.5">
                  📍 {candidate.profile.location}
                </p>
              )}
            </div>
          </div>

          {githubUser && (
            <a
              href={`https://github.com/${githubUser}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-[8px] sm:text-[9px] text-accent hover:bg-accent hover:text-olive transition-colors"
            >
              GITHUB ↗
            </a>
          )}
        </div>

        {/* Candidate Pitch / Bio */}
        <div
          className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 cursor-pointer"
          onClick={handleInspectClick}
          title="Click to view full dossier"
        >
          <p className="font-body text-xs sm:text-sm leading-relaxed text-text-secondary line-clamp-2 sm:line-clamp-3">
            {candidate.profile.bio || "Developer ready for hackathons and open-source collaboration."}
          </p>

          {candidate.profile.lookingFor && (
            <div className="border-l-2 border-accent bg-olive-light/20 p-2 font-mono text-[10px] sm:text-[11px] text-text-primary">
              <span className="text-accent font-bold">LOOKING FOR:</span>{" "}
              {candidate.profile.lookingFor}
            </div>
          )}

          {candidate.profile.projectPitch && (
            <div className="border border-accent/40 bg-accent/10 p-2 font-mono text-[10px] sm:text-[11px] text-text-primary">
              <span className="text-accent font-bold">PITCH:</span>{" "}
              <span className="italic">&quot;{candidate.profile.projectPitch}&quot;</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Skills & Inspect Affordance */}
      <div className="border-t border-border pt-2.5 sm:pt-3 space-y-2">
        <div className="flex items-center justify-between font-mono text-[9px] sm:text-[10px]">
          <span className="text-accent font-bold">
            SHARED SKILLS: {candidate.sharedSkillCount}
          </span>
          <button
            type="button"
            onClick={handleInspectClick}
            className="text-accent hover:underline flex items-center gap-1"
          >
            <span>DOSSIER ↗</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {candidate.profile.skills.slice(0, 6).map((skill) => {
            const isShared = candidate.sharedSkills.includes(skill);
            return (
              <span
                key={skill}
                className={`border px-1.5 sm:px-2 py-0.5 font-mono text-[9px] sm:text-[10px] ${
                  isShared
                    ? "border-accent bg-accent/25 text-accent font-bold shadow-[1px_1px_0_0_rgba(0,0,0,1)]"
                    : "border-border text-text-secondary bg-olive-light/10"
                }`}
              >
                {skill}
              </span>
            );
          })}
          {candidate.profile.skills.length > 6 && (
            <button
              type="button"
              onClick={handleInspectClick}
              className="font-mono text-[9px] sm:text-[10px] text-accent hover:underline self-center"
            >
              +{candidate.profile.skills.length - 6} more
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function SwipeDeck({
  candidates,
  onSwipe,
  onInspect,
  onRewind,
  isRewinding,
  selectedSkill,
  onResetFilter,
}: SwipeDeckProps) {
  const [forcedDirection, setForcedDirection] = useState<SwipeDirection | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const topCandidate = candidates[0];
  const nextCandidate = candidates[1];
  const thirdCandidate = candidates[2];

  const triggerSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!topCandidate || isDismissing) return;
      setIsDismissing(true);
      setForcedDirection(direction);
    },
    [topCandidate, isDismissing],
  );

  const handleDismissComplete = useCallback(() => {
    setIsDismissing(false);
    setForcedDirection(null);
  }, []);

  // Keyboard shortcut listener: Left Arrow (PASS), Right Arrow (LIKE), Space/Up (INSPECT)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!topCandidate || isDismissing) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        triggerSwipe("PASS");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        triggerSwipe("LIKE");
      } else if (e.key === "ArrowUp" || e.key === " ") {
        e.preventDefault();
        onInspect(topCandidate);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [topCandidate, isDismissing, triggerSwipe, onInspect]);

  // Empty state when all profiles have been swiped
  if (candidates.length === 0) {
    return (
      <div className="mx-auto max-w-md border-2 border-dashed border-border bg-olive-light/10 p-6 sm:p-10 text-center space-y-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        <div className="flex justify-center">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-accent/40 flex items-center justify-center font-display text-2xl text-accent animate-pulse">
            ∅
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-heading text-xs sm:text-sm uppercase tracking-wider text-accent font-bold">
            CASSETTE DECK DEPLETED
          </p>
          <p className="font-mono text-xs text-text-secondary">
            {selectedSkill
              ? `NO MORE CANDIDATES MATCHING "${selectedSkill.toUpperCase()}".`
              : "YOU HAVE REVIEWED ALL CANDIDATE SIGNALS IN YOUR QUEUE."}
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          {selectedSkill && (
            <RetroButton
              variant="outline"
              onClick={onResetFilter}
              className="w-full text-xs"
            >
              RESET_STACK_FILTER
            </RetroButton>
          )}
          <RetroButton
            onClick={onRewind}
            disabled={isRewinding}
            className="w-full text-xs"
          >
            {isRewinding ? "REWINDING_TAPE..." : "REWIND_QUEUE // RESET_SKIPPED_PASSES"}
          </RetroButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center select-none px-2 sm:px-0">
      {/* Deck Status Bar */}
      <div className="mb-3 sm:mb-4 flex w-full max-w-[390px] sm:max-w-[420px] items-center justify-between font-mono text-[10px] sm:text-[11px] text-text-secondary px-1">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent animate-ping" />
          <span>DECK // 1 OF {candidates.length} AVAILABLE</span>
        </span>
        <span className="hidden sm:inline-block border border-border bg-olive-light/20 px-2 py-0.5 text-[10px] text-accent">
          [← PASS] [SPACE INFO] [→ LIKE]
        </span>
      </div>

      {/* 3D Stack Container */}
      <div className="relative h-[470px] sm:h-[510px] w-full max-w-[390px] sm:max-w-[420px]">
        {/* Layer 3: Subtle Background Depth Card */}
        {thirdCandidate && (
          <div
            className="absolute inset-0 rounded-sm border-2 border-border/40 bg-olive-light/5 shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] pointer-events-none"
            style={{
              transform: "translateY(24px) scale(0.90)",
              opacity: 0.3,
            }}
          />
        )}

        {/* Layer 2: Next Card in Queue (Peeking Behind) */}
        {nextCandidate && (
          <div
            className="absolute inset-0 rounded-sm border-2 border-accent/40 bg-olive-light/10 p-4 sm:p-6 shadow-[5px_5px_0_0_rgba(0,0,0,0.6)] pointer-events-none transition-all duration-300"
            style={{
              transform: "translateY(12px) scale(0.95)",
              opacity: 0.65,
            }}
          >
            <div className="flex items-center gap-3 border-b border-border/50 pb-3 opacity-60">
              <div className="h-10 w-10 border border-accent/40 bg-olive flex items-center justify-center font-display text-lg text-accent">
                {nextCandidate.profile.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-display text-xl sm:text-2xl text-accent leading-none">
                  {nextCandidate.profile.name}
                </p>
                <p className="font-mono text-[8px] sm:text-[9px] text-text-secondary mt-1">
                  ⚡ {nextCandidate.synergyScore || 75}% SYNERGY
                </p>
              </div>
            </div>
            <p className="mt-3 sm:mt-4 font-body text-xs text-text-secondary/70 line-clamp-3">
              {nextCandidate.profile.bio || "Developer ready for hackathons and projects."}
            </p>
          </div>
        )}

        {/* Layer 1: Top Interactive Draggable Card */}
        {topCandidate && (
          <SwipeCard
            key={topCandidate.profile.id}
            candidate={topCandidate}
            onSwipe={onSwipe}
            onInspect={onInspect}
            forcedDirection={forcedDirection}
            onDismissComplete={handleDismissComplete}
          />
        )}
      </div>

      {/* Big Arcade Swipe Controls */}
      <div className="mt-6 sm:mt-8 flex w-full max-w-[390px] sm:max-w-[420px] items-center justify-between gap-3 sm:gap-4 px-1 sm:px-2">
        {/* PASS BUTTON */}
        <button
          type="button"
          onClick={() => triggerSwipe("PASS")}
          disabled={isDismissing || !topCandidate}
          className="group flex flex-1 flex-col items-center justify-center border-2 border-rose-500/80 bg-rose-950/20 py-2.5 sm:py-3.5 text-rose-400 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:border-rose-400 hover:bg-rose-500 hover:text-black active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-40"
          title="Pass on candidate (Key: ←)"
        >
          <span className="font-display text-xl sm:text-2xl font-black leading-none group-hover:scale-110 transition-transform">
            ✕ PASS
          </span>
          <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider text-rose-400/70 group-hover:text-black mt-1">
            [PRESS ←]
          </span>
        </button>

        {/* DOSSIER INSPECT BUTTON */}
        <button
          type="button"
          onClick={() => topCandidate && onInspect(topCandidate)}
          disabled={!topCandidate}
          className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center border-2 border-accent/60 bg-olive-light/20 text-accent shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:border-accent hover:bg-accent/20 hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-40"
          title="Inspect Full Dossier (Key: SPACE)"
        >
          <span className="font-mono text-[10px] sm:text-xs font-bold">INFO ↗</span>
        </button>

        {/* LIKE BUTTON */}
        <button
          type="button"
          onClick={() => triggerSwipe("LIKE")}
          disabled={isDismissing || !topCandidate}
          className="group flex flex-1 flex-col items-center justify-center border-2 border-emerald-400/80 bg-emerald-950/20 py-2.5 sm:py-3.5 text-emerald-400 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:border-emerald-300 hover:bg-emerald-400 hover:text-black active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-40"
          title="Connect / Match with candidate (Key: →)"
        >
          <span className="font-display text-xl sm:text-2xl font-black leading-none group-hover:scale-110 transition-transform">
            ♥ CONNECT
          </span>
          <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider text-emerald-400/70 group-hover:text-black mt-1">
            [PRESS →]
          </span>
        </button>
      </div>

      <p className="mt-3 font-mono text-[9px] sm:text-[10px] text-text-secondary/60 text-center">
        SWIPE CARD LEFT/RIGHT OR USE BUTTONS // TAP FOR DETAILS
      </p>
    </div>
  );
}
