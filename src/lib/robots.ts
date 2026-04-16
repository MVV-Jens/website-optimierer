const ROBOTS_TIMEOUT_MS = 5000;

interface RobotsCheck {
  allowed: boolean;
  reason?: string;
}

function parseRobotsTxt(content: string, targetPath: string): boolean {
  const lines = content.split("\n").map((l) => l.trim());
  let inRelevantBlock = false;
  const disallowedPaths: string[] = [];
  const allowedPaths: string[] = [];

  for (const line of lines) {
    if (line.startsWith("#") || line === "") continue;

    if (line.toLowerCase().startsWith("user-agent:")) {
      const agent = line.split(":")[1].trim().toLowerCase();
      inRelevantBlock = agent === "*" || agent === "bot" || agent === "crawlbot";
      continue;
    }

    if (!inRelevantBlock) continue;

    if (line.toLowerCase().startsWith("disallow:")) {
      const blocked = line.split(":")[1]?.trim() ?? "";
      if (blocked) disallowedPaths.push(blocked);
    }

    if (line.toLowerCase().startsWith("allow:")) {
      const allowed = line.split(":")[1]?.trim() ?? "";
      if (allowed) allowedPaths.push(allowed);
    }
  }

  // Check allow rules first (more specific wins)
  for (const p of allowedPaths) {
    if (targetPath.startsWith(p)) return true;
  }

  // Check disallow rules
  for (const p of disallowedPaths) {
    if (p === "/" || targetPath.startsWith(p)) return false;
  }

  return true;
}

export async function checkRobots(url: string): Promise<RobotsCheck> {
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;

    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS),
      headers: { "User-Agent": "UX-Analyzer/1.0 (Analysis Tool)" },
    });

    if (!response.ok) {
      // If robots.txt doesn't exist or returns error, allow crawling
      return { allowed: true };
    }

    const content = await response.text();
    const targetPath = parsed.pathname || "/";
    const allowed = parseRobotsTxt(content, targetPath);

    if (!allowed) {
      return {
        allowed: false,
        reason: `robots.txt des Servers schränkt den Zugriff auf ${targetPath} ein.`,
      };
    }

    return { allowed: true };
  } catch {
    // Network error fetching robots.txt → allow
    return { allowed: true };
  }
}
