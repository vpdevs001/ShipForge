import { CodeChunk } from "@/features/reviews/types/review";
import { RepoFile } from "../types";
import { getGithubApp } from "@/features/github/utils/github-app";
import { getPineconeIndex } from "@/features/pinecone/client";
import { db } from "@/lib/db";
import { repoSync } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { inngest } from "@/features/inngest/client";

const MAX_FILE_SIZE_BYTES = 100_000;
const MAX_FILES = 200;
const MAX_CHUNK_LINES = 80;
const UPSERT_BATCH_SIZE = 90;

const CODE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".py",
  ".go",
  ".rb",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cpp",
  ".cs",
  ".php",
  ".sql",
  ".prisma",
  ".css",
  ".md",
  ".yml",
  ".yaml",
];

const SKIPPED_FOLDERS = [
  "node_modules/",
  "dist/",
  "build/",
  ".next/",
  "generated/",
  "vendor/",
];

type TreeEntry = {
  path?: string;
  type?: string;
  sha?: string;
  size?: number;
};

export function buildRepoNamespace(repoFullName: string) {
  return `${repoFullName.replace("/", "--")}--codebase`;
}

function hasCodeExtension(path: string) {
  return CODE_EXTENSIONS.some((extension) => path.endsWith(extension));
}

function isSkippedPath(path: string) {
  return SKIPPED_FOLDERS.some((folder) => path.includes(folder));
}

function isIndexableFile(entry: TreeEntry) {
  if (entry.type !== "blob" || !entry.path || !entry.sha) {
    return false;
  }

  if (entry.size && entry.size > MAX_FILE_SIZE_BYTES) {
    return false;
  }

  if (isSkippedPath(entry.path)) {
    return false;
  }

  return hasCodeExtension(entry.path);
}

function buildChunkId(filePath: string, part: number) {
  return `repo--${filePath}--part-${part}`;
}

export function chunkRepoFiles(files: RepoFile[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
      const part = start / MAX_CHUNK_LINES;
      const text = lines.slice(start, start + MAX_CHUNK_LINES).join("\n");

      chunks.push({
        id: buildChunkId(file.filePath, part),
        filePath: file.filePath,
        text,
      });
    }
  }

  return chunks;
}

export async function getRepoFiles(
  installationId: number,
  repoFullName: string,
  branch: string
): Promise<RepoFile[]> {
  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const { data: tree } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    { owner, repo, tree_sha: branch, recursive: "1" }
  );

  const entries = tree.tree.filter(isIndexableFile).slice(0, MAX_FILES);
  const files: RepoFile[] = [];

  for (const entry of entries) {
    const { data: blob } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
      { owner, repo, file_sha: entry.sha! }
    );

    const content = Buffer.from(blob.content, "base64").toString("utf-8");
    files.push({ filePath: entry.path!, content });
  }

  return files;
}

export async function deleteRepoNamespace(namespace: string) {
  const index = getPineconeIndex();
  await index.deleteNamespace(namespace);
}

export async function saveRepoChunks(namespace: string, chunks: CodeChunk[]) {
  const index = getPineconeIndex();

  for (let start = 0; start < chunks.length; start += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(start, start + UPSERT_BATCH_SIZE);

    const records = batch.map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
      filePath: chunk.filePath,
    }));

    await index.namespace(namespace).upsertRecords({ records });
  }
}

export async function getRepoSyncStatuses(repoFullNames: string[]) {
  const syncs = await db
    .select({ repoFullName: repoSync.repoFullName, status: repoSync.status })
    .from(repoSync)
    .where(inArray(repoSync.repoFullName, repoFullNames));

  const statusByRepo: Record<string, string> = {};

  for (const sync of syncs) {
    statusByRepo[sync.repoFullName] = sync.status;
  }

  return statusByRepo;
}

export async function triggerRepoSync(
  installationId: number,
  repoFullName: string,
  branch: string,
  workspaceId: string
) {
  const [sync] = await db
    .insert(repoSync)
    .values({
      workspaceId,
      installationId,
      repoFullName,
      branch,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: repoSync.repoFullName,
      set: {
        workspaceId,
        installationId,
        branch,
        status: "pending",
        updatedAt: new Date(),
      },
    })
    .returning();

  await inngest.send({
    name: "repo/sync.requested",
    data: { repoSyncId: sync.id },
  });
}
