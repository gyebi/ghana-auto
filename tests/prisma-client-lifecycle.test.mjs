import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the Prisma factory retains one bounded pool per application process", async () => {
  const source = await readFile(
    new URL("../src/lib/db/prisma.js", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /globalForPrisma\.ghanaAutoPrisma\s*=\s*createPrismaClient\(\)/
  );
  assert.doesNotMatch(source, /NODE_ENV\s*!==\s*["']production["']/);
});
