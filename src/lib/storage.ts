import fs from "fs";
import path from "path";

const STORAGE_ROOT =
  process.env.STORAGE_PATH ?? path.join(process.cwd(), "storage");

export function ensureStorageDir(creationId: string): string {
  const dir = path.join(STORAGE_ROOT, creationId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getStoragePath(creationId: string, filename: string): string {
  return path.join(STORAGE_ROOT, creationId, filename);
}

export function writeFile(creationId: string, filename: string, content: string | Buffer): string {
  const dir = ensureStorageDir(creationId);
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

export function readFile(filePath: string): Buffer | null {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getStorageRoot(): string {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  return STORAGE_ROOT;
}
