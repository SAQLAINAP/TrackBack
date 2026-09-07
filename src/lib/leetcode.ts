import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { dayKey } from "./format";

/**
 * LeetCode has no public REST API, so we read the same GraphQL endpoint the
 * profile page uses. It sends no CORS headers, which shapes how we call it:
 * on Android CapacitorHttp issues a native request that CORS never applies to,
 * and in `npm run dev` Vite proxies /leetcode-api to leetcode.com. A statically
 * served web build has neither, hence the explicit error rather than a hang.
 */
const NATIVE_URL = "https://leetcode.com/graphql";
const PROXY_URL = "/leetcode-api/graphql";

const QUERY = `query($u:String!){
  allQuestionsCount{difficulty count}
  matchedUser(username:$u){
    username
    submitStats{acSubmissionNum{difficulty count}}
    userCalendar{streak totalActiveDays submissionCalendar}
  }
}`;

export interface Solved {
  solved: number;
  total: number;
}

export interface LeetCodeStats {
  username: string;
  fetchedAt: number;
  all: Solved;
  easy: Solved;
  medium: Solved;
  hard: Solved;
  streak: number;
  activeDays: number;
  /** dayKey -> submissions that day, for the heatmap. */
  calendar: Record<string, number>;
}

interface DiffCount {
  difficulty: string;
  count: number;
}

const byDifficulty = (rows: DiffCount[] = []): Record<string, number> =>
  Object.fromEntries(rows.map((r) => [r.difficulty.toLowerCase(), r.count]));

async function postQuery(username: string): Promise<Record<string, any>> {
  const payload = { query: QUERY, variables: { u: username } };

  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.post({
      url: NATIVE_URL,
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/" },
      data: payload,
    });
    if (res.status !== 200) throw new Error(`LeetCode returned HTTP ${res.status}`);
    return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  }

  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not reach LeetCode. The web build needs the dev server proxy.");
  }
  if (res.status === 404) {
    throw new Error("LeetCode proxy is not available in this build. Use the app or `npm run dev`.");
  }
  if (!res.ok) throw new Error(`LeetCode returned HTTP ${res.status}`);
  return res.json();
}

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats> {
  const name = username.trim();
  if (!name) throw new Error("Enter a LeetCode username.");

  const body = await postQuery(name);
  // GraphQL reports a missing profile as a 200 with errors + a null user.
  const user = body?.data?.matchedUser;
  if (!user) throw new Error(`No LeetCode user called "${name}".`);

  const solved = byDifficulty(user.submitStats?.acSubmissionNum);
  const totals = byDifficulty(body?.data?.allQuestionsCount);
  const pair = (k: string): Solved => ({ solved: solved[k] ?? 0, total: totals[k] ?? 0 });

  const calendar: Record<string, number> = {};
  try {
    const raw = JSON.parse(user.userCalendar?.submissionCalendar ?? "{}") as Record<string, number>;
    for (const [secs, count] of Object.entries(raw)) {
      calendar[dayKey(Number(secs) * 1000)] = count;
    }
  } catch {
    /* calendar is best-effort; the counts above are the point of the page */
  }

  return {
    username: user.username ?? name,
    fetchedAt: Date.now(),
    all: pair("all"),
    easy: pair("easy"),
    medium: pair("medium"),
    hard: pair("hard"),
    streak: user.userCalendar?.streak ?? 0,
    activeDays: user.userCalendar?.totalActiveDays ?? 0,
    calendar,
  };
}

// ---------- device-local cache ----------
// Kept out of Dexie on purpose: this is a cache of someone else's data, so it
// should not ride the Supabase sync or land in a backup export.
const KEY = "trackback.leetcode";

export function loadCachedStats(): LeetCodeStats | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LeetCodeStats) : null;
  } catch {
    return null;
  }
}

export function saveCachedStats(stats: LeetCodeStats): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* storage full or blocked — stats just won't survive a restart */
  }
}
