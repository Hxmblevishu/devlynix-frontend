"use client";

import { Navbar } from "@/components/theme/Navbar";
import { RetroButton } from "@/components/theme/RetroButton";
import { TechnicalFrame } from "@/components/theme/TechnicalFrame";
import { EditProfileModal } from "@/components/theme/EditProfileModal";
import { IncomingRequestsModal } from "@/components/theme/IncomingRequestsModal";
import { CandidateDetailModal } from "@/components/theme/CandidateDetailModal";
import {
  api,
  ApiError,
  getAvatarUrl,
  getGithubUsername,
  type DiscoverResult,
  type Match,
  type Profile,
  type SwipeDirection,
} from "@/lib/api";
import { clearSession, getSession, updateStoredUser } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const POPULAR_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Java",
  "Spring Boot",
  "Python",
  "Rust",
  "PostgreSQL",
  "Tailwind",
  "Docker",
  "AI / ML",
];

export default function DashboardPage() {
  const router = useRouter();
  const [token] = useState(() => getSession()?.token ?? "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [discover, setDiscover] = useState<DiscoverResult[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState("");
  const [activeSwipe, setActiveSwipe] = useState<number | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [radarActionId, setRadarActionId] = useState<number | null>(null);
  const [selectedCandidateDossier, setSelectedCandidateDossier] = useState<DiscoverResult | null>(null);

  // Skill Filtering
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [customSkillSearch, setCustomSkillSearch] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([
      api.getProfile(token),
      api.discover(token),
      api.getMatches(token),
      api.getIncomingRequests(token),
    ])
      .then(([currentProfile, candidates, currentMatches, requests]) => {
        setProfile(currentProfile);
        updateStoredUser(currentProfile);
        setDiscover(candidates);
        setMatches(currentMatches);
        setIncomingRequests(requests);
      })
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Unable to load the dashboard.",
        );
      })
      .finally(() => setLoading(false));
  }, [router, token]);

  // Combined list of filter chips
  const allFilterSkills = useMemo(() => {
    const set = new Set<string>(POPULAR_SKILLS);
    if (profile?.skills) {
      profile.skills.forEach((s) => set.add(s));
    }
    return Array.from(set);
  }, [profile]);

  function logout() {
    clearSession();
    router.push("/");
  }

  async function handleFilterBySkill(skill: string | null) {
    if (!token) return;
    setSelectedSkill(skill);
    setFilterLoading(true);
    setError("");

    try {
      const candidates = await api.discover(token, skill ?? undefined);
      setDiscover(candidates);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Failed to filter candidates.",
      );
    } finally {
      setFilterLoading(false);
    }
  }

  function handleCustomSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = customSkillSearch.trim();
    if (!query) {
      handleFilterBySkill(null);
    } else {
      handleFilterBySkill(query);
    }
  }

  // Optimistic swiping
  async function handleSwipe(targetUserId: number, direction: SwipeDirection) {
    if (!token) return;

    const candidateToSwipe = discover.find((c) => c.profile.id === targetUserId);
    if (!candidateToSwipe) return;

    // Optimistically remove from discover feed and close dossier if open
    setDiscover((current) =>
      current.filter((candidate) => candidate.profile.id !== targetUserId),
    );
    if (selectedCandidateDossier?.profile.id === targetUserId) {
      setSelectedCandidateDossier(null);
    }

    setActiveSwipe(targetUserId);
    setError("");
    setSuccessBanner("");

    try {
      const result = await api.swipe(token, targetUserId, direction);
      if (result.matched) {
        setMatches((current) => [result, ...current]);
        setSuccessBanner(
          `MUTUAL MATCH WITH ${candidateToSwipe.profile.name.toUpperCase()}! OPEN MATCHES TO TRANSMIT.`,
        );
      }
    } catch (requestError) {
      // Revert optimistic removal on error
      setDiscover((current) => [candidateToSwipe, ...current]);
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to record that swipe.",
      );
    } finally {
      setActiveSwipe(null);
    }
  }

  // Handle incoming request actions
  async function handleAcceptIncoming(candidate: Profile) {
    if (!token) return;
    setRadarActionId(candidate.id);
    setError("");

    try {
      const result = await api.swipe(token, candidate.id, "LIKE");
      setIncomingRequests((current) => current.filter((r) => r.id !== candidate.id));
      if (result.matched) {
        setMatches((current) => [result, ...current]);
        setSuccessBanner(
          `MATCH CONFIRMED WITH ${candidate.name.toUpperCase()}! TRANSMIT IN CHAT.`,
        );
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to accept match request.",
      );
    } finally {
      setRadarActionId(null);
    }
  }

  async function handleDeclineIncoming(candidateId: number) {
    if (!token) return;
    setRadarActionId(candidateId);
    setError("");

    try {
      await api.swipe(token, candidateId, "PASS");
      setIncomingRequests((current) => current.filter((r) => r.id !== candidateId));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to decline request.",
      );
    } finally {
      setRadarActionId(null);
    }
  }

  function handleProfileUpdated(updatedProfile: Profile) {
    setProfile(updatedProfile);
    updateStoredUser(updatedProfile);
    setSuccessBanner("PROFILE DOSSIER UPDATED AND SYNCED.");
  }

  return (
    <main className="relative min-h-screen">
      <Navbar variant="dashboard" onLogout={logout} />

      <TechnicalFrame className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {loading ? (
          <p className="font-mono text-sm text-accent animate-pulse">LOADING_NETWORK...</p>
        ) : (
          <div className="space-y-10">
            {/* Authenticated Developer Header */}
            <section className="grid gap-6 border-b border-border pb-10 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-mono text-[10px] tracking-widest text-text-secondary">
                    AUTHENTICATED DEVELOPER
                  </p>
                  {profile?.location && (
                    <span className="border border-border bg-olive-light/20 px-2 py-0.5 font-mono text-[9px] text-text-secondary">
                      📍 {profile.location}
                    </span>
                  )}
                  {profile?.githubUrl && (
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[9px] text-accent hover:bg-accent hover:text-olive transition-colors"
                    >
                      GITHUB ↗
                    </a>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <h1 className="font-display text-5xl text-accent md:text-7xl">
                    {profile?.name ?? "UNKNOWN_USER"}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="border border-accent px-3 py-1.5 font-heading text-xs font-bold uppercase tracking-widest text-accent hover:bg-accent hover:text-olive transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-0.5"
                  >
                    [EDIT_PROFILE]
                  </button>
                </div>

                <p className="mt-3 max-w-2xl font-body text-sm text-text-secondary">
                  {profile?.bio || profile?.lookingFor || "Your profile is online and broadcasting to the network."}
                </p>

                {profile?.lookingFor && (
                  <p className="mt-2 font-mono text-xs text-accent">
                    &gt;&gt; SEEKING: {profile.lookingFor}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {profile?.skills.length ? (
                    profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="border border-accent/40 px-3 py-1 font-mono text-[10px] text-accent"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-[10px] text-text-secondary">
                      NO_SKILLS_RECORDED — CLICK [EDIT_PROFILE] TO ADD STACK
                    </span>
                  )}
                </div>
              </div>

              {/* Stats & Radar Widget */}
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-end">
                <button
                  type="button"
                  onClick={() => setIsRadarOpen(true)}
                  className="flex items-center justify-between gap-3 border-2 border-accent bg-olive-light/30 p-4 text-left hover:bg-accent/15 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                    </span>
                    <div>
                      <p className="font-mono text-[9px] text-text-secondary">SIGNAL RADAR</p>
                      <p className="font-heading text-xs font-bold text-accent">INCOMING REQUESTS</p>
                    </div>
                  </div>
                  <span className="border border-accent bg-accent px-2 py-0.5 font-display text-xl text-olive">
                    {incomingRequests.length}
                  </span>
                </button>

                <div className="border border-border bg-olive-light/20 p-4 text-right">
                  <p className="font-mono text-[9px] text-text-secondary">CONFIRMED_MATCHES</p>
                  <p className="font-display text-4xl text-accent">{matches.length}</p>
                </div>
              </div>
            </section>

            {/* Banners */}
            {successBanner && (
              <div className="border border-accent bg-accent/20 p-4 font-mono text-xs text-accent flex items-center justify-between">
                <span>✔ {successBanner}</span>
                <button
                  onClick={() => setSuccessBanner("")}
                  className="font-bold hover:underline"
                >
                  [DISMISS]
                </button>
              </div>
            )}

            {error && (
              <div className="border border-accent/40 bg-accent/10 p-4 font-mono text-xs text-accent" role="alert">
                ! {error}
              </div>
            )}

            {/* Discovery Queue with Enhanced Skill Filter Bar */}
            <section className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-text-secondary">
                    DISCOVERY QUEUE
                  </p>
                  <h2 className="font-display text-4xl text-accent">FIND_YOUR_BUILD_PARTNER</h2>
                </div>
                <div className="flex items-center gap-3">
                  {selectedSkill && (
                    <span className="border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] text-accent">
                      FILTERED_BY: {selectedSkill}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-text-secondary">
                    {discover.length} SIGNALS AVAILABLE
                  </span>
                </div>
              </div>

              {/* Intuitive Stack Filter Bar with [ALL_PROFILES] and [+ ADD_FILTER] */}
              <div className="border-2 border-border bg-olive-light/10 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* ALL PROFILES DEFAULT */}
                    <button
                      type="button"
                      onClick={() => {
                        handleFilterBySkill(null);
                        setIsFilterExpanded(false);
                      }}
                      className={`border px-4 py-1.5 font-heading text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                        selectedSkill === null
                          ? "border-accent bg-accent text-olive font-bold"
                          : "border-border text-text-primary hover:border-accent hover:text-accent bg-olive-light/20"
                      }`}
                    >
                      ALL_PROFILES
                    </button>

                    {/* Active filter badge if selected */}
                    {selectedSkill && (
                      <span className="inline-flex items-center gap-2 border border-accent bg-accent/20 px-3 py-1 font-mono text-xs text-accent">
                        <span>FILTER: {selectedSkill}</span>
                        <button
                          type="button"
                          onClick={() => handleFilterBySkill(null)}
                          className="hover:text-white font-bold ml-1"
                          aria-label="Remove filter"
                        >
                          ×
                        </button>
                      </span>
                    )}

                    {/* ADD FILTER EXPAND/COLLAPSE TOGGLE */}
                    <button
                      type="button"
                      onClick={() => setIsFilterExpanded((prev) => !prev)}
                      className={`border px-3.5 py-1.5 font-heading text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                        isFilterExpanded
                          ? "border-accent bg-accent/25 text-accent font-bold"
                          : "border-accent text-accent hover:bg-accent hover:text-olive"
                      }`}
                    >
                      {isFilterExpanded ? "[-] HIDE_FILTERS" : "[+] ADD_FILTER"}
                    </button>
                  </div>

                  {selectedSkill && (
                    <button
                      type="button"
                      onClick={() => handleFilterBySkill(null)}
                      className="font-mono text-[10px] text-accent underline hover:opacity-80"
                    >
                      [RESET_TO_ALL]
                    </button>
                  )}
                </div>

                {/* Filter Selector Panel (revealed when [+ ADD_FILTER] is clicked) */}
                {isFilterExpanded && (
                  <div className="space-y-3 pt-3 border-t border-border/80">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 bg-accent" />
                      <span className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
                        SELECT TECH STACK OR ENTER CUSTOM TAG
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {allFilterSkills.map((skill) => {
                        const isSelected =
                          selectedSkill?.toLowerCase() === skill.toLowerCase();
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => handleFilterBySkill(isSelected ? null : skill)}
                            className={`border px-3 py-1 font-mono text-[10px] transition-colors ${
                              isSelected
                                ? "border-accent bg-accent text-olive font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                                : "border-border text-text-primary hover:border-accent hover:text-accent bg-olive-light/20"
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>

                    <form onSubmit={handleCustomSearchSubmit} className="flex gap-2 pt-2 max-w-md">
                      <input
                        type="text"
                        value={customSkillSearch}
                        onChange={(e) => setCustomSkillSearch(e.target.value)}
                        placeholder="Search custom stack (e.g. GraphQL, Solidity, PyTorch)..."
                        className="flex-1 border-b border-accent/40 bg-transparent px-2 py-1 font-mono text-xs text-text-primary placeholder:text-text-secondary/40 outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="border border-accent px-3 py-1 font-heading text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent hover:text-olive transition-colors"
                      >
                        APPLY
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Cards Deck */}
              {filterLoading ? (
                <div className="border border-dashed border-border p-12 text-center font-mono text-xs text-accent animate-pulse">
                  FILTERING_CANDIDATE_SIGNALS...
                </div>
              ) : discover.length === 0 ? (
                <div className="border border-dashed border-border p-12 text-center space-y-3">
                  <p className="font-mono text-xs text-text-secondary">
                    {selectedSkill
                      ? `NO_DEVELOPERS_FOUND_MATCHING "${selectedSkill.toUpperCase()}".`
                      : "NO_MORE_PROFILES_IN_QUEUE. YOU HAVE SEEN ALL AVAILABLE BUILDERS."}
                  </p>
                  {selectedSkill && (
                    <RetroButton
                      variant="outline"
                      onClick={() => handleFilterBySkill(null)}
                      className="text-xs"
                    >
                      RESET_STACK_FILTER
                    </RetroButton>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {discover.map((candidateDossier) => {
                    const { profile: candidate, sharedSkillCount, sharedSkills } = candidateDossier;
                    const avatarUrl = getAvatarUrl(candidate.githubUrl);
                    const githubHandle = getGithubUsername(candidate.githubUrl);
                    const isSwiping = activeSwipe === candidate.id;

                    return (
                      <article
                        key={candidate.id}
                        className="group relative flex min-h-[400px] flex-col border-2 border-accent bg-olive-light/15 p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all hover:border-accent hover:-translate-y-1 hover:shadow-[10px_10px_0_0_rgba(0,0,0,1)]"
                      >
                        {/* Candidate Top Bar */}
                        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidateDossier(candidateDossier)}
                            className="flex items-center gap-3 text-left focus:outline-none"
                            title="Click to view full dossier"
                          >
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={avatarUrl}
                                alt={candidate.name}
                                className="h-12 w-12 border-2 border-accent object-cover shadow-[2px_2px_0_0_rgba(0,0,0,1)] group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center border-2 border-accent bg-olive font-display text-xl text-accent shadow-[2px_2px_0_0_rgba(0,0,0,1)] group-hover:scale-105 transition-transform">
                                {candidate.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-mono text-[9px] text-text-secondary">
                                SIGNAL_ID::{candidate.id}
                              </p>
                              <h3 className="font-display text-3xl text-accent leading-none mt-0.5 group-hover:underline">
                                {candidate.name}
                              </h3>
                              {candidate.location && (
                                <p className="font-mono text-[9px] text-text-secondary mt-1">
                                  📍 {candidate.location}
                                </p>
                              )}
                            </div>
                          </button>

                          <div className="flex flex-col items-end gap-1.5">
                            {githubHandle && (
                              <a
                                href={`https://github.com/${githubHandle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[9px] text-accent hover:bg-accent hover:text-olive transition-colors"
                                title={`View @${githubHandle} on GitHub`}
                              >
                                GITHUB ↗
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedCandidateDossier(candidateDossier)}
                              className="font-mono text-[9px] text-text-secondary hover:text-accent underline"
                            >
                              [DETAILS ↗]
                            </button>
                          </div>
                        </div>

                        {/* Bio / Intent - Click to Inspect */}
                        <div
                          onClick={() => setSelectedCandidateDossier(candidateDossier)}
                          className="mt-4 flex-1 space-y-3 cursor-pointer"
                        >
                          <p className="font-body text-sm leading-relaxed text-text-secondary line-clamp-3">
                            {candidate.bio || "Developer ready for hackathons and projects."}
                          </p>

                          {candidate.lookingFor && (
                            <div className="border-l-2 border-accent bg-olive-light/25 p-2 font-mono text-[10px] text-text-primary">
                              <span className="text-accent font-bold">LOOKING FOR:</span>{" "}
                              {candidate.lookingFor}
                            </div>
                          )}
                        </div>

                        {/* Skills Section */}
                        <div className="mt-4 space-y-2 border-t border-border pt-3">
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="text-accent">
                              SHARED_SKILLS::{sharedSkillCount}
                            </span>
                            <span className="text-text-secondary">
                              TOTAL_SKILLS::{candidate.skills.length}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 5).map((skill) => {
                              const isShared = sharedSkills.includes(skill);
                              return (
                                <span
                                  key={skill}
                                  className={`px-2 py-0.5 font-mono text-[9px] border ${
                                    isShared
                                      ? "border-accent bg-accent/20 text-accent font-bold"
                                      : "border-border text-text-secondary"
                                  }`}
                                >
                                  {skill}
                                </span>
                              );
                            })}
                            {candidate.skills.length > 5 && (
                              <button
                                type="button"
                                onClick={() => setSelectedCandidateDossier(candidateDossier)}
                                className="font-mono text-[9px] text-accent hover:underline self-center"
                              >
                                +{candidate.skills.length - 5} more
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Swipe Actions */}
                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <RetroButton
                            variant="outline"
                            onClick={() => void handleSwipe(candidate.id, "PASS")}
                            disabled={isSwiping}
                            className="px-3 text-xs"
                          >
                            PASS
                          </RetroButton>
                          <RetroButton
                            onClick={() => void handleSwipe(candidate.id, "LIKE")}
                            disabled={isSwiping}
                            className="px-3 text-xs"
                          >
                            LIKE
                          </RetroButton>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </TechnicalFrame>

      {/* Candidate Dossier Detail Modal */}
      <CandidateDetailModal
        isOpen={selectedCandidateDossier !== null}
        onClose={() => setSelectedCandidateDossier(null)}
        candidate={selectedCandidateDossier}
        onSwipe={handleSwipe}
        isSwiping={activeSwipe !== null}
      />

      {/* Edit Profile Modal (Pre-filled + PATCH) */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        token={token}
        currentProfile={profile}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Incoming Requests / Radar Modal */}
      <IncomingRequestsModal
        isOpen={isRadarOpen}
        onClose={() => setIsRadarOpen(false)}
        requests={incomingRequests}
        onAccept={handleAcceptIncoming}
        onDecline={handleDeclineIncoming}
        actionInProgressId={radarActionId}
      />
    </main>
  );
}
