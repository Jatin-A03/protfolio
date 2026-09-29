// ── Display last edited date ───────────────────────────────────────────
const lastEditedEl = document.getElementById('last-edited');
if (lastEditedEl) {
  const lastModified = new Date(document.lastModified);
  const formattedDate = lastModified.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  lastEditedEl.textContent = `Last edited: ${formattedDate}`;
}

// ── Contact form → Web3Forms (works on every page) ───────────────────────
document.querySelectorAll('#contact-form').forEach((contactForm) => {
  const feedback = contactForm.querySelector('.contact-feedback');
  const submitBtn = contactForm.querySelector('#submit-btn');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    if (feedback) {
      feedback.textContent = '';
      feedback.className = 'contact-feedback';
    }

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        if (feedback) {
          feedback.textContent = "✅ Message sent! I'll get back to you soon.";
          feedback.classList.add('feedback-success');
        }
        contactForm.reset();
      } else {
        throw new Error(json.message || 'Submission failed');
      }
    } catch (err) {
      if (feedback) {
        feedback.textContent = '❌ Something went wrong. Please try again or email me directly.';
        feedback.classList.add('feedback-error');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
});

async function loadLeetCodeStats() {
  const totalEl = document.getElementById('leetcode-total');
  if (!totalEl) return;

  try {
    const response = await fetch('./data/leetcode.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Stats request failed with HTTP ${response.status}`);

    const stats = await response.json();
    totalEl.textContent = Number(stats.totalSolved ?? 0).toLocaleString();

    const difficultyEl = document.getElementById('leetcode-difficulty');
    difficultyEl.textContent = `Easy ${stats.difficulty?.easy ?? 0} · Medium ${stats.difficulty?.medium ?? 0} · Hard ${stats.difficulty?.hard ?? 0}`;

    const profileEl = document.getElementById('leetcode-profile');
    if (stats.profileUrl) profileEl.href = stats.profileUrl;
    else profileEl.hidden = true;

    const contestsEl = document.getElementById('leetcode-contests');
    contestsEl.textContent = Number(stats.contestsGiven ?? 0).toLocaleString();

    const ratingEl = document.getElementById('leetcode-rating');
    ratingEl.textContent = Number.isFinite(stats.highestRating) ? Math.round(stats.highestRating).toLocaleString() : '—';

    const rankingEl = document.getElementById('leetcode-ranking');
    rankingEl.textContent = Number.isFinite(stats.ranking)
      ? `Global rank ${stats.ranking.toLocaleString()}`
      : 'Global ranking unavailable';

    const topicsEl = document.getElementById('leetcode-topics');
    topicsEl.replaceChildren();
    const topics = (stats.topics ?? []).slice(0, 8);
    if (topics.length) {
      topics.forEach((topic) => {
        const item = document.createElement('li');
        item.textContent = `${topic.name} (${topic.solved})`;
        topicsEl.append(item);
      });
    } else {
      const item = document.createElement('li');
      item.textContent = 'Topic stats unavailable';
      topicsEl.append(item);
    }

    const updatedEl = document.getElementById('leetcode-updated');
    if (stats.updatedAt) {
      const updatedAt = new Date(stats.updatedAt);
      if (!Number.isNaN(updatedAt.getTime())) {
        updatedEl.textContent = `Updated ${updatedAt.toLocaleString()}`;
      }
    }
  } catch (error) {
    console.warn('Could not load LeetCode stats:', error);
    totalEl.textContent = 'Unavailable';
    document.getElementById('leetcode-contests').textContent = 'Unavailable';
    document.getElementById('leetcode-rating').textContent = 'Unavailable';
  }
}

loadLeetCodeStats();

async function loadCodeforcesStats() {
  const ratingEl = document.getElementById('codeforces-rating');
  if (!ratingEl) return;

  try {
    const response = await fetch('./data/codeforces.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Codeforces stats request failed with HTTP ${response.status}`);

    const stats = await response.json();
    ratingEl.textContent = Number.isFinite(stats.rating) ? Math.round(stats.rating).toLocaleString() : '—';
    document.getElementById('codeforces-rank').textContent = stats.rank
      ? `${stats.rank} · Max ${stats.maxRank ?? 'unavailable'} (${stats.maxRating ?? '—'})`
      : 'Rank unavailable';
    document.getElementById('codeforces-solved').textContent = Number(stats.problemsSolved ?? 0).toLocaleString();
    document.getElementById('codeforces-submissions').textContent = `${Number(stats.acceptedSubmissions ?? 0).toLocaleString()} accepted · ${stats.acceptanceRate ?? 0}% acceptance`;
    document.getElementById('codeforces-contests').textContent = Number(stats.contestsGiven ?? 0).toLocaleString();
    document.getElementById('codeforces-best-rank').textContent = stats.bestContestRank
      ? `Best rank ${stats.bestContestRank.toLocaleString()}`
      : 'Best rank unavailable';
    document.getElementById('codeforces-max-rating').textContent = Number.isFinite(stats.maxRating)
      ? Math.round(stats.maxRating).toLocaleString()
      : '—';
    document.getElementById('codeforces-average-rank').textContent = Number.isFinite(stats.averageContestRank)
      ? stats.averageContestRank.toLocaleString()
      : '—';
    const ratingChange = Number(stats.ratingChange ?? 0);
    document.getElementById('codeforces-rating-change').textContent = `${ratingChange >= 0 ? '+' : ''}${ratingChange.toLocaleString()}`;
    document.getElementById('codeforces-active-days').textContent = `${Number(stats.activeDays ?? 0).toLocaleString()} days`;
    document.getElementById('codeforces-current-streak').textContent = `${Number(stats.currentStreak ?? 0).toLocaleString()} days`;
    document.getElementById('codeforces-longest-streak').textContent = `${Number(stats.longestStreak ?? 0).toLocaleString()} days`;

    const renderList = (elementId, values, label) => {
      const list = document.getElementById(elementId);
      list.replaceChildren();
      if (!values?.length) {
        const item = document.createElement('li');
        item.textContent = `${label} unavailable`;
        list.append(item);
        return;
      }
      values.forEach((entry) => {
        const item = document.createElement('li');
        item.textContent = `${entry.name}: ${entry.solved ?? entry.submissions}`;
        list.append(item);
      });
    };

    renderList('codeforces-tags', stats.topTags, 'Tags');
    const ratingList = document.getElementById('codeforces-solved-by-rating');
    ratingList.replaceChildren();
    const ratingBuckets = Object.entries(stats.solvedByRating ?? {})
      .map(([rating, solved]) => [Number(rating), Number(solved)])
      .filter(([rating, solved]) => Number.isFinite(rating) && Number.isFinite(solved) && solved >= 0)
      .sort(([left], [right]) => left - right);
    const largestBucket = Math.max(0, ...ratingBuckets.map(([, solved]) => solved));
    if (ratingBuckets.length) {
      ratingBuckets.forEach(([rating, solved]) => {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.className = 'rating-bucket-label';
        label.textContent = rating.toLocaleString();

        const track = document.createElement('span');
        track.className = 'rating-bucket-track';
        track.setAttribute('aria-hidden', 'true');
        const bar = document.createElement('span');
        bar.className = 'rating-bucket-bar';
        bar.style.width = `${largestBucket ? (solved / largestBucket) * 100 : 0}%`;
        track.append(bar);

        const count = document.createElement('span');
        count.className = 'rating-bucket-count';
        count.textContent = solved.toLocaleString();

        item.setAttribute('aria-label', `Rating ${rating}: ${solved} solved`);
        item.append(label, track, count);
        ratingList.append(item);
      });
    } else {
      const item = document.createElement('li');
      item.textContent = 'Rating distribution unavailable';
      ratingList.append(item);
    }
    if (stats.updatedAt) {
      const updatedAt = new Date(stats.updatedAt);
      if (!Number.isNaN(updatedAt.getTime())) {
        document.getElementById('codeforces-updated').textContent = `Updated ${updatedAt.toLocaleString()}`;
      }
    }
  } catch (error) {
    console.warn('Could not load Codeforces stats:', error);
    ratingEl.textContent = 'Unavailable';
    document.getElementById('codeforces-solved').textContent = 'Unavailable';
    document.getElementById('codeforces-contests').textContent = 'Unavailable';
  }
}

loadCodeforcesStats();
