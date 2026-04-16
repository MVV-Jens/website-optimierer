-- CreateTable
CREATE TABLE "Creation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ANALYZING',
    "optimizationFocus" TEXT,
    "depth" TEXT,
    "analysisJson" TEXT,
    "analysisMarkdown" TEXT,
    "styleLockJson" TEXT,
    "redesignHtml" TEXT,
    "redesignCss" TEXT,
    "redesignZipPath" TEXT,
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asset_creationId_fkey" FOREIGN KEY ("creationId") REFERENCES "Creation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
