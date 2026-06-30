"use client";

/**
 * NewFeatureRequestForm — client component for the new feature request
 * form. `workspaceId` and the project list are loaded server-side and
 * passed in as props, so the user never has to know or paste any IDs.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RocketIcon } from "@phosphor-icons/react";

type Project = { id: string; name: string };

type NewFeatureRequestFormProps = {
  workspaceId: string;
  projects: Project[];
};

export function NewFeatureRequestForm({
  workspaceId,
  projects,
}: NewFeatureRequestFormProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const [title, setTitle] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation(
    trpc.featureRequest.create.mutationOptions({
      onSuccess: (data) => {
        router.push(`${DASHBOARD_ROUTES.requests}/${data.featureRequestId}`);
      },
      onError: (err) => {
        setError(err.message ?? "Failed to create feature request.");
      },
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !rawInput.trim() || !projectId) {
      setError("All fields are required.");
      return;
    }

    createMutation.mutate({
      workspaceId,
      projectId,
      title: title.trim(),
      rawInput: rawInput.trim(),
      source: "form",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Title */}
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Stripe billing integration"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          A short, memorable name for this feature request.
        </p>
      </div>

      {/* Project selector */}
      <div className="grid gap-2">
        <Label htmlFor="projectId">Project</Label>
        {projects.length > 0 ? (
          <select
            id="projectId"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-muted-foreground">
            No projects found. Sync a repository first to create a project.
          </p>
        )}
      </div>

      {/* Raw input */}
      <div className="grid gap-2">
        <Label htmlFor="rawInput">Feature Idea</Label>
        <Textarea
          id="rawInput"
          placeholder="Describe the feature in your own words. Don't worry about structure — the AI will help clarify."
          rows={8}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          required
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Write as much or as little as you know. The clarification chat will
          gather the rest.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={createMutation.isPending || projects.length === 0}
          className="gap-2"
        >
          <RocketIcon className="size-4" />
          {createMutation.isPending ? "Creating…" : "Submit & Start Pipeline"}
        </Button>
      </div>
    </form>
  );
}
