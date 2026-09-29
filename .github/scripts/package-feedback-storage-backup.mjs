import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";

if (!process.env.BACKUP_ENCRYPTION_PASSWORD) {
  throw new Error("BACKUP_ENCRYPTION_PASSWORD is required");
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`${command} failed`);
}

run("tar", [
  "-C",
  "storage-backup-work",
  "-czf",
  "feedback-storage-backup.tar.gz",
  "objects",
  "manifest.json",
]);

run("openssl", [
  "enc",
  "-aes-256-cbc",
  "-salt",
  "-pbkdf2",
  "-iter",
  "100000",
  "-in",
  "feedback-storage-backup.tar.gz",
  "-out",
  "feedback-storage-backup.tar.gz.enc",
  "-pass",
  "env:BACKUP_ENCRYPTION_PASSWORD",
]);

run("sha256sum", ["feedback-storage-backup.tar.gz.enc"]);
await rm("storage-backup-work", { recursive: true, force: true });
await rm("feedback-storage-backup.tar.gz", { force: true });
