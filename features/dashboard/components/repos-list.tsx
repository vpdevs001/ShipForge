"use client";

import { formatDistanceToNow } from "date-fns";
import { LockIcon, StarIcon, UnlockIcon } from "lucide-react";

import { MOCK_REPOS } from "@/features/dashboard/lib/mock-data";
import { statusBadge } from "@/features/dashboard/lib/status-styles";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const counts = {
  all: MOCK_REPOS.length,
  public: MOCK_REPOS.filter((r) => r.visibility === "public").length,
  private: MOCK_REPOS.filter((r) => r.visibility === "private").length,
};

export function ReposList() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="public">Public ({counts.public})</TabsTrigger>
            <TabsTrigger value="private">Private ({counts.private})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="Search repositories…" className="max-w-xs" disabled />
      </div>

      <div className="rounded-none border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="text-right">Stars</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_REPOS.map((repo) => (
              <TableRow key={repo.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{repo.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {repo.fullName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={statusBadge(
                      repo.visibility === "public" ? "info" : "warning",
                      "gap-1"
                    )}
                  >
                    {repo.visibility === "private" ? (
                      <LockIcon className="size-3" />
                    ) : (
                      <UnlockIcon className="size-3" />
                    )}
                    {repo.visibility}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {repo.defaultBranch}
                </TableCell>
                <TableCell>{repo.language ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center justify-end gap-1 text-muted-foreground">
                    <StarIcon className="size-3 text-amber-500" />
                    {repo.stars}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDistanceToNow(new Date(repo.updatedAt), {
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
