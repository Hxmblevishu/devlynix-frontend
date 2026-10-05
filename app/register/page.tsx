"use client";

import Link from "next/link";
import { Navbar } from "@/components/theme/Navbar";
import { TechnicalFrame } from "@/components/theme/TechnicalFrame";
import { RetroButton } from "@/components/theme/RetroButton";
import { RetroInput } from "@/components/theme/RetroInput";
import { FloatingCassette } from "@/components/theme/FloatingCassette";
import { api, ApiError } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [projectPitch, setProjectPitch] = useState("");
  const [skills, setSkills] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.register({
        name,
        email,
        password,
        githubUrl: githubUrl || undefined,
        projectPitch: projectPitch.trim() || undefined,
        skills: skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      });
      saveSession(response);
      router.push("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to create your account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen">
      <Navbar variant="auth" />

      <TechnicalFrame className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center px-4 py-12 md:px-8">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
          {/* Form Side */}
          <motion.div
            className="relative order-2 overflow-hidden rounded-[4px] border-2 border-accent bg-olive-light/20 p-8 shadow-[12px_12px_0_0_rgba(0,0,0,1)] md:p-12 lg:order-1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="absolute top-4 left-4 h-4 w-4 border-t border-l border-accent/30" />
            <div className="absolute top-4 right-4 h-4 w-4 border-t border-r border-accent/30" />

            <div className="mb-8 border-b-2 border-accent pb-5">
              <p className="font-mono text-[10px] tracking-widest text-text-secondary/60 uppercase">
                New Terminal Entry
              </p>
              <h1 className="mt-2 font-display text-5xl tracking-tight text-accent uppercase leading-none">
                INITIALIZE_ACCOUNT
              </h1>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <RetroInput
                  label="Handle"
                  type="text"
                  placeholder="dev_user"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                <RetroInput
                  label="Email"
                  type="email"
                  placeholder="name@domain.tech"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <RetroInput
                label="Pass_Code"
                type="password"
                placeholder="********"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <RetroInput
                label="Verify_Pass"
                type="password"
                placeholder="********"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <RetroInput
                label="GitHub_URL / Optional"
                type="url"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={(event) => setGithubUrl(event.target.value)}
              />
              <RetroInput
                label="Project_Pitch / Hackathon Idea"
                type="text"
                placeholder="Autonomous agent swarm for web dev"
                value={projectPitch}
                onChange={(event) => setProjectPitch(event.target.value)}
              />
              <RetroInput
                label="Skills / Comma Separated"
                type="text"
                placeholder="React, Java, PostgreSQL"
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
              />

              {error && (
                <p className="border border-accent/40 bg-accent/10 p-3 font-mono text-[10px] text-accent" role="alert">
                  ! {error}
                </p>
              )}

              <RetroButton
                type="submit"
                variant="primary"
                className="mt-4 w-full py-4 text-base"
                disabled={submitting}
              >
                {submitting ? "GENERATING..." : "GENERATE_IDENTITY"}
              </RetroButton>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-[0.5px] flex-1 bg-accent/20" />
              <span className="font-mono text-[9px] text-text-secondary/50">EXT_SYNC</span>
              <div className="h-[0.5px] flex-1 bg-accent/20" />
            </div>

            <p className="mt-8 text-center font-body text-xs text-text-secondary/70">
              EXISTING_MEMBER?{" "}
              <Link
                href="/login"
                className="font-bold text-accent hover:underline decoration-2 underline-offset-4"
              >
                ACCESS_TERMINAL
              </Link>
            </p>
          </motion.div>

          {/* Info Side */}
          <motion.div
            className="order-1 flex flex-col items-center justify-center lg:order-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative mb-12">
              <div className="absolute -inset-14 border border-accent/5 rounded-full" />
              <FloatingCassette size="lg" />
            </div>

            <div className="space-y-6 text-center lg:text-left">
              <div className="flex items-center gap-4">
                <div className="h-0.5 w-12 bg-accent" />
                <span className="font-heading text-lg tracking-widest text-accent uppercase">Protocol Specs</span>
              </div>
              <ul className="space-y-4 font-mono text-[11px] text-text-secondary/80 list-none p-0">
                <li className="flex gap-2">
                  <span className="text-accent">01.</span>
                  <span>SWIPE_DEVELOPER_PROFILES</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">02.</span>
                  <span>MATCH_ON_STACK_AND_VIBE</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">03.</span>
                  <span>SHIP_PROJECTS_TOGETHER</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </TechnicalFrame>
    </main>
  );
}
