/* ═══════════════════════════════════════════════════════════════════════
   MATCHR — api.js
   ─────────────────────────────────────────────────────────────────────
   This is the ONLY file you need to edit when your backend is ready.
   
   Every function below returns mock data right now.
   Replace each one with a real fetch() call to your API.
   
   Your backend base URL (set this when ready):
   ═══════════════════════════════════════════════════════════════════════ */

const API_BASE = ''; // e.g. 'https://your-api.com'


/* ─── 1. PARSE CV ──────────────────────────────────────────────────────
   Called when:  Candidate uploads a file
   Replace with: POST ${API_BASE}/parse-cv  (multipart/form-data)
   Expected response: { name, email, phone, location, summary,
                         skills[], experience[], education[] }
   ──────────────────────────────────────────────────────────────────── */
async function parseCv(file) {
  // ── MOCK: Simulate 2s processing delay ──
  await new Promise(resolve => setTimeout(resolve, 2200));

  return {
    name: 'Jordan Mitchell',
    email: 'jordan.mitchell@email.com',
    phone: '+44 7700 123456',
    location: 'London, UK',
    summary: 'Full-stack engineer with 6 years of experience building scalable web applications. Proficient in React, Node.js, and cloud infrastructure. Passionate about clean architecture and developer experience.',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL', 'Python', 'CI/CD', 'Redis'],
    experience: [
      { role: 'Senior Frontend Engineer', company: 'Nexus Digital', period: '2022 – Present' },
      { role: 'Full Stack Developer', company: 'CloudBridge Ltd', period: '2019 – 2022' },
    ],
    education: [
      { degree: 'BSc Computer Science', institution: 'University of Edinburgh', year: '2018' },
    ],
  };

  // ── REAL VERSION (uncomment when ready): ──
  // const formData = new FormData();
  // formData.append('cv', file);
  // const res = await fetch(`${API_BASE}/parse-cv`, {
  //   method: 'POST',
  //   body: formData,
  // });
  // return res.json();
}


/* ─── 2. SUBMIT PROFILE ───────────────────────────────────────────────
   Called when:  Candidate confirms their edited NER data
   Replace with: POST ${API_BASE}/submit-profile  (JSON body)
   Expected response: { success: true, candidateId: '...' }
   ──────────────────────────────────────────────────────────────────── */
async function submitProfile(profileData) {
  // ── MOCK ──
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true, candidateId: 'mock-' + Date.now() };

  // ── REAL VERSION: ──
  // const res = await fetch(`${API_BASE}/submit-profile`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(profileData),
  // });
  // return res.json();
}


/* ─── 3. CREATE JOB ───────────────────────────────────────────────────
   Called when:  Recruiter publishes a new job post
   Replace with: POST ${API_BASE}/jobs  (JSON body)
   Expected response: { id, title, department, skills[], ... }
   ──────────────────────────────────────────────────────────────────── */
async function createJobPost(jobData) {
  // ── MOCK ──
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    ...jobData,
    id: Date.now(),
    applicants: 0,
    posted: 'Just now',
  };

  // ── REAL VERSION: ──
  // const res = await fetch(`${API_BASE}/jobs`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(jobData),
  // });
  // return res.json();
}


/* ─── 4. GET RANKINGS ─────────────────────────────────────────────────
   Called when:  Recruiter clicks a job to see matched candidates
   Replace with: GET ${API_BASE}/jobs/:jobId/rankings
   Expected response: [ { id, name, skills[], experience,
                           matchScore (0-100) }, ... ]
   ──────────────────────────────────────────────────────────────────── */
async function getRankings(jobId) {
  // ── MOCK ──
  await new Promise(resolve => setTimeout(resolve, 200));

  return [
    { id: 1, name: 'Jordan Mitchell',  skills: ['React','TypeScript','Node.js','AWS','Docker'],       experience: 6, matchScore: 94 },
    { id: 2, name: 'Priya Sharma',     skills: ['React','Python','PostgreSQL','GraphQL','AWS'],       experience: 4, matchScore: 87 },
    { id: 3, name: 'Alex Chen',        skills: ['Vue.js','TypeScript','Node.js','MongoDB','Docker'],  experience: 5, matchScore: 76 },
    { id: 4, name: 'Fatima Al-Rashid', skills: ['React','Java','Spring Boot','AWS','Kubernetes'],     experience: 8, matchScore: 71 },
    { id: 5, name: 'Marcus Johnson',   skills: ['Angular','C#','.NET','Azure','SQL Server'],          experience: 3, matchScore: 52 },
    { id: 6, name: 'Lena Kowalski',    skills: ['React','TypeScript','Figma','CSS','Storybook'],      experience: 2, matchScore: 48 },
  ];

  // ── REAL VERSION: ──
  // const res = await fetch(`${API_BASE}/jobs/${jobId}/rankings`);
  // return res.json();
}


/* ─── 5. GET JOBS ─────────────────────────────────────────────────────
   Called when:  Recruiter dashboard loads
   Replace with: GET ${API_BASE}/jobs
   Expected response: [ { id, title, department, skills[],
                           experienceMin, applicants, posted }, ... ]
   ──────────────────────────────────────────────────────────────────── */
async function getJobs() {
  // ── MOCK: Return from local state ──
  // (app.js manages this in-memory for now)
  return null; // signals app.js to use local state

  // ── REAL VERSION: ──
  // const res = await fetch(`${API_BASE}/jobs`);
  // return res.json();
}
