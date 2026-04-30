/* ═══════════════════════════════════════════════════════════════════════
   MATCHR — app.js (Redesigned)
   ═══════════════════════════════════════════════════════════════════════ */

const state = {
  user: null, role: null, companyName: '',
  skills: [], nerData: null, candidateProfile: null,
  shortlisted: new Set(), selectedJobId: null, selectedCandidateId: null,
  candidates: [], jobs: [], allJobs: [],
  authMode: 'login', selectedRole: 'candidate', jobTab: 'active', editingJobId: null,
};


/* ═══════════════════════════════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════════════════════════════ */
let initialLoad = true;

function initAuth() {
  onAuthChange(async (user) => {
    if (user) {
      state.user = user;
      const data = await getUserData(user.uid);
      state.role = data.role;
      state.companyName = data.companyName || '';
      showLogout(true, user.email);
      if (initialLoad) {
        if (state.role === 'candidate') navigate('candidate-jobs');
        else if (state.role === 'recruiter') navigate('recruiter-dashboard');
      }
    } else {
      state.user = null; state.role = null; state.companyName = '';
      showLogout(false);
      if (initialLoad) navigate('auth');
    }
    initialLoad = false;
  });
}

function switchAuthTab(mode) {
  state.authMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
  document.getElementById('auth-role-section').classList.toggle('hidden', mode === 'login');
  document.getElementById('auth-btn-text').textContent = mode === 'login' ? 'Log In' : 'Create Account';
  document.getElementById('auth-switch-text').textContent = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
  document.getElementById('auth-switch-link').textContent = mode === 'login' ? 'Sign up' : 'Log in';
  updateCompanyField();
  hideAuthError();
}

function toggleAuthMode() { switchAuthTab(state.authMode === 'login' ? 'signup' : 'login'); }

function pickAuthRole(role) {
  state.selectedRole = role;
  document.querySelectorAll('.auth-role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
  updateCompanyField();
}

function updateCompanyField() {
  const show = state.authMode === 'signup' && state.selectedRole === 'recruiter';
  document.getElementById('auth-company-section').classList.toggle('hidden', !show);
}

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const btn = document.getElementById('auth-submit-btn');
  if (!email || !password) { showAuthError('Please enter both email and password.'); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

  btn.disabled = true; hideAuthError();
  try {
    let result;
    if (state.authMode === 'signup') {
      const company = document.getElementById('auth-company').value.trim();
      if (state.selectedRole === 'recruiter' && !company) { showAuthError('Please enter your company name.'); btn.disabled = false; return; }
      result = await signUp(email, password, state.selectedRole, company);
    } else {
      result = await signIn(email, password);
    }
    state.user = result.user; state.role = result.role; state.companyName = result.companyName || '';
    showLogout(true, result.user.email);
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-company').value = '';
    if (state.role === 'candidate') navigate('candidate-jobs');
    else navigate('recruiter-dashboard');
  } catch (err) { showAuthError(firebaseErrorMessage(err.code)); }
  finally { btn.disabled = false; }
}

async function handleLogout() {
  await logOut();
  state.user = null; state.role = null; state.companyName = '';
  state.jobs = []; state.allJobs = []; state.candidates = [];
  state.shortlisted.clear(); state.candidateProfile = null;
  showLogout(false); navigate('auth');
}

function showLogout(show, email) {
  const el = document.getElementById('global-logout');
  const emailEl = document.getElementById('logout-email');
  if (show) { el.classList.remove('hidden'); if (emailEl && email) emailEl.textContent = email; }
  else { el.classList.add('hidden'); }
}
function showAuthError(msg) { const el = document.getElementById('auth-error'); el.textContent = msg; el.classList.remove('hidden'); }
function hideAuthError() { document.getElementById('auth-error').classList.add('hidden'); }
function firebaseErrorMessage(code) {
  const m = { 'auth/email-already-in-use':'Email already registered. Try logging in.', 'auth/invalid-email':'Invalid email.', 'auth/weak-password':'Password must be 6+ characters.', 'auth/user-not-found':'No account found.', 'auth/wrong-password':'Incorrect password.', 'auth/invalid-credential':'Invalid email or password.', 'auth/too-many-requests':'Too many attempts. Wait a moment.', 'auth/network-request-failed':'Network error.' };
  return m[code] || 'Something went wrong. Please try again.';
}


/* ═══════════════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════════════ */
function navigate(pageId) {
  const cPages = ['candidate-jobs','candidate-upload','candidate-apply','candidate-done'];
  const rPages = ['recruiter-dashboard','recruiter-create','recruiter-job','recruiter-candidate'];
  if (cPages.includes(pageId) && !state.user) { pageId = 'auth'; state.selectedRole = 'candidate'; }
  if (rPages.includes(pageId) && !state.user) { pageId = 'auth'; state.selectedRole = 'recruiter'; }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  const renderers = {
    'auth': () => switchAuthTab(state.authMode),
    'candidate-jobs': renderJobBoard,
    'candidate-upload': renderCvPage,
    'candidate-apply': renderApplyPage,
    'candidate-done': () => {},
    'recruiter-dashboard': renderRecruiterDashboard,
    'recruiter-create': setupCreateForm,
    'recruiter-job': renderRecruiterJob,
    'recruiter-candidate': renderCandidateDetail,
  };
  if (renderers[pageId]) renderers[pageId]();
  window.scrollTo(0, 0);
}


/* ═══════════════════════════════════════════════════════════════════════
   CANDIDATE — JOB BOARD
   ═══════════════════════════════════════════════════════════════════════ */
async function renderJobBoard() {
  const listEl = document.getElementById('job-board-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="loading-inline"><div class="spinner"></div>Loading jobs...</div>';

  try { state.allJobs = await getAllActiveJobs(); } catch (e) { console.error(e); state.allJobs = []; }
  filterAndRenderJobs();
}

function filterAndRenderJobs() {
  const listEl = document.getElementById('job-board-list');
  if (!listEl) return;
  const query = (document.getElementById('job-search')?.value || '').toLowerCase();
  const sort = document.getElementById('job-sort')?.value || 'recent';

  let jobs = [...state.allJobs];
  if (query) {
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(query) ||
      j.companyName.toLowerCase().includes(query) ||
      (j.skills || []).some(s => s.toLowerCase().includes(query)) ||
      (j.description || '').toLowerCase().includes(query)
    );
  }
  if (sort === 'alpha') jobs.sort((a, b) => a.title.localeCompare(b.title));

  if (!jobs.length) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-state__icon">◈</div><p>No jobs found. Try a different search.</p></div>';
    return;
  }
  listEl.innerHTML = jobs.map(j => `
    <div class="job-card" onclick="openApplyPage('${j.id}')">
      <div>
        <div class="job-card__head">
          <h3 class="job-card__title">${j.title}</h3>
          <span class="job-card__company">${j.companyName}</span>
          ${j.applied ? '<span class="badge badge--success">Applied</span>' : ''}
        </div>
        <div class="job-card__meta">
          ${j.location ? `<span class="badge badge--muted">${j.location}</span>` : ''}
          ${j.jobType ? `<span class="badge badge--muted">${j.jobType}</span>` : ''}
          ${j.experienceMin ? `<span class="badge badge--muted">${j.experienceMin}+ yrs</span>` : ''}
          ${(j.skills || []).slice(0, 4).map(s => `<span class="badge badge--blue">${s}</span>`).join('')}
        </div>
      </div>
      <div class="job-card__arrow">${j.posted} →</div>
    </div>
  `).join('');
}


/* ═══════════════════════════════════════════════════════════════════════
   CANDIDATE — CV MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════ */
async function renderCvPage() {
  const existingEl = document.getElementById('cv-existing');
  const uploadEl = document.getElementById('cv-upload-section');
  const editEl = document.getElementById('cv-edit-form');
  const processingEl = document.getElementById('processing-area');

  editEl.classList.add('hidden');
  processingEl.classList.add('hidden');

  // Check if candidate already has a saved profile
  try { state.candidateProfile = await getCandidate(); } catch (e) { state.candidateProfile = null; }

  if (state.candidateProfile && state.candidateProfile.name) {
    existingEl.classList.remove('hidden');
    uploadEl.classList.add('hidden');
    renderCvPreview(state.candidateProfile);
  } else {
    existingEl.classList.add('hidden');
    uploadEl.classList.remove('hidden');
  }
}

function renderCvPreview(data) {
  const el = document.getElementById('cv-preview-content');
  if (!el) return;
  el.innerHTML = `
    <div class="grid-2 mb-16">
      <div class="cv-preview-field"><div class="cv-preview-field__label">Name</div><div class="cv-preview-field__value">${data.name || '—'}</div></div>
      <div class="cv-preview-field"><div class="cv-preview-field__label">Email</div><div class="cv-preview-field__value">${data.email || '—'}</div></div>
      <div class="cv-preview-field"><div class="cv-preview-field__label">Phone</div><div class="cv-preview-field__value">${data.phone || '—'}</div></div>
      <div class="cv-preview-field"><div class="cv-preview-field__label">Location</div><div class="cv-preview-field__value">${data.location || '—'}</div></div>
    </div>
    <div class="cv-preview-field mb-16"><div class="cv-preview-field__label">Summary</div><div class="cv-preview-field__value">${data.summary || '—'}</div></div>
    <div class="cv-preview-field mb-16"><div class="cv-preview-field__label">Skills</div>
      <div class="cv-preview-skills">${(data.skills || []).map(s => `<span class="badge badge--accent">${s}</span>`).join('') || '—'}</div></div>
    <div class="cv-preview-field mb-16"><div class="cv-preview-field__label">Experience</div><div class="cv-preview-field__value">${data.yearsExperience || 0} years</div></div>
    ${(data.experience || []).filter(e => e.role || e.company).map(e => `<div class="cv-preview-field" style="margin-left:16px;margin-bottom:8px"><div class="cv-preview-field__value">${e.role}${e.company ? ' at ' + e.company : ''}${e.period ? ' (' + e.period + ')' : ''}</div></div>`).join('')}
    ${(data.education || []).filter(e => e.degree || e.institution).map(e => `<div class="cv-preview-field" style="margin-left:16px;margin-bottom:8px"><div class="cv-preview-field__label">Education</div><div class="cv-preview-field__value">${e.degree}${e.institution ? ' — ' + e.institution : ''}${e.year ? ' (' + e.year + ')' : ''}</div></div>`).join('')}
  `;
}

function showUploadZone() {
  document.getElementById('cv-existing').classList.add('hidden');
  document.getElementById('cv-upload-section').classList.remove('hidden');
  document.getElementById('cv-edit-form').classList.add('hidden');
}

function showEditForm(data) {
  document.getElementById('cv-upload-section').classList.add('hidden');
  document.getElementById('cv-existing').classList.add('hidden');
  document.getElementById('processing-area').classList.add('hidden');
  document.getElementById('cv-edit-form').classList.remove('hidden');

  document.getElementById('cv-name').value = data.name || '';
  document.getElementById('cv-email').value = data.email || '';
  document.getElementById('cv-phone').value = data.phone || '';
  document.getElementById('cv-location').value = data.location || '';
  document.getElementById('cv-summary').value = data.summary || '';
  document.getElementById('cv-years').value = data.yearsExperience || '';
  state.skills = [...(data.skills || [])];
  renderSkills();

  const expEl = document.getElementById('cv-experience-list');
  if (expEl) {
    expEl.innerHTML = (data.experience || []).map(exp => `
      <div class="exp-block"><div class="grid-2">
        <div class="field"><label class="field__label">Role</label><input class="field__input exp-role" value="${exp.role || ''}" placeholder="e.g. Software Engineer"></div>
        <div class="field"><label class="field__label">Company</label><input class="field__input exp-company" value="${exp.company || ''}" placeholder="e.g. Acme Corp"></div>
      </div><div class="field" style="margin-top:8px"><label class="field__label">Period</label><input class="field__input exp-period" value="${exp.period || ''}" placeholder="e.g. 2020 – Present"></div></div>
    `).join('');
  }
  const eduEl = document.getElementById('cv-education-list');
  if (eduEl) {
    eduEl.innerHTML = (data.education || []).map(edu => `
      <div class="grid-3-auto mt-16">
        <div class="field"><label class="field__label">Degree</label><input class="field__input edu-degree" value="${edu.degree || ''}" placeholder="e.g. BSc Computer Science"></div>
        <div class="field"><label class="field__label">Institution</label><input class="field__input edu-institution" value="${edu.institution || ''}" placeholder="e.g. University of London"></div>
        <div class="field"><label class="field__label">Year</label><input class="field__input edu-year" value="${edu.year || ''}" placeholder="e.g. 2020"></div>
      </div>
    `).join('');
  }
}

function skipToManualEntry() {
  const user = getCurrentUser();
  showEditForm({ name: '', email: user ? user.email : '', phone: '', location: '', summary: '', skills: [], yearsExperience: 0, experience: [{ role: '', company: '', period: '' }], education: [{ degree: '', institution: '', year: '' }] });
}

function cancelCvEdit() {
  document.getElementById('cv-edit-form').classList.add('hidden');
  if (state.candidateProfile && state.candidateProfile.name) {
    document.getElementById('cv-existing').classList.remove('hidden');
  } else {
    document.getElementById('cv-upload-section').classList.remove('hidden');
  }
}

async function saveCvProfile() {
  const btn = document.getElementById('save-cv-btn');
  const name = document.getElementById('cv-name').value.trim();
  if (!name) { document.getElementById('cv-name').style.borderColor = 'var(--red-ring)'; document.getElementById('cv-name').focus(); return; }

  btn.disabled = true; btn.textContent = 'Saving...';
  const experience = [];
  document.querySelectorAll('.exp-role').forEach((el, i) => {
    const co = document.querySelectorAll('.exp-company')[i]?.value.trim() || '';
    const pe = document.querySelectorAll('.exp-period')[i]?.value.trim() || '';
    if (el.value.trim() || co) experience.push({ role: el.value.trim(), company: co, period: pe });
  });
  const education = [];
  document.querySelectorAll('.edu-degree').forEach((el, i) => {
    const inst = document.querySelectorAll('.edu-institution')[i]?.value.trim() || '';
    const yr = document.querySelectorAll('.edu-year')[i]?.value.trim() || '';
    if (el.value.trim()) education.push({ degree: el.value.trim(), institution: inst, year: yr });
  });

  try {
    const profileData = { name, email: document.getElementById('cv-email').value.trim(), phone: document.getElementById('cv-phone').value.trim(), location: document.getElementById('cv-location').value.trim(), summary: document.getElementById('cv-summary').value.trim(), skills: state.skills, yearsExperience: parseInt(document.getElementById('cv-years').value) || 0, experience, education };
    await saveCandidate(profileData);
    state.candidateProfile = profileData;
    document.getElementById('cv-edit-form').classList.add('hidden');
    document.getElementById('cv-existing').classList.remove('hidden');
    document.getElementById('cv-upload-section').classList.add('hidden');
    renderCvPreview(profileData);
  } catch (err) { alert('Error saving profile.'); console.error(err); }
  finally { btn.disabled = false; btn.textContent = 'Save Profile →'; }
}


/* ═══════════════════════════════════════════════════════════════════════
   CANDIDATE — APPLY TO JOB
   ═══════════════════════════════════════════════════════════════════════ */
function openApplyPage(jobId) { state.selectedJobId = jobId; navigate('candidate-apply'); }

async function renderApplyPage() {
  const detailEl = document.getElementById('apply-job-details');
  const cvEl = document.getElementById('apply-cv-section');
  if (!detailEl || !cvEl) return;
  detailEl.innerHTML = '<div class="loading-inline"><div class="spinner"></div>Loading...</div>';
  cvEl.innerHTML = '';

  const job = await getJobById(state.selectedJobId);
  if (!job) { detailEl.innerHTML = '<p>Job not found.</p>'; return; }

  detailEl.innerHTML = `
    <div class="job-detail">
      <div class="job-detail__title">${job.title}</div>
      <div class="job-detail__company">${job.companyName}</div>
      <div class="job-detail__desc">${job.description || 'No description provided.'}</div>
      <div class="job-detail__info">
        ${job.location ? `<span class="badge badge--muted">${job.location}</span>` : ''}
        ${job.jobType ? `<span class="badge badge--muted">${job.jobType}</span>` : ''}
        ${job.experienceMin ? `<span class="badge badge--muted">${job.experienceMin}+ yrs experience</span>` : ''}
        ${job.salary ? `<span class="badge badge--muted">${job.salary}</span>` : ''}
      </div>
      <div style="margin-top:16px;display:flex;gap:6px;flex-wrap:wrap">
        ${(job.skills || []).map(s => `<span class="badge badge--blue">${s}</span>`).join('')}
      </div>
    </div>`;

  // Check if already applied
  const applied = await hasApplied(state.selectedJobId);
  if (applied) {
    cvEl.innerHTML = '<div class="card card--padded text-center"><div class="done-icon" style="width:60px;height:60px;font-size:24px;">✓</div><p class="text-body">You have already applied to this position.</p><button class="btn btn--secondary mt-16" onclick="navigate(\'candidate-jobs\')">← Browse Jobs</button></div>';
    return;
  }

  // Check if CV exists
  if (!state.candidateProfile) {
    try { state.candidateProfile = await getCandidate(); } catch (e) { state.candidateProfile = null; }
  }

  if (!state.candidateProfile || !state.candidateProfile.name) {
    cvEl.innerHTML = `<div class="card card--padded text-center">
      <p class="text-body mb-16">You need to upload your CV before applying.</p>
      <button class="btn btn--primary" onclick="navigate('candidate-upload')">Upload CV →</button>
    </div>`;
    return;
  }

  // Show CV preview with apply button
  cvEl.innerHTML = `
    <div class="card card--padded">
      <div class="flex-between mb-16">
        <div class="section-label">Your Profile</div>
        <button class="btn--ghost" onclick="navigate('candidate-upload')">Edit CV</button>
      </div>
      <div class="grid-2 mb-16">
        <div class="cv-preview-field"><div class="cv-preview-field__label">Name</div><div class="cv-preview-field__value">${state.candidateProfile.name}</div></div>
        <div class="cv-preview-field"><div class="cv-preview-field__label">Experience</div><div class="cv-preview-field__value">${state.candidateProfile.yearsExperience || 0} years</div></div>
      </div>
      <div class="cv-preview-field mb-16"><div class="cv-preview-field__label">Skills</div>
        <div class="cv-preview-skills">${(state.candidateProfile.skills || []).map(s => `<span class="badge badge--accent">${s}</span>`).join('')}</div></div>
    </div>
    <label class="consent-check" id="apply-consent-label">
      <input type="checkbox" id="apply-consent">
      <span>I agree for my profile to be processed by AI for matching. My name will be hidden until I am shortlisted.</span>
    </label>
    <div class="flex-end">
      <button class="btn btn--secondary" onclick="navigate('candidate-jobs')">← Cancel</button>
      <button class="btn btn--primary" id="apply-btn" onclick="submitApplication()">Apply Now →</button>
    </div>`;
}

async function submitApplication() {
  if (!document.getElementById('apply-consent').checked) {
    document.getElementById('apply-consent-label').style.color = 'var(--red)';
    return;
  }
  const btn = document.getElementById('apply-btn');
  btn.disabled = true; btn.textContent = 'Applying...';
  try {
    await applyToJob(state.selectedJobId);
    navigate('candidate-done');
  } catch (err) { alert('Error applying.'); console.error(err); }
  finally { btn.disabled = false; btn.textContent = 'Apply Now →'; }
}


/* ═══════════════════════════════════════════════════════════════════════
   CANDIDATE — SKILLS (shared)
   ═══════════════════════════════════════════════════════════════════════ */
function renderSkills() {
  const el = document.getElementById('skills-list');
  if (!el) return;
  el.innerHTML = state.skills.map((s, i) => `<span class="badge badge--accent">${s}<button class="badge__remove" onclick="removeSkill(${i})">&times;</button></span>`).join('') +
    `<input class="skill-add-input" id="skill-add" placeholder="+ Add skill" onkeydown="if(event.key==='Enter')addSkill()">`;
}
function removeSkill(i) { state.skills.splice(i, 1); renderSkills(); }
function addSkill() { const v = document.getElementById('skill-add').value.trim(); if (v) { state.skills.push(v); renderSkills(); } }


/* ═══════════════════════════════════════════════════════════════════════
   CANDIDATE — FILE UPLOAD
   ═══════════════════════════════════════════════════════════════════════ */
function initUpload() {
  const dz = document.getElementById('drop-zone');
  const fi = document.getElementById('file-input');
  if (!dz || !fi) return;
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragging'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragging'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragging'); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); });
  fi.addEventListener('change', e => { if (e.target.files[0]) processFile(e.target.files[0]); });
}

async function processFile(file) {
  document.getElementById('cv-upload-section').classList.add('hidden');
  document.getElementById('cv-existing').classList.add('hidden');
  document.getElementById('processing-area').classList.remove('hidden');
  const data = await parseCv(file);
  document.getElementById('processing-area').classList.add('hidden');
  document.getElementById('file-input').value = '';
  showEditForm(data);
}


/* ═══════════════════════════════════════════════════════════════════════
   RECRUITER — DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */
async function renderRecruiterDashboard() {
  const greeting = document.getElementById('recruiter-greeting');
  if (greeting) greeting.textContent = state.companyName ? `${state.companyName}` : 'Dashboard';

  const listEl = document.getElementById('recruiter-job-list');
  if (listEl) listEl.innerHTML = '<div class="loading-inline"><div class="spinner"></div>Loading...</div>';

  try { state.jobs = await getRecruiterJobs(); } catch (e) { console.error(e); state.jobs = []; }

  // Stats
  const statsEl = document.getElementById('dash-stats');
  if (statsEl) {
    const active = state.jobs.filter(j => j.status === 'active').length;
    const archived = state.jobs.filter(j => j.status === 'archived').length;
    const totalApps = state.jobs.reduce((s, j) => s + (j.applicants || 0), 0);
    statsEl.innerHTML = [
      { label: 'Active', value: active, icon: '◈' },
      { label: 'Applicants', value: totalApps, icon: '△' },
      { label: 'Archived', value: archived, icon: '▣' },
    ].map(s => `<div class="stat-card"><div class="stat-card__top"><span class="stat-card__label">${s.label}</span><span class="stat-card__icon">${s.icon}</span></div><div class="stat-card__value">${s.value}</div></div>`).join('');
  }
  switchJobTab(state.jobTab);
}

function switchJobTab(tab) {
  state.jobTab = tab;
  document.getElementById('tab-active')?.classList.toggle('active', tab === 'active');
  document.getElementById('tab-archived')?.classList.toggle('active', tab === 'archived');

  const listEl = document.getElementById('recruiter-job-list');
  if (!listEl) return;
  const filtered = state.jobs.filter(j => j.status === tab);

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${tab === 'active' ? '◈' : '▣'}</div><p>No ${tab} jobs.</p></div>`;
    return;
  }
  listEl.innerHTML = filtered.map(j => `
    <div class="job-card">
      <div onclick="openRecruiterJob('${j.id}')" style="flex:1;cursor:pointer">
        <div class="job-card__head"><h3 class="job-card__title">${j.title}</h3><span class="badge badge--${tab === 'active' ? 'success' : 'muted'}">${tab === 'active' ? 'Active' : 'Archived'}</span></div>
        <div class="job-card__meta">
          ${j.department ? `<span class="badge badge--muted">${j.department}</span>` : ''}
          <span class="badge badge--muted">${j.applicants} applicants</span>
          <span class="badge badge--muted">${j.posted}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
        ${tab === 'active' ? `<button class="btn--ghost" onclick="event.stopPropagation();editJob('${j.id}')">Edit</button><button class="btn--danger" onclick="event.stopPropagation();archiveJobAction('${j.id}')">Archive</button>` : `<button class="btn--ghost" onclick="event.stopPropagation();reactivateJobAction('${j.id}')">Reactivate</button>`}
        <div class="job-card__arrow" onclick="openRecruiterJob('${j.id}')" style="cursor:pointer">View →</div>
      </div>
    </div>
  `).join('');
}

async function archiveJobAction(jobId) { await archiveJob(jobId); renderRecruiterDashboard(); }
async function reactivateJobAction(jobId) { await reactivateJob(jobId); renderRecruiterDashboard(); }


/* ═══════════════════════════════════════════════════════════════════════
   RECRUITER — CREATE / EDIT JOB
   ═══════════════════════════════════════════════════════════════════════ */
function editJob(jobId) {
  state.editingJobId = jobId;
  navigate('recruiter-create');
}

function setupCreateForm() {
  const heading = document.getElementById('create-heading');
  const submitBtn = document.getElementById('create-submit-btn');
  const fields = ['new-title','new-dept','new-desc','new-location','new-salary','new-skills','new-exp'];

  if (state.editingJobId) {
    // Edit mode: pre-fill form with existing job data
    const job = state.jobs.find(j => j.id === state.editingJobId);
    if (job) {
      if (heading) heading.textContent = 'Edit Job Post';
      if (submitBtn) submitBtn.textContent = 'Save Changes →';
      document.getElementById('new-title').value = job.title || '';
      document.getElementById('new-dept').value = job.department || '';
      document.getElementById('new-desc').value = job.description || '';
      document.getElementById('new-location').value = job.location || '';
      document.getElementById('new-salary').value = job.salary || '';
      document.getElementById('new-skills').value = (job.skills || []).join(', ');
      document.getElementById('new-exp').value = job.experienceMin || '';
      const typeEl = document.getElementById('new-type');
      if (typeEl && job.jobType) typeEl.value = job.jobType;
    }
  } else {
    // Create mode: clear form
    if (heading) heading.textContent = 'Create Job Post';
    if (submitBtn) submitBtn.textContent = 'Publish Job →';
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
}

async function createJob() {
  const title = document.getElementById('new-title').value.trim();
  if (!title) { document.getElementById('new-title').style.borderColor = 'var(--red-ring)'; return; }

  const jobData = {
    title, department: document.getElementById('new-dept').value.trim() || '',
    description: document.getElementById('new-desc').value.trim(),
    location: document.getElementById('new-location').value.trim(),
    jobType: document.getElementById('new-type').value,
    salary: document.getElementById('new-salary').value.trim(),
    skills: document.getElementById('new-skills').value.split(',').map(s => s.trim()).filter(Boolean),
    experienceMin: parseInt(document.getElementById('new-exp').value) || 0,
  };

  try {
    if (state.editingJobId) {
      await updateJob(state.editingJobId, jobData);
      state.editingJobId = null;
    } else {
      await createJobPost(jobData);
    }
    ['new-title','new-dept','new-desc','new-location','new-salary','new-skills','new-exp'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    navigate('recruiter-dashboard');
  } catch (err) { alert('Error saving job.'); console.error(err); }
}


/* ═══════════════════════════════════════════════════════════════════════
   RECRUITER — JOB RANKINGS
   ═══════════════════════════════════════════════════════════════════════ */
function openRecruiterJob(jobId) { state.selectedJobId = jobId; navigate('recruiter-job'); }

async function renderRecruiterJob() {
  const headerEl = document.getElementById('rjob-header');
  const listEl = document.getElementById('rjob-rankings');
  if (!headerEl || !listEl) return;

  const job = state.jobs.find(j => j.id === state.selectedJobId) || await getJobById(state.selectedJobId);
  if (!job) { headerEl.innerHTML = '<p>Job not found.</p>'; return; }

  headerEl.innerHTML = `
    <h2 class="heading-md mb-6">${job.title}</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${(job.skills || []).map(s => `<span class="badge badge--accent">${s}</span>`).join('')}
      ${job.experienceMin ? `<span class="badge badge--muted">${job.experienceMin}+ years</span>` : ''}
      <span class="badge badge--muted">${job.applicants || 0} applicants</span>
    </div>`;

  listEl.innerHTML = '<div class="loading-inline"><div class="spinner"></div>Matching candidates...</div>';

  try {
    const [candidates, shortlistedIds] = await Promise.all([
      getJobApplicants(state.selectedJobId),
      getShortlists(state.selectedJobId),
    ]);
    state.candidates = candidates;
    state.shortlisted = shortlistedIds;

    if (!candidates.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-state__icon">△</div><p>No applications yet.</p></div>';
      return;
    }

    const circ = 2 * Math.PI * 24;
    listEl.innerHTML = candidates.map((c, idx) => {
      const sc = scoreColor(c.matchScore);
      const isShort = state.shortlisted.has(c.id);
      const dash = `${(c.matchScore / 100) * circ} ${circ}`;
      const displayName = isShort ? c.name : `Candidate ${idx + 1}`;
      const skills = (c.skills || []).map(s => {
        const hit = (job.skills || []).map(j => j.toLowerCase()).includes(s.toLowerCase());
        return `<span class="badge ${hit ? 'badge--success' : 'badge--muted'}">${s}</span>`;
      }).join('');

      return `
        <div class="rank-row ${isShort ? 'shortlisted' : ''}">
          <div class="rank-num ${idx < 3 ? 'rank-num--top' : 'rank-num--rest'}">${idx + 1}</div>
          <div class="score-ring">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle class="score-ring__bg" cx="28" cy="28" r="24"/>
              <circle class="score-ring__fill" cx="28" cy="28" r="24" stroke="${sc.ring}" stroke-dasharray="${dash}" transform="rotate(-90 28 28)"/>
            </svg>
            <div class="score-ring__text" style="color:${sc.color}">${c.matchScore}</div>
          </div>
          <div class="rank-info">
            <div class="rank-info__head">
              <span class="rank-name">${displayName}</span>
              ${!isShort ? '<span class="badge badge--muted">🔒 Anonymous</span>' : ''}
              <span class="rank-exp">${c.experience} yrs exp</span>
            </div>
            <div class="rank-skills">${skills}</div>
          </div>
          <div class="rank-actions">
            ${isShort ? `<button class="btn--ghost" onclick="viewCandidate('${c.id}')">View CV</button>` : ''}
            <button class="btn--shortlist ${isShort ? 'active' : ''}" onclick="toggleShortlist('${c.id}')">${isShort ? '✓ Shortlisted' : 'Shortlist'}</button>
          </div>
        </div>`;
    }).join('');
  } catch (err) { console.error(err); listEl.innerHTML = '<div class="empty-state"><p>Error loading candidates.</p></div>'; }
}

function scoreColor(s) {
  if (s >= 80) return { color:'var(--green)', ring:'var(--green-ring)' };
  if (s >= 60) return { color:'var(--amber)', ring:'var(--amber-ring)' };
  return { color:'var(--red)', ring:'var(--red-ring)' };
}

async function toggleShortlist(id) {
  const jobId = state.selectedJobId;
  if (state.shortlisted.has(id)) { state.shortlisted.delete(id); await removeShortlist(id, jobId); }
  else { state.shortlisted.add(id); await addShortlist(id, jobId); }
  renderRecruiterJob();
}


/* ═══════════════════════════════════════════════════════════════════════
   RECRUITER — CANDIDATE DETAIL
   ═══════════════════════════════════════════════════════════════════════ */
function viewCandidate(candidateId) { state.selectedCandidateId = candidateId; navigate('recruiter-candidate'); }

async function renderCandidateDetail() {
  const el = document.getElementById('candidate-detail');
  if (!el) return;
  el.innerHTML = '<div class="loading-inline"><div class="spinner"></div>Loading profile...</div>';

  try {
    const c = await getCandidateDetail(state.selectedCandidateId);
    if (!c) { el.innerHTML = '<p>Candidate not found.</p>'; return; }

    el.innerHTML = `
      <div class="detail-header">
        <div>
          <div class="detail-name">${c.name || 'Unknown'}</div>
          <div class="detail-meta">
            ${c.location ? `<span class="badge badge--muted">${c.location}</span>` : ''}
            <span class="badge badge--muted">${c.yearsExperience || 0} yrs experience</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__section">
          <div class="section-label">Contact</div>
          <div class="grid-2 mt-16">
            <div class="cv-preview-field"><div class="cv-preview-field__label">Email</div><div class="cv-preview-field__value">${c.email || '—'}</div></div>
            <div class="cv-preview-field"><div class="cv-preview-field__label">Phone</div><div class="cv-preview-field__value">${c.phone || '—'}</div></div>
          </div>
        </div>

        <div class="card__section">
          <div class="section-label">Summary</div>
          <p class="text-body mt-12">${c.summary || 'No summary provided.'}</p>
        </div>

        <div class="card__section">
          <div class="section-label">Skills</div>
          <div class="cv-preview-skills mt-12">${(c.skills || []).map(s => `<span class="badge badge--accent">${s}</span>`).join('') || '—'}</div>
        </div>

        <div class="card__section">
          <div class="section-label">Experience</div>
          ${(c.experience || []).filter(e => e.role || e.company).map(e => `
            <div class="exp-block">
              <div style="font-weight:600;color:var(--ink)">${e.role || 'Role not specified'}</div>
              <div class="text-sm">${e.company || ''}${e.period ? ' · ' + e.period : ''}</div>
            </div>`).join('') || '<p class="text-sm mt-12">No experience listed.</p>'}
        </div>

        <div class="card__section">
          <div class="section-label">Education</div>
          ${(c.education || []).filter(e => e.degree || e.institution).map(e => `
            <div style="margin-top:12px">
              <div style="font-weight:600;color:var(--ink)">${e.degree || 'Degree not specified'}</div>
              <div class="text-sm">${e.institution || ''}${e.year ? ' · ' + e.year : ''}</div>
            </div>`).join('') || '<p class="text-sm mt-12">No education listed.</p>'}
        </div>
      </div>

      <div class="flex-end">
        <button class="btn btn--secondary" onclick="navigate('recruiter-job')">← Back to Rankings</button>
      </div>
    `;
  } catch (err) { console.error(err); el.innerHTML = '<p>Error loading candidate.</p>'; }
}


/* ═══════════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initUpload();
  initAuth();
});
