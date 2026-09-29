import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_BACKUP_KEY;
const bucket = process.env.STORAGE_BUCKET || "feedback";
const outputDir = path.resolve(process.env.STORAGE_BACKUP_DIR || "storage-backup-work");
const objectsDir = path.join(outputDir, "objects");

if (!url || !key) throw new Error("Missing Supabase backup credentials");

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const manifest = {
  created_at_utc: new Date().toISOString(),
  bucket,
  objects: [],
};

function localPathFor(objectPath) {
  const segments = objectPath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Unsafe storage path: ${objectPath}`);
  }

  const destination = path.resolve(objectsDir, ...segments);
  if (!destination.startsWith(`${objectsDir}${path.sep}`)) {
    throw new Error(`Storage path escaped backup directory: ${objectPath}`);
  }

  return destination;
}

async function downloadObject(objectPath, metadata = {}) {
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error || !data) {
    throw new Error(`Failed to download ${objectPath}: ${error?.message ?? "empty response"}`);
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  const destination = localPathFor(objectPath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);

  manifest.objects.push({
    path: objectPath,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    content_type: metadata.mimetype ?? metadata.contentType ?? null,
  });
}

async function walk(prefix = "") {
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Failed to list ${bucket}/${prefix || "<root>"}: ${error.message}`);
    }

    const entries = data ?? [];
    for (const entry of entries) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = !entry.id && !entry.metadata;
      if (isFolder) await walk(objectPath);
      else await downloadObject(objectPath, entry.metadata ?? {});
    }

    if (entries.length < limit) break;
    offset += limit;
  }
}

await mkdir(objectsDir, { recursive: true });
await walk();

manifest.objects.sort((a, b) => a.path.localeCompare(b.path));
manifest.object_count = manifest.objects.length;
manifest.total_bytes = manifest.objects.reduce((sum, item) => sum + item.size, 0);

await writeFile(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(
  `Backed up ${manifest.object_count} object(s) from ${bucket} (${manifest.total_bytes} bytes).`,
);
