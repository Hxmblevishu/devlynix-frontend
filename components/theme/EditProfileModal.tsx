"use client";

import { useEffect, useState } from "react";
import { RetroModal } from "./RetroModal";
import { RetroInput } from "./RetroInput";
import { RetroButton } from "./RetroButton";
import { api, ApiError, type Profile, type UpdateProfilePayload } from "@/lib/api";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  currentProfile: Profile | null;
  onProfileUpdated: (updated: Profile) => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  token,
  currentProfile,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentProfile?.name ?? "");
  const [githubUrl, setGithubUrl] = useState(currentProfile?.githubUrl ?? "");
  const [bio, setBio] = useState(currentProfile?.bio ?? "");
  const [lookingFor, setLookingFor] = useState(currentProfile?.lookingFor ?? "");
  const [location, setLocation] = useState(currentProfile?.location ?? "");
  const [projectPitch, setProjectPitch] = useState(currentProfile?.projectPitch ?? "");
  const [skills, setSkills] = useState<string[]>(currentProfile?.skills ?? []);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auto-prefill whenever modal opens or currentProfile changes
  useEffect(() => {
    if (isOpen && currentProfile) {
      queueMicrotask(() => {
        setName(currentProfile.name ?? "");
        setGithubUrl(currentProfile.githubUrl ?? "");
        setBio(currentProfile.bio ?? "");
        setLookingFor(currentProfile.lookingFor ?? "");
        setLocation(currentProfile.location ?? "");
        setProjectPitch(currentProfile.projectPitch ?? "");
        setSkills(currentProfile.skills ? [...currentProfile.skills] : []);
        setNewSkillInput("");
        setError("");
      });
    }
  }, [isOpen, currentProfile]);

  function resetForm() {
    setName(currentProfile?.name ?? "");
    setGithubUrl(currentProfile?.githubUrl ?? "");
    setBio(currentProfile?.bio ?? "");
    setLookingFor(currentProfile?.lookingFor ?? "");
    setLocation(currentProfile?.location ?? "");
    setProjectPitch(currentProfile?.projectPitch ?? "");
    setSkills(currentProfile?.skills ? [...currentProfile.skills] : []);
    setNewSkillInput("");
    setError("");
  }

  function handleAddSkill() {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (!skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills([...skills, trimmed]);
    }
    setNewSkillInput("");
  }

  function handleRemoveSkill(skillToRemove: string) {
    setSkills(skills.filter((s) => s !== skillToRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError("");

    const payload: UpdateProfilePayload = {
      name: name.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
      bio: bio.trim() || undefined,
      lookingFor: lookingFor.trim() || undefined,
      location: location.trim() || undefined,
      projectPitch: projectPitch.trim() || undefined,
      skills,
    };

    try {
      const updated = await api.updateProfile(token, payload);
      onProfileUpdated(updated);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to update profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <RetroModal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="SYSTEM // EDIT_DEVELOPER_PROFILE"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="border border-accent/40 bg-accent/10 p-3 font-mono text-xs text-accent">
            ! {error}
          </div>
        )}

        <RetroInput
          label="Developer Handle / Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex Rivers"
          required
          maxLength={120}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <RetroInput
            label="Location / Timezone"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Remote, UTC+5:30"
            maxLength={120}
          />
          <RetroInput
            label="GitHub Profile URL"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/your-username"
            maxLength={260}
          />
        </div>

        <RetroInput
          label="Collaboration Intent (Looking For)"
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          placeholder="e.g. Seeking Fullstack lead for AI Hackathon"
          maxLength={160}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 bg-accent" />
            <label className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              Hackathon Project Pitch / Concept (Max 600)
            </label>
          </div>
          <textarea
            value={projectPitch}
            onChange={(e) => setProjectPitch(e.target.value)}
            placeholder="Pitch your hackathon project concept, vision, or what you want to build together..."
            rows={2}
            maxLength={600}
            className="w-full border-b border-accent/30 bg-transparent px-2 py-2 font-mono text-xs text-text-primary placeholder:text-text-secondary/40 outline-none transition-all focus:border-accent focus:bg-olive-light/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 bg-accent" />
            <label className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">
              Developer Bio / Story (Max 600)
            </label>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your architectural background, favorite stacks, or hackathon aspirations..."
            rows={3}
            maxLength={600}
            className="w-full border-b border-accent/30 bg-transparent px-2 py-2 font-body text-sm text-text-primary placeholder:text-text-secondary/40 outline-none transition-all focus:border-accent focus:bg-olive-light/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 bg-accent" />
              <label className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">
                Technical Stack & Skills
              </label>
            </div>
            <span className="font-mono text-[9px] text-text-secondary">
              {skills.length} REGISTERED
            </span>
          </div>

          <div className="flex flex-wrap gap-2 py-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 border border-accent/50 bg-olive-light/30 px-2.5 py-1 font-mono text-[10px] text-accent"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-text-secondary hover:text-accent font-bold"
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="e.g. Next.js, Rust, Docker..."
              className="flex-1 border-b border-accent/30 bg-transparent px-2 py-1 font-body text-xs text-text-primary placeholder:text-text-secondary/40 outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="border border-accent px-3 py-1 font-heading text-[10px] font-bold tracking-widest text-accent hover:bg-accent hover:text-olive transition-colors"
            >
              + ADD
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <RetroButton
            variant="outline"
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={saving}
          >
            CANCEL
          </RetroButton>
          <RetroButton type="submit" disabled={saving}>
            {saving ? "SAVING_DATA..." : "COMMIT_CHANGES"}
          </RetroButton>
        </div>
      </form>
    </RetroModal>
  );
}
