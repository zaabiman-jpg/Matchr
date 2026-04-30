/* ═══════════════════════════════════════════════════════════════════════
   MATCHR — api.js (Redesigned)
   ═══════════════════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyBExa8sMpYc6tG5KKZqZRDQ17l4jl1mRI4",
  authDomain: "matchr-be0bf.firebaseapp.com",
  projectId: "matchr-be0bf",
  storageBucket: "matchr-be0bf.firebasestorage.app",
  messagingSenderId: "185349239735",
  appId: "1:185349239735:web:14a820de53cb4ea4216e32",
  measurementId: "G-JCN5YRVYPQ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// const NER_API_URL = 'https://matchr-api.onrender.com/'; // e.g. 'http://localhost:5001'
const NER_API_URL = 'https://matchr-api-hm98.onrender.com'; 


/* ═══════════════════════════════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════════════════════════════ */

async function signUp(email, password, role, companyName) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  const userData = { email, role, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
  if (role === 'recruiter' && companyName) userData.companyName = companyName;
  await db.collection('users').doc(cred.user.uid).set(userData);
  return { user: cred.user, role, companyName: companyName || '' };
}

async function signIn(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  const userData = await getUserData(cred.user.uid);
  return { user: cred.user, role: userData.role, companyName: userData.companyName || '' };
}

async function logOut() { return auth.signOut(); }

async function getUserData(uid) {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : { role: null, companyName: '' };
}

function onAuthChange(callback) { auth.onAuthStateChanged(callback); }
function getCurrentUser() { return auth.currentUser; }


/* ═══════════════════════════════════════════════════════════════════════
   CV PARSING (Gemini NER)
   ═══════════════════════════════════════════════════════════════════════ */

async function parseCv(file) {
  if (NER_API_URL) {
    const formData = new FormData();
    formData.append('cv', file);
    const res = await fetch(`${NER_API_URL}/parse-cv`, { method: 'POST', body: formData });
    if (res.ok) return res.json();
    console.warn('NER API failed, falling back to manual entry');
  }
  await new Promise(r => setTimeout(r, 800));
  const user = auth.currentUser;
  return { name: '', email: user ? user.email : '', phone: '', location: '', summary: '', skills: [], yearsExperience: 0, experience: [{ role: '', company: '', period: '' }], education: [{ degree: '', institution: '', year: '' }] };
}


/* ═══════════════════════════════════════════════════════════════════════
   CANDIDATE PROFILE (save/get)
   ═══════════════════════════════════════════════════════════════════════ */

async function saveCandidate(profileData) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await db.collection('candidates').doc(user.uid).set({
    ...profileData, userId: user.uid, aiConsent: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { success: true };
}

async function getCandidate(uid) {
  const doc = await db.collection('candidates').doc(uid || auth.currentUser?.uid).get();
  return doc.exists ? doc.data() : null;
}


/* ═══════════════════════════════════════════════════════════════════════
   JOBS
   ═══════════════════════════════════════════════════════════════════════ */

async function createJobPost(jobData) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const userData = await getUserData(user.uid);
  const ref = await db.collection('jobs').add({
    ...jobData, recruiterId: user.uid,
    companyName: userData.companyName || 'Company',
    status: 'active',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { ...jobData, id: ref.id, companyName: userData.companyName || 'Company', status: 'active', posted: 'Just now' };
}

async function getRecruiterJobs(status) {
  const user = auth.currentUser;
  if (!user) return [];
  let query = db.collection('jobs').where('recruiterId', '==', user.uid);
  if (status) query = query.where('status', '==', status);
  const snapshot = await query.get();
  const jobs = [];
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const appCount = (await db.collection('applications').where('jobId', '==', doc.id).get()).size;
    jobs.push({ id: doc.id, title: d.title || '', department: d.department || '', description: d.description || '', skills: d.skills || [], experienceMin: d.experienceMin || 0, location: d.location || '', jobType: d.jobType || '', salary: d.salary || '', companyName: d.companyName || '', status: d.status || 'active', applicants: appCount, posted: timeAgo(d.createdAt) });
  }
  return jobs;
}

async function getAllActiveJobs() {
  const snapshot = await db.collection('jobs').where('status', '==', 'active').get();
  const user = auth.currentUser;
  let appliedJobIds = new Set();
  if (user) {
    const appSnap = await db.collection('applications').where('candidateId', '==', user.uid).get();
    appSnap.forEach(doc => appliedJobIds.add(doc.data().jobId));
  }
  return snapshot.docs.map(doc => {
    const d = doc.data();
    return { id: doc.id, title: d.title || '', department: d.department || '', description: d.description || '', skills: d.skills || [], experienceMin: d.experienceMin || 0, location: d.location || '', jobType: d.jobType || '', salary: d.salary || '', companyName: d.companyName || '', posted: timeAgo(d.createdAt), applied: appliedJobIds.has(doc.id) };
  });
}

async function getJobById(jobId) {
  const doc = await db.collection('jobs').doc(jobId).get();
  if (!doc.exists) return null;
  const d = doc.data();
  return { id: doc.id, ...d, posted: timeAgo(d.createdAt) };
}

async function archiveJob(jobId) {
  await db.collection('jobs').doc(jobId).update({ status: 'archived' });
}

async function reactivateJob(jobId) {
  await db.collection('jobs').doc(jobId).update({ status: 'active' });
}

async function updateJob(jobId, jobData) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await db.collection('jobs').doc(jobId).update({
    ...jobData,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { id: jobId, ...jobData };
}


/* ═══════════════════════════════════════════════════════════════════════
   APPLICATIONS
   ═══════════════════════════════════════════════════════════════════════ */

async function applyToJob(jobId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const docId = `${user.uid}_${jobId}`;
  await db.collection('applications').doc(docId).set({
    candidateId: user.uid, jobId,
    appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true };
}

async function hasApplied(jobId) {
  const user = auth.currentUser;
  if (!user) return false;
  const doc = await db.collection('applications').doc(`${user.uid}_${jobId}`).get();
  return doc.exists;
}


/* ═══════════════════════════════════════════════════════════════════════
   RANKINGS (applicants for a specific job, scored)
   ═══════════════════════════════════════════════════════════════════════ */

async function getJobApplicants(jobId) {
  const jobDoc = await db.collection('jobs').doc(jobId).get();
  if (!jobDoc.exists) return [];
  const job = jobDoc.data();

  const appSnap = await db.collection('applications').where('jobId', '==', jobId).get();
  const results = [];
  for (const appDoc of appSnap.docs) {
    const candidateId = appDoc.data().candidateId;
    const cDoc = await db.collection('candidates').doc(candidateId).get();
    if (!cDoc.exists) continue;
    const c = cDoc.data();
    results.push({
      id: candidateId, name: c.name || 'Unknown', skills: c.skills || [],
      experience: c.yearsExperience || 0, summary: c.summary || '',
      matchScore: calculateMatch(c, job),
    });
  }
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

async function getCandidateDetail(candidateId) {
  return await getCandidate(candidateId);
}


/* ═══════════════════════════════════════════════════════════════════════
   SHORTLISTS
   ═══════════════════════════════════════════════════════════════════════ */

async function addShortlist(candidateId, jobId) {
  const user = auth.currentUser;
  if (!user) return;
  await db.collection('shortlists').doc(`${user.uid}_${candidateId}_${jobId}`).set({
    recruiterId: user.uid, candidateId, jobId,
    shortlistedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function removeShortlist(candidateId, jobId) {
  const user = auth.currentUser;
  if (!user) return;
  await db.collection('shortlists').doc(`${user.uid}_${candidateId}_${jobId}`).delete();
}

async function getShortlists(jobId) {
  const user = auth.currentUser;
  if (!user) return new Set();
  const snapshot = await db.collection('shortlists')
    .where('recruiterId', '==', user.uid)
    .where('jobId', '==', jobId).get();
  const ids = new Set();
  snapshot.forEach(doc => ids.add(doc.data().candidateId));
  return ids;
}


/* ═══════════════════════════════════════════════════════════════════════
   SCORING — Skills 70% + Experience 20% + Completeness 10%
   ═══════════════════════════════════════════════════════════════════════ */

function calculateMatch(candidate, job) {
  let score = 0;
  const jobSkills = (job.skills || []).map(s => s.toLowerCase());
  const candSkills = (candidate.skills || []).map(s => s.toLowerCase());
  if (jobSkills.length > 0) {
    const matched = candSkills.filter(s => jobSkills.includes(s));
    score += Math.round((matched.length / jobSkills.length) * 70);
  }
  const req = job.experienceMin || 0;
  const has = candidate.yearsExperience || 0;
  score += req === 0 ? 20 : has >= req ? 20 : Math.round((has / req) * 20);
  let filled = 0;
  if (candidate.name) filled++;
  if (candidate.summary) filled++;
  if ((candidate.skills || []).length > 0) filled++;
  if ((candidate.experience || []).length > 0) filled++;
  if ((candidate.education || []).length > 0) filled++;
  score += Math.round((filled / 5) * 10);
  return Math.min(score, 100);
}


/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

function timeAgo(ts) {
  if (!ts) return 'Just now';
  try {
    const s = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    const d = Math.floor(s/86400);
    return d === 1 ? 'Yesterday' : `${d}d ago`;
  } catch { return 'Just now'; }
}
