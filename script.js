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

const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

if (navToggle && navMenu) {
  const navLinks = navMenu.querySelectorAll('a[href^="#"]');

  const updateNavState = (isOpen) => {
    navMenu.classList.toggle('active', isOpen);
    navToggle.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  };

  navToggle.addEventListener('click', () => {
    updateNavState(!navMenu.classList.contains('active'));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      updateNavState(false);
    });
  });
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

    const ratingEl = document.getElementById('leetcode-rating');
    ratingEl.textContent = Number.isFinite(stats.rating) ? Math.round(stats.rating).toLocaleString() : '—';

    const rankingEl = document.getElementById('leetcode-ranking');
    rankingEl.textContent = Number.isFinite(stats.ranking)
      ? `Global rank ${stats.ranking.toLocaleString()}`
      : 'Global ranking unavailable';

    const recentEl = document.getElementById('leetcode-recent');
    recentEl.replaceChildren();
    const recent = (stats.recentAccepted ?? []).slice(0, 5);
    if (recent.length) {
      recent.forEach((submission) => {
        const item = document.createElement('li');
        item.textContent = submission.title;
        recentEl.append(item);
      });
    } else {
      const item = document.createElement('li');
      item.textContent = 'No recent accepted submissions';
      recentEl.append(item);
    }

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
    document.getElementById('leetcode-recent').textContent = 'Stats are temporarily unavailable.';
  }
}

loadLeetCodeStats();

window.addEventListener('DOMContentLoaded', () => {
  const logoVideos = document.querySelectorAll('.brand-video');

  logoVideos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn('Logo video failed to autoplay:', error);
      });
    }
  });
});
