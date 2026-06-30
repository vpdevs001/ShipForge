"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserMenuWithSession } from "@/features/auth/components/user-menu";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ChatsIcon, FileTextIcon, CheckSquareIcon, ShieldCheckIcon, RocketIcon, GitBranchIcon } from "@phosphor-icons/react";

const PIPELINE_STAGES = [
  { id: 1, name: "Intake", icon: FileTextIcon, desc: "PM submits raw request" },
  { id: 2, name: "Clarification", icon: ChatsIcon, desc: "AI asks follow-up details" },
  { id: 3, name: "PRD Gen", icon: FileTextIcon, desc: "Inngest builds structured doc" },
  { id: 4, name: "Tasking", icon: CheckSquareIcon, desc: "Explodes PRD into Kanban list" },
  { id: 5, name: "Review", icon: ShieldCheckIcon, desc: "Webhook triggers AI PR review" },
  { id: 6, name: "Ship", icon: RocketIcon, desc: "Merge & deploy verified features" },
];

/** Stagger container for the hero headline/subhead/badge entrance. */
const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/** Individual hero element fade/slide-up entrance. */
const heroItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function Home() {
  const [activeStage, setActiveStage] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Pause the looping handoff animation entirely for users who've asked
    // the OS to reduce motion — the pipeline strip still shows the stages,
    // it just doesn't auto-advance.
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col">
      {/* 64px Grid Overlay background */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-40" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo2.svg"
            alt="ShipForge Logo"
            width={36}
            height={36}
            className="object-contain"
          />
          <span className="font-heading font-semibold text-lg tracking-wider">
            ShipForge
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <UserMenuWithSession variant="compact" />
          <Button
            variant="default"
            className="shadow-[0_0_15px_rgba(var(--primary),0.2)]"
            render={
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            }
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 max-w-6xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center gap-12">
        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center gap-4"
        >
          <motion.span
            variants={heroItem}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-mono tracking-widest text-primary uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Active AI-Run Pipeline
          </motion.span>
          <motion.h1
            variants={heroItem}
            className="font-heading text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl leading-[1.1] text-foreground"
          >
            From feature request <br />
            <span className="text-primary bg-clip-text">to shipped PR.</span>
          </motion.h1>
          <motion.p
            variants={heroItem}
            className="max-w-2xl text-muted-foreground text-base sm:text-lg font-sans leading-relaxed mt-2"
          >
            An engineering control plane that automates product handoffs. 
            Write ideas, chat with clarification agents, generate approved PRDs, 
            generate task lists, and run automated AI code reviews on every pull request.
          </motion.p>
        </motion.div>

        {/* Live Pipeline Strip */}
        <div className="w-full bg-card/40 border border-border p-8 rounded-xl backdrop-blur-sm max-w-5xl">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6 text-left">
            Live AI Pipeline Workflow
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative">
            {PIPELINE_STAGES.map((stage, idx) => {
              const StageIcon = stage.icon;
              const isActive = activeStage === idx;
              return (
                <div
                  key={stage.id}
                  className="group relative flex flex-col items-center text-center p-4 border border-border rounded-lg overflow-hidden"
                >
                  {/* Shared-element glow — Motion animates this single box
                      from the previous active stage's position to this one
                      whenever `isActive` flips, instead of a separate
                      element fading in/out at each stop. */}
                  {isActive && (
                    <motion.div
                      layoutId="pipeline-glow"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 300, damping: 30 }
                      }
                      className="absolute inset-0 rounded-lg border border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                    />
                  )}

                  <div className="relative z-10 flex flex-col items-center">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg border mb-3 transition-colors duration-300 ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted/30 text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <StageIcon className="size-5" />
                    </div>
                    <span
                      className={`font-heading text-sm font-semibold transition-colors duration-300 ${
                        isActive ? "text-primary" : "text-card-foreground"
                      }`}
                    >
                      {stage.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {stage.desc}
                    </span>
                  </div>

                  {/* Connecting lines */}
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className="hidden md:block absolute top-1/3 -right-3 w-6 h-[1px] bg-border z-0 pointer-events-none group-hover:bg-muted-foreground/30 transition-colors" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Output Samples Side by Side */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl text-left">
          {/* PRD Sample */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="border border-border bg-card/30 p-6 rounded-lg backdrop-blur-sm flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileTextIcon className="size-4" />
                Structured PRD Output
              </span>
              <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                Stage 3
              </span>
            </div>
            <div className="font-heading font-semibold text-lg">
              PRD: Stripe Billing Integration
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold block text-foreground mb-1">Problem Statement</span>
              We need to transition from manual billing invoices to a self-serve automated payment flow to decrease onboarding friction for the Pro subscription tier.
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold block text-foreground mb-1">User Stories</span>
              <span className="block border-l border-primary/50 pl-2 py-0.5 mb-1 italic">
                &ldquo;As a Pro user, I want to pay with credit card, so I can instantly unlock high limits.&rdquo;
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold block text-foreground mb-1">Acceptance Criteria</span>
              <ul className="list-disc list-inside space-y-1">
                <li>Stripe webhook updates subscription status in real-time.</li>
                <li>Upgrade widget falls back gracefully if Stripe is down.</li>
              </ul>
            </div>
          </motion.div>

          {/* AI Review Sample */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="border border-border bg-card/30 p-6 rounded-lg backdrop-blur-sm flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <GitBranchIcon className="size-4" />
                AI Code Review Output
              </span>
              <span className="font-mono text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/25">
                Needs Changes
              </span>
            </div>
            <div className="font-heading font-semibold text-lg flex items-center justify-between">
              <span>PR #412: stripe-billing-hook</span>
              <span className="font-mono text-xs text-muted-foreground">#stripe-branch</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="border border-red-500/20 bg-red-500/5 p-3 rounded text-xs">
                <span className="font-semibold text-red-400 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
                  BLOCKING: CSRF vulnerability in Stripe webhook handler
                </span>
                <p className="text-muted-foreground mt-1">
                  Path: <code className="font-mono text-[11px] bg-muted/50 px-1 rounded">/api/stripe/webhook/route.ts#L42</code>
                </p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  <strong>Suggestion:</strong> Verify signature using <code className="font-mono text-[10px]">stripe.webhooks.constructEvent</code> instead of parsing request body directly.
                </p>
              </div>

              <div className="border border-yellow-500/20 bg-yellow-500/5 p-3 rounded text-xs">
                <span className="font-semibold text-yellow-400 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-yellow-400" />
                  NON-BLOCKING: Missing exponential backoff on DB retry
                </span>
                <p className="text-muted-foreground mt-1">
                  Path: <code className="font-mono text-[11px] bg-muted/50 px-1 rounded">/lib/db/billing.ts#L88</code>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-background py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; {new Date().getFullYear()} ShipForge. Built for engineering teams.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Docs</a>
            <a href="#" className="hover:text-foreground">Security</a>
            <a href="#" className="hover:text-foreground">Github</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
