/* ═══════════════════════════════════════════════════════════════════════
   MATCHR — app.js
   ─────────────────────────────────────────────────────────────────────
   Handles: navigation, rendering, state, user interactions.
   Does NOT talk to any API directly — that's all in api.js.
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── State ────────────────────────────────────────────────────────── */
const state = {
  skills: [],
  nerData: null,
  shortlisted: new Set(),
  selectedJobId: null,
  candidates: [],
  jobs: [
    {
      id: 1,
      title: 'Senior React Engineer',
      department: 'Engineering',
      skills: ['React', 'TypeScript', 'Node.js', 'AWS'],
      experienceMin: 4,
      description: 'Lead our frontend platform team.',
      applicants: 6,
      posted: '2 days ago',
    },
    {
      id: 2,
      title: 'Backend Developer',
      department: 'Platform',
      skills: ['Python', 'PostgreSQL', 'Docker', 'Redis'],
      experienceMin: 3,
      description: 'Build and scale our data pipeline.',
      applicants: 4,
      posted: '5 days ago',
    },
  ],
};


/* ═══════════════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════════════ */
function navigate(pageId) {
  // Hide all pages, show target
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  // Render page-specific content
  const renderers = {
    'candidate-upload': () => renderSteps('upload-steps', 0),
    'candidate-review': () => { renderSteps('review-steps', 1); renderReviewForm(); },
    'candidate-done':   () => renderSteps('done-steps', 2),
    'recruiter-dashboard': renderDashboard,
    'recruiter-rankings':  renderRankings,
  };
  if (renderers[pageId]) renderers[pageId]();

  window.scrollTo(0, 0);
}


/* ═══════════════════════════════════════════════════════════════════════
   STEP INDICATOR
   ═══════════════════════════════════════════════════════════════════════ */
function renderSteps(containerId, current) {
  const labels = ['Upload', 'Review', 'Submit'];
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = labels.map((label, i) => {
    const dotCls = i < current ? 'step__dot--done' : i === current ? 'step__dot--active' : 'step__dot--pending';
    const textCls = i <= current ? 'step__text--active' : 'step__text--pending';
    const lineCls = i < current ? 'step__line--done' : 'step__line--pending';
    const dot = i < current ? '✓' : i + 1;

    let html = `<div class="step">
      <div class="step__dot ${dotCls}">${dot}</div>
      <span class="step__text ${textCls}">${label}</span>
    </div>`;

    if (i < labels.length - 1) {
      html += `<div class="step__line ${lineCls}"></div>`;
    }
    return html;
  }).join('');
}


/* ═══════════════════════════════════════════════════════════════════════
   CANDIDATE — FILE UPLOAD
   ═══════════════════════════════════════════════════════════════════════ */
function initUpload() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragging');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragging');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragging');
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) processFile(e.target.files[0]);
  });
}

async function processFile(file) {
  // Show processing state
  document.getElementById('upload-area').classList.add('hidden');
  document.getElementById('processing-area').classList.remove('hidden');

  // Call API (mock for now, real later)
  const nerData = await parseCv(file);

  // Store in state
  state.nerData = nerData;
  state.skills = [...nerData.skills];

  // Reset UI and navigate
  document.getElementById('upload-area').classList.remove('hidden');
  document.getElementById('processing-area').classList.add('hidden');
  document.getElementById('file-input').value = '';

  navigate('candidate-review');
}


/* ═══════════════════════════════════════════════════════════════════════
   CANDIDATE — NER REVIEW
   ═══════════════════════════════════════════════════════════════════════ */
function renderReviewForm() {
  const d = state.nerData;
  if (!d) return;

  // Populate personal fields
  document.getElementById('ner-name').value = d.name;
  document.getElementById('ner-email').value = d.email;
  document.getElementById('ner-phone').value = d.phone;
  document.getElementById('ner-location').value = d.location;
  document.getElementById('ner-summary').value = d.summary;

  // Skills
  renderSkills();

  // Experience
  const expEl = document.getElementById('experience-list');
  if (expEl) {
    expEl.innerHTML = d.experience.map(exp => `
      <div class="exp-block">
        <div class="grid-2">
          <div class="field">
            <label class="field__label">Role</label>
            <input class="field__input" value="${exp.role}">
          </div>
          <div class="field">
            <label class="field__label">Company</label>
            <input class="field__input" value="${exp.company}">
          </div>
        </div>
        <div class="field" style="margin-top:8px">
          <label class="field__label">Period</label>
          <input class="field__input" value="${exp.period}">
        </div>
      </div>
    `).join('');
  }

  // Education
  const eduEl = document.getElementById('education-list');
  if (eduEl) {
    eduEl.innerHTML = d.education.map(edu => `
      <div class="grid-3-auto mt-16">
        <div class="field">
          <label class="field__label">Degree</label>
          <input class="field__input" value="${edu.degree}">
        </div>
        <div class="field">
          <label class="field__label">Institution</label>
          <input class="field__input" value="${edu.institution}">
        </div>
        <div class="field">
          <label class="field__label">Year</label>
          <input class="field__input" value="${edu.year}">
        </div>
      </div>
    `).join('');
  }
}

function renderSkills() {
  const el = document.getElementById('skills-list');
  if (!el) return;

  const badges = state.skills.map((skill, i) =>
    `<span class="badge badge--accent">
      ${skill}
      <button class="badge__remove" onclick="removeSkill(${i})">&times;</button>
    </span>`
  ).join('');

  const addInput = `<input class="skill-add-input" id="skill-add"
    placeholder="+ Add skill" onkeydown="handleSkillKey(event)">`;

  el.innerHTML = badges + addInput;
}

function removeSkill(index) {
  state.skills.splice(index, 1);
  renderSkills();
}

function handleSkillKey(event) {
  if (event.key === 'Enter') addSkill();
}

function addSkill() {
  const input = document.getElementById('skill-add');
  const value = input.value.trim();
  if (value) {
    state.skills.push(value);
    renderSkills();
  }
}

function copyNER() {
  const lines = [
    `Name: ${document.getElementById('ner-name').value}`,
    `Email: ${document.getElementById('ner-email').value}`,
    `Phone: ${document.getElementById('ner-phone').value}`,
    `Location: ${document.getElementById('ner-location').value}`,
    '',
    `Summary:`,
    document.getElementById('ner-summary').value,
    '',
    `Skills: ${state.skills.join(', ')}`,
  ];

  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '⎘ Copy to Clipboard';
      btn.classList.remove('copied');
    }, 2000);
  });
}

async function handleSubmitProfile() {
  // Gather current form data
  const profileData = {
    name: document.getElementById('ner-name').value,
    email: document.getElementById('ner-email').value,
    phone: document.getElementById('ner-phone').value,
    location: document.getElementById('ner-location').value,
    summary: document.getElementById('ner-summary').value,
    skills: state.skills,
  };

  await submitProfile(profileData);
  navigate('candidate-done');
}


/* ═══════════════════════════════════════════════════════════════════════
   RECRUITER — DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */
function renderDashboard() {
  // Stats
  const totalApplicants = state.jobs.reduce((sum, j) => sum + j.applicants, 0);
  const statsEl = document.getElementById('dash-stats');

  if (statsEl) {
    const stats = [
      { label: 'Active Posts', value: state.jobs.length, icon: '◈' },
      { label: 'Total Applicants', value: totalApplicants, icon: '△' },
      { label: 'Shortlisted', value: state.shortlisted.size, icon: '★' },
    ];

    statsEl.innerHTML = stats.map(s => `
      <div class="stat-card">
        <div class="stat-card__top">
          <span class="stat-card__label">${s.label}</span>
          <span class="stat-card__icon">${s.icon}</span>
        </div>
        <div class="stat-card__value">${s.value}</div>
      </div>
    `).join('');
  }

  // Job list
  const listEl = document.getElementById('job-list');
  if (listEl) {
    listEl.innerHTML = state.jobs.map(job => `
      <div class="job-card" onclick="openRankings(${job.id})">
        <div>
          <div class="job-card__head">
            <h3 class="job-card__title">${job.title}</h3>
            <span class="badge badge--success">Active</span>
          </div>
          <div class="job-card__meta">
            <span class="badge badge--muted">${job.department}</span>
            <span class="badge badge--muted">${job.experienceMin}+ yrs</span>
            <span class="badge badge--muted">${job.applicants} applicants</span>
            <span class="badge badge--muted">${job.posted}</span>
          </div>
        </div>
        <div class="job-card__arrow">View Rankings →</div>
      </div>
    `).join('');
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   RECRUITER — CREATE JOB
   ═══════════════════════════════════════════════════════════════════════ */
async function createJob() {
  const title = document.getElementById('new-job-title').value.trim();
  if (!title) {
    document.getElementById('new-job-title').style.borderColor = 'var(--red-ring)';
    return;
  }

  const jobData = {
    title,
    department: document.getElementById('new-job-dept').value.trim() || 'General',
    description: document.getElementById('new-job-desc').value.trim(),
    skills: document.getElementById('new-job-skills').value
      .split(',').map(s => s.trim()).filter(Boolean),
    experienceMin: parseInt(document.getElementById('new-job-exp').value) || 0,
  };

  // Call API (mock for now)
  const newJob = await createJobPost(jobData);

  // Add to local state
  state.jobs.push(newJob);

  // Clear form
  ['new-job-title', 'new-job-dept', 'new-job-desc', 'new-job-skills', 'new-job-exp']
    .forEach(id => { document.getElementById(id).value = ''; });

  navigate('recruiter-dashboard');
}


/* ═══════════════════════════════════════════════════════════════════════
   RECRUITER — RANKINGS
   ═══════════════════════════════════════════════════════════════════════ */
function openRankings(jobId) {
  state.selectedJobId = jobId;
  navigate('recruiter-rankings');
}

async function renderRankings() {
  const job = state.jobs.find(j => j.id === state.selectedJobId) || state.jobs[0];
  if (!job) return;

  // Fetch candidates from API
  const candidates = await getRankings(job.id);
  state.candidates = candidates;

  // Header
  const headerEl = document.getElementById('rankings-header');
  if (headerEl) {
    const skillBadges = job.skills.map(s =>
      `<span class="badge badge--accent">${s}</span>`
    ).join('');

    headerEl.innerHTML = `
      <h2 class="heading-md mb-6">${job.title}</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${skillBadges}
        <span class="badge badge--muted">${job.experienceMin}+ years</span>
      </div>
    `;
  }

  // Sorted candidate list
  const sorted = [...candidates].sort((a, b) => b.matchScore - a.matchScore);
  const listEl = document.getElementById('rankings-list');
  if (!listEl) return;

  const circumference = 2 * Math.PI * 24;

  listEl.innerHTML = sorted.map((c, idx) => {
    const sc = scoreColor(c.matchScore);
    const isShort = state.shortlisted.has(c.id);
    const dashArray = `${(c.matchScore / 100) * circumference} ${circumference}`;

    const skillBadges = c.skills.map(s => {
      const matched = job.skills.includes(s);
      return `<span class="badge ${matched ? 'badge--success' : 'badge--muted'}">${s}</span>`;
    }).join('');

    return `
      <div class="rank-row ${isShort ? 'shortlisted' : ''}">
        <div class="rank-num ${idx < 3 ? 'rank-num--top' : 'rank-num--rest'}">${idx + 1}</div>

        <div class="score-ring">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle class="score-ring__bg" cx="28" cy="28" r="24"/>
            <circle class="score-ring__fill" cx="28" cy="28" r="24"
              stroke="${sc.ring}" stroke-dasharray="${dashArray}"
              transform="rotate(-90 28 28)"/>
          </svg>
          <div class="score-ring__text" style="color:${sc.color}">${c.matchScore}</div>
        </div>

        <div class="rank-info">
          <div class="rank-info__head">
            <span class="rank-name">${c.name}</span>
            <span class="rank-exp">${c.experience} yrs exp</span>
          </div>
          <div class="rank-skills">${skillBadges}</div>
        </div>

        <button class="btn--shortlist ${isShort ? 'active' : ''}"
          onclick="toggleShortlist(${c.id})">
          ${isShort ? '✓ Shortlisted' : 'Shortlist'}
        </button>
      </div>
    `;
  }).join('');
}

function scoreColor(score) {
  if (score >= 80) return { color: 'var(--green)',  ring: 'var(--green-ring)' };
  if (score >= 60) return { color: 'var(--amber)',  ring: 'var(--amber-ring)' };
  return                   { color: 'var(--red)',    ring: 'var(--red-ring)'   };
}

function toggleShortlist(id) {
  if (state.shortlisted.has(id)) state.shortlisted.delete(id);
  else state.shortlisted.add(id);
  renderRankings();
}


/* ═══════════════════════════════════════════════════════════════════════
   INIT — Run on page load
   ═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initUpload();
  navigate('landing');
});
