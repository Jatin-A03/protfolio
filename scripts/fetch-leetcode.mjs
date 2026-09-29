import { readFile, writeFile } from 'node:fs/promises';

const username = process.env.LEETCODE_USERNAME?.trim() || 'A_Jatin';

const query = `
  query leetcodeStats($username: String!) {
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStats { acSubmissionNum { difficulty count } }
      tagProblemCounts {
        advanced { tagName problemsSolved }
        intermediate { tagName problemsSolved }
        fundamental { tagName problemsSolved }
      }
    }
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
    }
    userContestRankingHistory(username: $username) {
      rating
    }
  }
`;

const response = await fetch('https://leetcode.com/graphql/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'portfolio-stats-updater/1.0',
  },
  body: JSON.stringify({ query, variables: { username } }),
});

if (!response.ok) {
  throw new Error(`LeetCode request failed with HTTP ${response.status}.`);
}

const payload = await response.json();
if (payload.errors?.length) {
  throw new Error(`LeetCode GraphQL error: ${payload.errors.map((error) => error.message).join('; ')}`);
}

const profile = payload.data?.matchedUser;
if (!profile) {
  throw new Error(`LeetCode user "${username}" was not found or has no public profile.`);
}

const submissions = profile.submitStats?.acSubmissionNum ?? [];
const solvedCount = (difficulty) => submissions.find((entry) => entry.difficulty === difficulty)?.count ?? 0;
const contestRanking = payload.data?.userContestRanking;
const ratings = (payload.data?.userContestRankingHistory ?? [])
  .map((contest) => Number(contest.rating))
  .filter(Number.isFinite);
const currentRating = Number(contestRanking?.rating);
if (Number.isFinite(currentRating)) ratings.push(currentRating);
const highestRating = ratings.length ? Math.max(...ratings) : null;
const topics = Object.values(profile.tagProblemCounts ?? {})
  .flat()
  .filter((topic) => topic.problemsSolved > 0)
  .sort((left, right) => right.problemsSolved - left.problemsSolved)
  .slice(0, 10)
  .map(({ tagName, problemsSolved }) => ({ name: tagName, solved: problemsSolved }));

const stats = {
  updatedAt: new Date().toISOString(),
  username: profile.username,
  ranking: profile.profile?.ranking ?? null,
  contestsGiven: contestRanking?.attendedContestsCount ?? 0,
  highestRating,
  totalSolved: solvedCount('All'),
  difficulty: {
    easy: solvedCount('Easy'),
    medium: solvedCount('Medium'),
    hard: solvedCount('Hard'),
  },
  topics,
  profileUrl: `https://leetcode.com/u/${encodeURIComponent(profile.username)}/`,
};

const outputPath = new URL('../data/leetcode.json', import.meta.url);
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
console.log(`Updated LeetCode stats for ${profile.username}: ${stats.totalSolved} solved.`);