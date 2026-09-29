import { readFile, writeFile } from 'node:fs/promises';

const handle = process.env.CODEFORCES_HANDLE?.trim() || 'A_Jatin';
const apiBase = 'https://codeforces.com/api';

async function fetchApi(method, params) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${apiBase}/${method}?${query}`, {
    headers: { 'User-Agent': 'portfolio-stats-updater/1.0' },
  });
  if (!response.ok) throw new Error(`Codeforces ${method} failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload.status !== 'OK') throw new Error(`Codeforces ${method} failed: ${payload.comment || 'unknown error'}`);
  return payload.result;
}

const [user] = await fetchApi('user.info', { handles: handle });
const contests = await fetchApi('user.rating', { handle });
const submissions = await fetchApi('user.status', { handle, from: 1, count: 10000 });

const accepted = submissions.filter((submission) => submission.verdict === 'OK');
const problemKey = (problem) => `${problem.contestId ?? 'practice'}:${problem.index}:${problem.name}`;
const solvedProblems = new Map();
accepted.forEach((submission) => solvedProblems.set(problemKey(submission.problem), submission.problem));

const tagCounts = new Map();
const ratingCounts = new Map();
for (const problem of solvedProblems.values()) {
  for (const tag of problem.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  if (Number.isFinite(problem.rating)) {
    const bucket = String(Math.floor(problem.rating / 100) * 100);
    ratingCounts.set(bucket, (ratingCounts.get(bucket) ?? 0) + 1);
  }
}

const dateKeys = [...new Set(submissions.map((submission) => {
  const date = new Date(submission.creationTimeSeconds * 1000);
  return date.toISOString().slice(0, 10);
}))].sort();
const dateSet = new Set(dateKeys);
const getPreviousDate = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};
let longestStreak = 0;
let currentStreak = 0;
for (const dateKey of dateKeys) {
  currentStreak = dateSet.has(getPreviousDate(dateKey)) ? currentStreak + 1 : 1;
  longestStreak = Math.max(longestStreak, currentStreak);
}
const today = new Date().toISOString().slice(0, 10);
const yesterday = getPreviousDate(today);
currentStreak = dateSet.has(today) ? 1 : 0;
let streakDate = today;
if (!currentStreak && dateSet.has(yesterday)) {
  currentStreak = 1;
  streakDate = yesterday;
}
while (currentStreak && dateSet.has(getPreviousDate(streakDate))) {
  currentStreak += 1;
  streakDate = getPreviousDate(streakDate);
}

const ratingHistory = contests.map((contest) => ({
  contestName: contest.contestName,
  rank: contest.rank,
  oldRating: contest.oldRating,
  newRating: contest.newRating,
  ratingChange: contest.newRating - contest.oldRating,
  timestamp: contest.ratingUpdateTimeSeconds,
}));
const bestContestRank = contests.length ? Math.min(...contests.map((contest) => contest.rank)) : null;
const averageContestRank = contests.length
  ? Math.round(contests.reduce((total, contest) => total + contest.rank, 0) / contests.length)
  : null;

const stats = {
  updatedAt: new Date().toISOString(),
  handle: user.handle,
  rating: user.rating ?? null,
  maxRating: user.maxRating ?? null,
  rank: user.rank ?? null,
  maxRank: user.maxRank ?? null,
  contestsGiven: contests.length,
  problemsSolved: solvedProblems.size,
  acceptedSubmissions: accepted.length,
  acceptanceRate: submissions.length ? Number(((accepted.length / submissions.length) * 100).toFixed(2)) : 0,
  bestContestRank,
  averageContestRank,
  ratingChange: ratingHistory.length ? ratingHistory.at(-1).ratingChange : 0,
  ratingHistory,
  solvedByRating: Object.fromEntries([...ratingCounts.entries()].sort(([left], [right]) => Number(left) - Number(right))),
  topTags: [...tagCounts.entries()]
    .sort(([, left], [, right]) => right - left)
    .slice(0, 10)
    .map(([name, solved]) => ({ name, solved })),
  activeDays: dateKeys.length,
  currentStreak,
  longestStreak,
  profileUrl: `https://codeforces.com/profile/${encodeURIComponent(user.handle)}`,
};

const outputPath = new URL('../data/codeforces.json', import.meta.url);
let currentStats;
try {
  currentStats = JSON.parse(await readFile(outputPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (currentStats && JSON.stringify({ ...currentStats, updatedAt: '' }) === JSON.stringify({ ...stats, updatedAt: '' })) {
  stats.updatedAt = currentStats.updatedAt;
}

await writeFile(outputPath, `${JSON.stringify(stats, null, 2)}\n`);
console.log(`Updated Codeforces stats for ${user.handle}: ${stats.problemsSolved} solved.`);