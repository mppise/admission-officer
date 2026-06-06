// ─── localStorage Manager ─────────────────────────────────────────────────────

const StorageManager = {
  STUDENTS_KEY: 'ao_students',
  STUDENT_PREFIX: 'ao_student_',
  UNIVERSITIES_PREFIX: 'ao_uni_',

  getStudents() {
    const data = localStorage.getItem(this.STUDENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveStudents(students) {
    localStorage.setItem(this.STUDENTS_KEY, JSON.stringify(students));
  },

  createStudent(name) {
    const id = Date.now().toString();
    const students = this.getStudents();
    students.push(id);
    this.saveStudents(students);

    const studentData = this.emptyProfile(name);
    localStorage.setItem(this.STUDENT_PREFIX + id, JSON.stringify(studentData));
    return id;
  },

  getStudent(studentId) {
    const data = localStorage.getItem(this.STUDENT_PREFIX + studentId);
    return data ? JSON.parse(data) : null;
  },

  saveStudent(studentId, data) {
    localStorage.setItem(this.STUDENT_PREFIX + studentId, JSON.stringify(data));
  },

  deleteStudent(studentId) {
    const students = this.getStudents();
    const index = students.indexOf(studentId);
    if (index > -1) {
      students.splice(index, 1);
      this.saveStudents(students);
    }
    localStorage.removeItem(this.STUDENT_PREFIX + studentId);

    // Delete all universities for this student
    const universities = this.getUniversities(studentId);
    universities.forEach(uniId => {
      localStorage.removeItem(this.UNIVERSITIES_PREFIX + studentId + '_' + uniId);
    });
    localStorage.removeItem(this.UNIVERSITIES_PREFIX + studentId);
  },

  getUniversities(studentId) {
    const data = localStorage.getItem(this.UNIVERSITIES_PREFIX + studentId);
    return data ? JSON.parse(data) : [];
  },

  saveUniversities(studentId, universities) {
    localStorage.setItem(this.UNIVERSITIES_PREFIX + studentId, JSON.stringify(universities));
  },

  getUniversity(studentId, uniId) {
    const data = localStorage.getItem(this.UNIVERSITIES_PREFIX + studentId + '_' + uniId);
    return data ? JSON.parse(data) : null;
  },

  saveUniversity(studentId, uniId, data) {
    localStorage.setItem(this.UNIVERSITIES_PREFIX + studentId + '_' + uniId, JSON.stringify(data));

    const universities = this.getUniversities(studentId);
    if (!universities.includes(uniId)) {
      universities.push(uniId);
      this.saveUniversities(studentId, universities);
    }
  },

  deleteUniversity(studentId, uniId) {
    localStorage.removeItem(this.UNIVERSITIES_PREFIX + studentId + '_' + uniId);

    const universities = this.getUniversities(studentId);
    const index = universities.indexOf(uniId);
    if (index > -1) {
      universities.splice(index, 1);
      this.saveUniversities(studentId, universities);
    }
  },

  emptyProfile(name) {
    const now = new Date().toISOString().split('T')[0];
    return {
      name,
      gradYear: '',
      highSchool: '',
      intendedMajors: [],
      gpaWeighted: '',
      gpaUnweighted: '',
      classRank: '',
      transcript: [],
      sat: { total: '', math: '', reading: '' },
      act: { composite: '' },
      apScores: [],
      ibScores: [],
      extracurriculars: [],
      awards: [],
      shadowing: [],
      research: [],
      generatedDate: now,
      lastUpdated: now,
    };
  },

  emptyUniversity(name) {
    return {
      universityName: name,
      tagline: null,
      coreValues: [],
      mission: '',
      culture: '',
      academicSpecialties: [],
      notablePrograms: [],
      idealCandidateTraits: [],
      campusEthos: '',
      majorSpecificNotes: {},
      scrapedDate: new Date().toISOString().split('T')[0],
    };
  },
};

// ─── Global State ─────────────────────────────────────────────────────────────

let currentStudentId = null;
let currentUniversityId = null;

// ─── DOM Elements ──────────────────────────────────────────────────────────────

const elements = {
  studentList: document.getElementById('studentList'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  studentFormContainer: document.getElementById('studentFormContainer'),
  btnNewStudent: document.getElementById('btnNewStudent'),
  newStudentModal: new bootstrap.Modal(document.getElementById('newStudentModal')),
  btnCreateStudent: document.getElementById('btnCreateStudent'),
  newStudentName: document.getElementById('newStudentName'),
  studentProfileForm: document.getElementById('studentProfileForm'),
  universityForm: document.getElementById('universityForm'),
  btnDeleteStudent: document.getElementById('btnDeleteStudent'),
  btnScrapeUniversity: document.getElementById('btnScrapeUniversity'),
  btnDeleteUniversity: document.getElementById('btnDeleteUniversity'),
  universityDomain: document.getElementById('universityDomain'),
  universitiesList: document.getElementById('universitiesList'),
  universityFormContainer: document.getElementById('universityFormContainer'),
  universityNameDisplay: document.getElementById('universityNameDisplay'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  loadingText: document.getElementById('loadingText'),
  btnExportStudentPdf: document.getElementById('btnExportStudentPdf'),
  btnExportUniversityPdf: document.getElementById('btnExportUniversityPdf'),
  btnGenerateGuidance: document.getElementById('btnGenerateGuidance'),
  btnGenerateEssayGuidance: document.getElementById('btnGenerateEssayGuidance'),
  essayPrompt: document.getElementById('essayPrompt'),
  essayWordLimit: document.getElementById('essayWordLimit'),
  guidanceContainer: document.getElementById('guidanceContainer'),
  guidanceContent: document.getElementById('guidanceContent'),
  essayGuidanceList: document.getElementById('essayGuidanceList'),
  btnExportGuidancePdf: document.getElementById('btnExportGuidancePdf'),
  btnExportAllEssaysPdf: document.getElementById('btnExportAllEssaysPdf'),
};

// ─── Initialization ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderStudentList();
});

function setupEventListeners() {
  // Student Management
  elements.btnNewStudent.addEventListener('click', () => {
    elements.newStudentName.value = '';
    elements.newStudentModal.show();
  });

  elements.btnCreateStudent.addEventListener('click', () => {
    const name = elements.newStudentName.value.trim();
    if (!name) {
      alert('Please enter a student name');
      return;
    }
    const studentId = StorageManager.createStudent(name);
    elements.newStudentModal.hide();
    renderStudentList();
    selectStudent(studentId);
  });

  elements.newStudentName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.btnCreateStudent.click();
  });

  // Delete Student
  elements.btnDeleteStudent.addEventListener('click', () => {
    if (confirm(`Delete "${StorageManager.getStudent(currentStudentId).name}" and all associated data?`)) {
      StorageManager.deleteStudent(currentStudentId);
      currentStudentId = null;
      currentUniversityId = null;
      renderStudentList();
      showWelcomeScreen();
    }
  });

  // University Scraping
  elements.btnScrapeUniversity.addEventListener('click', scrapeUniversity);

  // Delete University
  elements.btnDeleteUniversity.addEventListener('click', () => {
    const uni = StorageManager.getUniversity(currentStudentId, currentUniversityId);
    if (confirm(`Delete university "${uni.universityName}"?`)) {
      StorageManager.deleteUniversity(currentStudentId, currentUniversityId);
      currentUniversityId = null;
      renderUniversitiesList();
      elements.universityFormContainer.style.display = 'none';
    }
  });

  // Profile Form Auto-save
  setupAutoSave('studentProfileForm', () => {
    const data = getStudentFormData();
    StorageManager.saveStudent(currentStudentId, data);
  });

  // University Form Auto-save
  setupAutoSave('universityForm', () => {
    const data = getUniversityFormData();
    StorageManager.saveUniversity(currentStudentId, currentUniversityId, data);
  });

  // Array field handlers
  setupArrayFieldHandlers();

  // Export buttons
  elements.btnExportStudentPdf.addEventListener('click', exportStudentPdf);
  elements.btnExportUniversityPdf.addEventListener('click', exportUniversityPdf);

  // Guidance buttons
  elements.btnGenerateGuidance.addEventListener('click', generateGuidance);
  elements.btnGenerateEssayGuidance.addEventListener('click', generateEssayGuidance);
  elements.btnExportGuidancePdf.addEventListener('click', exportGuidancePdf);
  elements.btnExportAllEssaysPdf.addEventListener('click', exportAllEssaysPdf);
}

function setupAutoSave(formId, saveCallback) {
  const form = document.getElementById(formId);
  if (!form) return;

  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      saveCallback();
    });
  });
}

// ─── Student List Rendering ───────────────────────────────────────────────────

function renderStudentList() {
  const students = StorageManager.getStudents();

  if (students.length === 0) {
    elements.studentList.innerHTML = '<p class="text-muted text-center py-3">No students yet</p>';
    return;
  }

  elements.studentList.innerHTML = students.map(id => {
    const student = StorageManager.getStudent(id);
    const isActive = id === currentStudentId;
    return `
      <div class="list-group-item student-list-item ${isActive ? 'active' : ''}"
           onclick="selectStudent('${id}')" style="padding: 1rem; border-bottom: 1px solid #e5e7eb;">
        <div class="fw-500">${student.name}</div>
        <small class="text-muted">Grad: ${student.gradYear || '—'}</small>
      </div>
    `;
  }).join('');
}

function selectStudent(studentId) {
  currentStudentId = studentId;
  currentUniversityId = null;
  renderStudentList();
  loadStudentForm();
  elements.studentFormContainer.style.display = 'block';
  elements.welcomeScreen.style.display = 'none';
}

function showWelcomeScreen() {
  elements.studentFormContainer.style.display = 'none';
  elements.welcomeScreen.style.display = 'block';
}

// ─── Student Form Loading & Saving ────────────────────────────────────────────

function loadStudentForm() {
  const student = StorageManager.getStudent(currentStudentId);

  document.getElementById('name').value = student.name || '';
  document.getElementById('gradYear').value = student.gradYear || '';
  document.getElementById('highSchool').value = student.highSchool || '';
  document.getElementById('gpaWeighted').value = student.gpaWeighted || '';
  document.getElementById('gpaUnweighted').value = student.gpaUnweighted || '';
  document.getElementById('classRank').value = student.classRank || '';
  document.getElementById('satTotal').value = student.sat?.total || '';
  document.getElementById('satMath').value = student.sat?.math || '';
  document.getElementById('satReading').value = student.sat?.reading || '';
  document.getElementById('actComposite').value = student.act?.composite || '';

  renderMajorsList(student.intendedMajors || []);
  renderApScoresList(student.apScores || []);
  renderIbScoresList(student.ibScores || []);
  renderExtracurricularsList(student.extracurriculars || []);
  renderAwardsList(student.awards || []);
  renderShadowingList(student.shadowing || []);
  renderResearchList(student.research || []);

  renderUniversitiesList();
}

function getStudentFormData() {
  return {
    name: document.getElementById('name').value || 'Unnamed',
    gradYear: document.getElementById('gradYear').value,
    highSchool: document.getElementById('highSchool').value,
    intendedMajors: getMajorsListData(),
    gpaWeighted: document.getElementById('gpaWeighted').value,
    gpaUnweighted: document.getElementById('gpaUnweighted').value,
    classRank: document.getElementById('classRank').value,
    transcript: [],
    sat: {
      total: document.getElementById('satTotal').value,
      math: document.getElementById('satMath').value,
      reading: document.getElementById('satReading').value,
    },
    act: {
      composite: document.getElementById('actComposite').value,
    },
    apScores: getApScoresListData(),
    ibScores: getIbScoresListData(),
    extracurriculars: getExtracurricularsListData(),
    awards: getAwardsListData(),
    shadowing: getShadowingListData(),
    research: getResearchListData(),
    generatedDate: StorageManager.getStudent(currentStudentId).generatedDate,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

// ─── Array Field Handlers (Majors, Scores, etc.) ────────────────────────────

function setupArrayFieldHandlers() {
  document.getElementById('btnAddMajor').addEventListener('click', () => {
    const input = document.getElementById('majorInput');
    const majors = getMajorsListData();
    majors.push(input.value);
    renderMajorsList(majors);
    input.value = '';
  });

  document.getElementById('btnAddAp').addEventListener('click', () => {
    const subject = document.getElementById('apSubject').value;
    const score = document.getElementById('apScore').value;
    if (subject && score) {
      const scores = getApScoresListData();
      scores.push({ subject, score });
      renderApScoresList(scores);
      document.getElementById('apSubject').value = '';
      document.getElementById('apScore').value = '';
    }
  });

  document.getElementById('btnAddIb').addEventListener('click', () => {
    const subject = document.getElementById('ibSubject').value;
    const score = document.getElementById('ibScore').value;
    if (subject && score) {
      const scores = getIbScoresListData();
      scores.push({ subject, score });
      renderIbScoresList(scores);
      document.getElementById('ibSubject').value = '';
      document.getElementById('ibScore').value = '';
    }
  });

  document.getElementById('btnAddExtracurricular').addEventListener('click', () => {
    const list = getExtracurricularsListData();
    list.push({ activityName: '', role: '', yearsInvolved: '', hoursPerWeek: '', description: '' });
    renderExtracurricularsList(list);
  });

  document.getElementById('btnAddAward').addEventListener('click', () => {
    const list = getAwardsListData();
    list.push({ awardName: '', level: '', year: '', description: '' });
    renderAwardsList(list);
  });

  document.getElementById('btnAddShadowing').addEventListener('click', () => {
    const list = getShadowingListData();
    list.push({ organization: '', field: '', hoursTotal: '', period: '', description: '' });
    renderShadowingList(list);
  });

  document.getElementById('btnAddResearch').addEventListener('click', () => {
    const list = getResearchListData();
    list.push({ projectTitle: '', institution: '', mentorName: '', period: '', hoursPerWeek: '', description: '' });
    renderResearchList(list);
  });
}

// ─── Render List Functions ────────────────────────────────────────────────────

function renderMajorsList(majors) {
  const container = document.getElementById('majorsList');
  container.innerHTML = majors.map((major, idx) => `
    <span class="badge-section">
      ${major}
      <button type="button" class="btn-close btn-close-white" style="font-size: 0.7rem;"
              onclick="removeMajor(${idx})"></button>
    </span>
  `).join('');
}

function removeMajor(idx) {
  const majors = getMajorsListData();
  majors.splice(idx, 1);
  renderMajorsList(majors);
}

function getMajorsListData() {
  const container = document.getElementById('majorsList');
  return Array.from(container.querySelectorAll('.badge-section')).map(badge =>
    badge.textContent.trim().split('\n')[0]
  );
}

function renderApScoresList(scores) {
  const container = document.getElementById('apScoresList');
  container.innerHTML = scores.map((item, idx) => `
    <div class="array-item">
      <div class="array-item-content">
        <strong>${item.subject}</strong> - Score: ${item.score}
      </div>
      <button type="button" class="btn btn-sm btn-danger array-item-btn" onclick="removeApScore(${idx})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function removeApScore(idx) {
  const scores = getApScoresListData();
  scores.splice(idx, 1);
  renderApScoresList(scores);
}

function getApScoresListData() {
  const items = [];
  document.querySelectorAll('#apScoresList .array-item').forEach(item => {
    const text = item.querySelector('.array-item-content').textContent;
    const match = text.match(/^(.+?)\s*-\s*Score:\s*(.+)$/);
    if (match) {
      items.push({ subject: match[1].trim(), score: match[2].trim() });
    }
  });
  return items;
}

function renderIbScoresList(scores) {
  const container = document.getElementById('ibScoresList');
  container.innerHTML = scores.map((item, idx) => `
    <div class="array-item">
      <div class="array-item-content">
        <strong>${item.subject}</strong> - Score: ${item.score}
      </div>
      <button type="button" class="btn btn-sm btn-danger array-item-btn" onclick="removeIbScore(${idx})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function removeIbScore(idx) {
  const scores = getIbScoresListData();
  scores.splice(idx, 1);
  renderIbScoresList(scores);
}

function getIbScoresListData() {
  const items = [];
  document.querySelectorAll('#ibScoresList .array-item').forEach(item => {
    const text = item.querySelector('.array-item-content').textContent;
    const match = text.match(/^(.+?)\s*-\s*Score:\s*(.+)$/);
    if (match) {
      items.push({ subject: match[1].trim(), score: match[2].trim() });
    }
  });
  return items;
}

function renderExtracurricularsList(items) {
  const container = document.getElementById('extracurricularsList');
  container.innerHTML = items.map((item, idx) => `
    <div class="array-item">
      <div class="array-item-content">
        <strong>${item.activityName || 'Unnamed'}</strong><br>
        <small>Role: ${item.role || '—'} | Years: ${item.yearsInvolved || '—'} | Hours/week: ${item.hoursPerWeek || '—'}</small><br>
        <small>${item.description || ''}</small>
      </div>
      <button type="button" class="btn btn-sm btn-danger array-item-btn" onclick="removeExtracurricular(${idx})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function removeExtracurricular(idx) {
  const items = getExtracurricularsListData();
  items.splice(idx, 1);
  renderExtracurricularsList(items);
}

function getExtracurricularsListData() {
  const items = [];
  document.querySelectorAll('#extracurricularsList .array-item').forEach(item => {
    const content = item.querySelector('.array-item-content');
    items.push({
      activityName: content.querySelector('strong')?.textContent || '',
      role: content.textContent.match(/Role:\s*([^|]*)/)?.[1]?.trim() || '',
      yearsInvolved: content.textContent.match(/Years:\s*([^|]*)/)?.[1]?.trim() || '',
      hoursPerWeek: content.textContent.match(/Hours\/week:\s*([^\n]*)/)?.[1]?.trim() || '',
      description: Array.from(content.querySelectorAll('small')).pop()?.textContent || '',
    });
  });
  return items;
}

function renderAwardsList(items) {
  const container = document.getElementById('awardsList');
  container.innerHTML = items.map((item, idx) => `
    <div class="array-item">
      <div class="array-item-content">
        <strong>${item.awardName || 'Unnamed Award'}</strong><br>
        <small>Level: ${item.level || '—'} | Year: ${item.year || '—'}</small><br>
        <small>${item.description || ''}</small>
      </div>
      <button type="button" class="btn btn-sm btn-danger array-item-btn" onclick="removeAward(${idx})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function removeAward(idx) {
  const items = getAwardsListData();
  items.splice(idx, 1);
  renderAwardsList(items);
}

function getAwardsListData() {
  const items = [];
  document.querySelectorAll('#awardsList .array-item').forEach(item => {
    const content = item.querySelector('.array-item-content');
    items.push({
      awardName: content.querySelector('strong')?.textContent || '',
      level: content.textContent.match(/Level:\s*([^|]*)/)?.[1]?.trim() || '',
      year: content.textContent.match(/Year:\s*([^\n]*)/)?.[1]?.trim() || '',
      description: Array.from(content.querySelectorAll('small')).pop()?.textContent || '',
    });
  });
  return items;
}

function renderShadowingList(items) {
  const container = document.getElementById('shadowingList');
  container.innerHTML = items.map((item, idx) => `
    <div class="array-item">
      <div class="array-item-content">
        <strong>${item.organization || 'Unnamed'}</strong><br>
        <small>Field: ${item.field || '—'} | Hours: ${item.hoursTotal || '—'} | Period: ${item.period || '—'}</small><br>
        <small>${item.description || ''}</small>
      </div>
      <button type="button" class="btn btn-sm btn-danger array-item-btn" onclick="removeShadowing(${idx})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function removeShadowing(idx) {
  const items = getShadowingListData();
  items.splice(idx, 1);
  renderShadowingList(items);
}

function getShadowingListData() {
  const items = [];
  document.querySelectorAll('#shadowingList .array-item').forEach(item => {
    const content = item.querySelector('.array-item-content');
    items.push({
      organization: content.querySelector('strong')?.textContent || '',
      field: content.textContent.match(/Field:\s*([^|]*)/)?.[1]?.trim() || '',
      hoursTotal: content.textContent.match(/Hours:\s*([^|]*)/)?.[1]?.trim() || '',
      period: content.textContent.match(/Period:\s*([^\n]*)/)?.[1]?.trim() || '',
      description: Array.from(content.querySelectorAll('small')).pop()?.textContent || '',
    });
  });
  return items;
}

function renderResearchList(items) {
  const container = document.getElementById('researchList');
  container.innerHTML = items.map((item, idx) => `
    <div class="array-item">
      <div class="array-item-content">
        <strong>${item.projectTitle || 'Unnamed Project'}</strong><br>
        <small>Institution: ${item.institution || '—'} | Mentor: ${item.mentorName || '—'}</small><br>
        <small>Period: ${item.period || '—'} | Hours/week: ${item.hoursPerWeek || '—'}</small><br>
        <small>${item.description || ''}</small>
      </div>
      <button type="button" class="btn btn-sm btn-danger array-item-btn" onclick="removeResearch(${idx})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

function removeResearch(idx) {
  const items = getResearchListData();
  items.splice(idx, 1);
  renderResearchList(items);
}

function getResearchListData() {
  const items = [];
  document.querySelectorAll('#researchList .array-item').forEach(item => {
    const content = item.querySelector('.array-item-content');
    const lines = content.innerHTML.split('<br>').map(l => l.trim());
    items.push({
      projectTitle: content.querySelector('strong')?.textContent || '',
      institution: lines[1]?.match(/Institution:\s*([^|]*)/)?.[1]?.trim() || '',
      mentorName: lines[1]?.match(/Mentor:\s*([^\n]*)/)?.[1]?.trim() || '',
      period: lines[2]?.match(/Period:\s*([^|]*)/)?.[1]?.trim() || '',
      hoursPerWeek: lines[2]?.match(/Hours\/week:\s*([^\n]*)/)?.[1]?.trim() || '',
      description: Array.from(content.querySelectorAll('small')).pop()?.textContent || '',
    });
  });
  return items;
}

// ─── University Functions ──────────────────────────────────────────────────────

async function scrapeUniversity() {
  const domain = elements.universityDomain.value.trim();
  if (!domain) {
    alert('Please enter a university domain');
    return;
  }

  const student = StorageManager.getStudent(currentStudentId);
  const intendedMajors = getMajorsListData();

  // Show progress tracking UI
  const progressDiv = document.getElementById('scrapeProgress');
  const progressBar = document.getElementById('progressBar');
  const progressPercentage = document.getElementById('progressPercentage');
  const progressStatus = document.getElementById('progressStatus');
  const progressDetails = document.getElementById('progressDetails');

  progressDiv.style.display = 'block';
  progressBar.style.width = '0%';
  progressPercentage.textContent = '0%';
  progressStatus.textContent = 'Starting scrape...';
  progressDetails.innerHTML = '';

  // Disable the scrape button
  elements.btnScrapeUniversity.disabled = true;

  try {
    const response = await fetch('/api/scrape-university-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, intendedMajors }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let universityData = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'complete') {
              universityData = data.data;
              progressBar.style.width = '100%';
              progressPercentage.textContent = '100%';
              progressStatus.textContent = '✓ Scraping complete!';
            } else if (data.type === 'error') {
              throw new Error(data.message);
            } else {
              // Progress update
              const { stage, pagesProcessed, totalPages, currentPage, status } = data;

              if (stage === 'crawling' && pagesProcessed !== undefined && totalPages !== undefined) {
                const percentage = Math.round((pagesProcessed / totalPages) * 100);
                progressBar.style.width = percentage + '%';
                progressPercentage.textContent = percentage + '%';
                progressStatus.textContent = `Crawling: ${pagesProcessed}/${totalPages} pages`;

                if (currentPage) {
                  const pageUrl = new URL(currentPage).pathname || currentPage;
                  progressDetails.innerHTML = `<div>Loading: ${pageUrl}</div>`;
                }
              } else if (stage === 'extracting') {
                progressBar.style.width = '100%';
                progressPercentage.textContent = '100%';
                progressStatus.textContent = `Extracting: ${status || 'Processing...'}`;
                progressDetails.innerHTML = `<div>${status || 'Analyzing scraped content...'}</div>`;
              }
            }
          } catch (e) {
            console.error('Error parsing progress data:', e, line);
          }
        }
      }
    }

    if (universityData) {
      const uniId = Date.now().toString();
      StorageManager.saveUniversity(currentStudentId, uniId, universityData);
      elements.universityDomain.value = '';

      // Hide progress after a short delay
      setTimeout(() => {
        progressDiv.style.display = 'none';
        renderUniversitiesList();
        selectUniversity(uniId);
      }, 1000);
    } else {
      throw new Error('No data received from scraper');
    }
  } catch (error) {
    alert('Error scraping university: ' + error.message);
    console.error(error);
    progressDiv.style.display = 'none';
  } finally {
    elements.btnScrapeUniversity.disabled = false;
  }
}

function renderUniversitiesList() {
  const universities = StorageManager.getUniversities(currentStudentId);
  const container = elements.universitiesList;

  if (universities.length === 0) {
    container.innerHTML = '<p class="text-muted">No universities added yet</p>';
    elements.btnExportUniversityPdf.disabled = true;
    return;
  }

  container.innerHTML = universities.map(uniId => {
    const uni = StorageManager.getUniversity(currentStudentId, uniId);
    const isExpanded = uniId === currentUniversityId;
    return `
      <div class="list-group-item" style="padding: 0.75rem; cursor: pointer; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; background: ${isExpanded ? '#eff6ff' : '#fff'}; border-left: 4px solid ${isExpanded ? '#4f46e5' : 'transparent'}; transition: all 0.2s;"
           onclick="toggleUniversity('${uniId}')">
        <div style="flex: 1;">
          <strong>${uni.universityName || 'Unnamed University'}</strong>
          <small class="text-muted d-block">${uni.tagline || 'No tagline'}</small>
        </div>
        <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}" style="margin-left: 1rem; color: #9ca3af; font-size: 1.2rem;"></i>
      </div>
    `;
  }).join('');

  if (universities.length > 0) {
    elements.btnExportUniversityPdf.disabled = false;
  }
}

function toggleUniversity(uniId) {
  // If clicking the same university, collapse it; otherwise expand it
  if (currentUniversityId === uniId) {
    currentUniversityId = null;
    elements.universityFormContainer.style.display = 'none';
  } else {
    selectUniversity(uniId);
  }
}

function selectUniversity(uniId) {
  currentUniversityId = uniId;
  renderUniversitiesList();
  loadUniversityForm();
  // Enable guidance buttons when university is selected
  elements.btnGenerateGuidance.disabled = false;
  elements.btnGenerateEssayGuidance.disabled = false;
}

function loadUniversityForm() {
  const uni = StorageManager.getUniversity(currentStudentId, currentUniversityId);

  elements.universityNameDisplay.textContent = uni.universityName || 'University Profile';
  document.getElementById('uniTagline').value = uni.tagline || '';
  document.getElementById('uniMission').value = uni.mission || '';
  document.getElementById('uniCulture').value = uni.culture || '';
  document.getElementById('uniCampusEthos').value = uni.campusEthos || '';

  renderUniCoreValuesList(uni.coreValues || []);
  renderUniSpecialtiesList(uni.academicSpecialties || []);
  renderUniProgramsList(uni.notablePrograms || []);
  renderUniTraitsList(uni.idealCandidateTraits || []);
  renderUniMajorNotes(uni.majorSpecificNotes || {});

  elements.universityFormContainer.style.display = 'block';
}

function getUniversityFormData() {
  return {
    universityName: StorageManager.getUniversity(currentStudentId, currentUniversityId).universityName,
    tagline: document.getElementById('uniTagline').value || null,
    coreValues: getUniCoreValuesData(),
    mission: document.getElementById('uniMission').value,
    culture: document.getElementById('uniCulture').value,
    academicSpecialties: getUniSpecialtiesData(),
    notablePrograms: getUniProgramsData(),
    idealCandidateTraits: getUniTraitsData(),
    campusEthos: document.getElementById('uniCampusEthos').value,
    majorSpecificNotes: getUniMajorNotesData(),
    scrapedDate: StorageManager.getUniversity(currentStudentId, currentUniversityId).scrapedDate,
  };
}

function renderUniCoreValuesList(values) {
  const container = document.getElementById('uniCoreValuesList');
  container.innerHTML = values.map((val, idx) => `
    <span class="badge-section">
      ${val}
      <button type="button" class="btn-close btn-close-white" style="font-size: 0.7rem;"
              onclick="removeUniCoreValue(${idx})"></button>
    </span>
  `).join('');
}

function removeUniCoreValue(idx) {
  const values = getUniCoreValuesData();
  values.splice(idx, 1);
  renderUniCoreValuesList(values);
}

function getUniCoreValuesData() {
  return Array.from(document.querySelectorAll('#uniCoreValuesList .badge-section')).map(badge =>
    badge.textContent.trim().split('\n')[0]
  );
}

function renderUniSpecialtiesList(values) {
  const container = document.getElementById('uniSpecialtiesList');
  container.innerHTML = values.map((val, idx) => `
    <span class="badge-section">
      ${val}
      <button type="button" class="btn-close btn-close-white" style="font-size: 0.7rem;"
              onclick="removeUniSpecialty(${idx})"></button>
    </span>
  `).join('');
}

function removeUniSpecialty(idx) {
  const values = getUniSpecialtiesData();
  values.splice(idx, 1);
  renderUniSpecialtiesList(values);
}

function getUniSpecialtiesData() {
  return Array.from(document.querySelectorAll('#uniSpecialtiesList .badge-section')).map(badge =>
    badge.textContent.trim().split('\n')[0]
  );
}

function renderUniProgramsList(values) {
  const container = document.getElementById('uniProgramsList');
  container.innerHTML = values.map((val, idx) => `
    <span class="badge-section">
      ${val}
      <button type="button" class="btn-close btn-close-white" style="font-size: 0.7rem;"
              onclick="removeUniProgram(${idx})"></button>
    </span>
  `).join('');
}

function removeUniProgram(idx) {
  const values = getUniProgramsData();
  values.splice(idx, 1);
  renderUniProgramsList(values);
}

function getUniProgramsData() {
  return Array.from(document.querySelectorAll('#uniProgramsList .badge-section')).map(badge =>
    badge.textContent.trim().split('\n')[0]
  );
}

function renderUniTraitsList(values) {
  const container = document.getElementById('uniTraitsList');
  container.innerHTML = values.map((val, idx) => `
    <span class="badge-section">
      ${val}
      <button type="button" class="btn-close btn-close-white" style="font-size: 0.7rem;"
              onclick="removeUniTrait(${idx})"></button>
    </span>
  `).join('');
}

function removeUniTrait(idx) {
  const values = getUniTraitsData();
  values.splice(idx, 1);
  renderUniTraitsList(values);
}

function getUniTraitsData() {
  return Array.from(document.querySelectorAll('#uniTraitsList .badge-section')).map(badge =>
    badge.textContent.trim().split('\n')[0]
  );
}

function renderUniMajorNotes(notes) {
  const container = document.getElementById('uniMajorNotesContainer');
  const majorKeys = Object.keys(notes);

  if (majorKeys.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="section-header">
      <h5>Major-Specific Notes</h5>
    </div>
    ${majorKeys.map(major => `
      <div class="mb-3">
        <label class="form-label">${major}</label>
        <textarea class="form-control uni-major-note" data-major="${major}" rows="2">${notes[major] || ''}</textarea>
      </div>
    `).join('')}
  `;

  container.querySelectorAll('.uni-major-note').forEach(textarea => {
    textarea.addEventListener('blur', () => {
      const major = textarea.dataset.major;
      const value = textarea.value;
      const notes = getUniMajorNotesData();
      notes[major] = value || null;
      // Save happens via form blur listener
    });
  });
}

function getUniMajorNotesData() {
  const notes = {};
  document.querySelectorAll('.uni-major-note').forEach(textarea => {
    const major = textarea.dataset.major;
    notes[major] = textarea.value || null;
  });
  return notes;
}

// ─── Array field handlers for universities ────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btnAddCoreValue') {
      const input = document.getElementById('uniCoreValueInput');
      const values = getUniCoreValuesData();
      if (input.value) {
        values.push(input.value);
        renderUniCoreValuesList(values);
        input.value = '';
      }
    }
    if (e.target.id === 'btnAddSpecialty') {
      const input = document.getElementById('uniSpecialtyInput');
      const values = getUniSpecialtiesData();
      if (input.value) {
        values.push(input.value);
        renderUniSpecialtiesList(values);
        input.value = '';
      }
    }
    if (e.target.id === 'btnAddProgram') {
      const input = document.getElementById('uniProgramInput');
      const values = getUniProgramsData();
      if (input.value) {
        values.push(input.value);
        renderUniProgramsList(values);
        input.value = '';
      }
    }
    if (e.target.id === 'btnAddTrait') {
      const input = document.getElementById('uniTraitInput');
      const values = getUniTraitsData();
      if (input.value) {
        values.push(input.value);
        renderUniTraitsList(values);
        input.value = '';
      }
    }
  });
});

// ─── PDF Export ────────────────────────────────────────────────────────────────

function exportStudentPdf() {
  const student = StorageManager.getStudent(currentStudentId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let yOffset = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(79, 70, 229);
  doc.text('Student Profile', 20, yOffset);
  yOffset += 12;

  // Subtitle with date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yOffset);
  yOffset += 12;

  // Divider line
  doc.setDrawColor(230, 230, 230);
  doc.line(20, yOffset - 2, 190, yOffset - 2);
  yOffset += 8;

  doc.setFontSize(11);
  doc.setTextColor(80);

  // Helper function to add section
  const addSection = (title) => {
    if (yOffset > 270) {
      doc.addPage();
      yOffset = 20;
    }
    doc.setFontSize(13);
    doc.setTextColor(79, 70, 229);
    doc.text(title, 20, yOffset);
    yOffset += 8;
    doc.setDrawColor(230, 230, 230);
    doc.line(20, yOffset - 2, 190, yOffset - 2);
    yOffset += 6;
    doc.setFontSize(10);
    doc.setTextColor(0);
  };

  // Personal Information
  addSection('PERSONAL INFORMATION');
  const personalInfo = [
    `Name: ${student.name}`,
    `Graduation Year: ${student.gradYear || '—'}`,
    `High School: ${student.highSchool || '—'}`,
    `Intended Majors: ${(student.intendedMajors || []).join(', ') || '—'}`,
  ];
  personalInfo.forEach(line => {
    doc.text(line, 25, yOffset);
    yOffset += 6;
  });
  yOffset += 5;

  // Academic Information
  addSection('ACADEMIC INFORMATION');
  const academicInfo = [
    `Weighted GPA: ${student.gpaWeighted || '—'}`,
    `Unweighted GPA: ${student.gpaUnweighted || '—'}`,
    `Class Rank: ${student.classRank || '—'}`,
  ];
  academicInfo.forEach(line => {
    doc.text(line, 25, yOffset);
    yOffset += 6;
  });
  yOffset += 5;

  // Test Scores
  addSection('STANDARDIZED TESTS');
  const testInfo = [
    `SAT Total: ${student.sat?.total || '—'} (Math: ${student.sat?.math || '—'}, Reading: ${student.sat?.reading || '—'})`,
    `ACT Composite: ${student.act?.composite || '—'}`,
  ];
  testInfo.forEach(line => {
    doc.text(line, 25, yOffset);
    yOffset += 6;
  });

  // AP Scores
  if (student.apScores && student.apScores.length > 0) {
    yOffset += 5;
    addSection('AP SCORES');
    student.apScores.forEach(score => {
      doc.text(`${score.subject}: ${score.score}`, 25, yOffset);
      yOffset += 5;
    });
  }

  // Extracurriculars
  if (student.extracurriculars && student.extracurriculars.length > 0) {
    yOffset += 5;
    addSection('EXTRACURRICULAR ACTIVITIES');
    student.extracurriculars.forEach(activity => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text(`${activity.activityName}`, 25, yOffset);
      yOffset += 5;
      doc.setFont(undefined, 'normal');
      if (activity.description) {
        const lines = doc.splitTextToSize(activity.description, 145);
        lines.forEach(line => {
          doc.text(line, 30, yOffset);
          yOffset += 4;
        });
      }
      yOffset += 2;
    });
  }

  // About/Personal Statement
  if (student.about) {
    yOffset += 5;
    addSection('ABOUT');
    const aboutLines = doc.splitTextToSize(student.about, 165);
    aboutLines.forEach(line => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(line, 25, yOffset);
      yOffset += 5;
    });
  }

  // Awards & Honors
  if (student.awards && student.awards.length > 0) {
    yOffset += 5;
    addSection('AWARDS & HONORS');
    student.awards.forEach(award => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`${award.awardName}`, 25, yOffset);
      yOffset += 5;
      doc.setFont(undefined, 'normal');
      if (award.description) {
        const lines = doc.splitTextToSize(award.description, 145);
        lines.forEach(line => {
          doc.text(line, 30, yOffset);
          yOffset += 4;
        });
      }
      yOffset += 2;
    });
  }

  // Essays
  if (student.essays && student.essays.length > 0) {
    yOffset += 5;
    addSection('ESSAYS');
    student.essays.forEach(essay => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`${essay.essayType}`, 25, yOffset);
      yOffset += 5;
      doc.setFont(undefined, 'normal');
      if (essay.essayContent) {
        const lines = doc.splitTextToSize(essay.essayContent, 145);
        lines.forEach(line => {
          doc.text(line, 30, yOffset);
          yOffset += 4;
        });
      }
      yOffset += 2;
    });
  }

  // Volunteer Work
  if (student.volunteering && student.volunteering.length > 0) {
    yOffset += 5;
    addSection('VOLUNTEER WORK');
    student.volunteering.forEach(volunteer => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`${volunteer.organizationName}`, 25, yOffset);
      yOffset += 5;
      doc.setFont(undefined, 'normal');
      if (volunteer.description) {
        const lines = doc.splitTextToSize(volunteer.description, 145);
        lines.forEach(line => {
          doc.text(line, 30, yOffset);
          yOffset += 4;
        });
      }
      yOffset += 2;
    });
  }

  // Work Experience
  if (student.workExperience && student.workExperience.length > 0) {
    yOffset += 5;
    addSection('WORK EXPERIENCE');
    student.workExperience.forEach(work => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`${work.position}`, 25, yOffset);
      yOffset += 5;
      doc.setFont(undefined, 'normal');
      if (work.description) {
        const lines = doc.splitTextToSize(work.description, 145);
        lines.forEach(line => {
          doc.text(line, 30, yOffset);
          yOffset += 4;
        });
      }
      yOffset += 2;
    });
  }

  doc.save(`${student.name}_profile.pdf`);
}

function exportUniversityPdf() {
  if (!currentUniversityId) {
    alert('Please select a university first');
    return;
  }

  const uni = StorageManager.getUniversity(currentStudentId, currentUniversityId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let yOffset = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(79, 70, 229);
  doc.text(uni.universityName, 20, yOffset);
  yOffset += 12;

  // Tagline
  if (uni.tagline) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.setFont(undefined, 'italic');
    const taglineLines = doc.splitTextToSize(uni.tagline, 170);
    taglineLines.forEach(line => {
      doc.text(line, 20, yOffset);
      yOffset += 5;
    });
    doc.setFont(undefined, 'normal');
    yOffset += 5;
  }

  // Divider line
  doc.setDrawColor(230, 230, 230);
  doc.line(20, yOffset, 190, yOffset);
  yOffset += 8;

  // Helper function to add section
  const addUniSection = (title) => {
    if (yOffset > 270) {
      doc.addPage();
      yOffset = 20;
    }
    doc.setFontSize(13);
    doc.setTextColor(79, 70, 229);
    doc.text(title, 20, yOffset);
    yOffset += 8;
    doc.setDrawColor(230, 230, 230);
    doc.line(20, yOffset - 2, 190, yOffset - 2);
    yOffset += 6;
    doc.setFontSize(10);
    doc.setTextColor(0);
  };

  // Mission
  if (uni.mission) {
    addUniSection('MISSION');
    const missionLines = doc.splitTextToSize(uni.mission, 165);
    missionLines.forEach(line => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(line, 25, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Culture
  if (uni.culture) {
    addUniSection('CULTURE');
    const cultureLines = doc.splitTextToSize(uni.culture, 165);
    cultureLines.forEach(line => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(line, 25, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Core Values
  if (uni.coreValues && uni.coreValues.length > 0) {
    addUniSection('CORE VALUES');
    uni.coreValues.forEach(value => {
      if (yOffset > 275) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(`• ${value}`, 25, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Academic Specialties
  if (uni.academicSpecialties && uni.academicSpecialties.length > 0) {
    addUniSection('ACADEMIC STRENGTHS');
    uni.academicSpecialties.forEach(spec => {
      if (yOffset > 275) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(`• ${spec}`, 25, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Notable Programs
  if (uni.notablePrograms && uni.notablePrograms.length > 0) {
    addUniSection('NOTABLE PROGRAMS');
    uni.notablePrograms.forEach(prog => {
      if (yOffset > 275) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(`• ${prog}`, 25, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Campus Ethos
  if (uni.campusEthos) {
    addUniSection('CAMPUS ETHOS');
    const ethosLines = doc.splitTextToSize(uni.campusEthos, 165);
    ethosLines.forEach(line => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(line, 25, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Ideal Candidate Traits
  if (uni.idealCandidateTraits && uni.idealCandidateTraits.length > 0) {
    addUniSection('IDEAL CANDIDATE TRAITS');
    uni.idealCandidateTraits.forEach(trait => {
      if (yOffset > 275) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(`• ${trait}`, 25, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Major-Specific Notes
  if (uni.majorSpecificNotes && Object.keys(uni.majorSpecificNotes).length > 0) {
    addUniSection('MAJOR-SPECIFIC NOTES');
    Object.entries(uni.majorSpecificNotes).forEach(([major, notes]) => {
      if (notes && yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      if (notes) {
        doc.setFont(undefined, 'bold');
        doc.text(`${major}:`, 25, yOffset);
        yOffset += 5;
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(notes, 160);
        lines.forEach(line => {
          if (yOffset > 275) {
            doc.addPage();
            yOffset = 20;
          }
          doc.text(line, 30, yOffset);
          yOffset += 4;
        });
        yOffset += 2;
      }
    });
  }

  doc.save(`${uni.universityName}_profile.pdf`);
}

// ─── Guidance Functions ───────────────────────────────────────────────────────

async function generateGuidance() {
  if (!currentStudentId || !currentUniversityId) {
    alert('Please select a student and university first');
    return;
  }

  const student = StorageManager.getStudent(currentStudentId);
  const uni = StorageManager.getUniversity(currentStudentId, currentUniversityId);

  showLoadingSpinner(true, 'Generating guidance...');
  elements.btnGenerateGuidance.disabled = true;

  try {
    const response = await fetch('/api/generate-guidance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentData: student, universityData: uni }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate guidance');
    }

    const result = await response.json();
    elements.guidanceContent.innerHTML = result.guidance;
    elements.guidanceContainer.style.display = 'block';
    elements.btnExportGuidancePdf.disabled = false;
  } catch (error) {
    alert('Error generating guidance: ' + error.message);
    console.error(error);
  } finally {
    showLoadingSpinner(false);
    elements.btnGenerateGuidance.disabled = false;
  }
}

async function generateEssayGuidance() {
  if (!currentStudentId || !currentUniversityId) {
    alert('Please select a student and university first');
    return;
  }

  const essayPrompt = elements.essayPrompt.value.trim();
  if (!essayPrompt) {
    alert('Please enter an essay prompt');
    return;
  }

  const student = StorageManager.getStudent(currentStudentId);
  const uni = StorageManager.getUniversity(currentStudentId, currentUniversityId);
  const wordLimit = elements.essayWordLimit.value.trim();

  showLoadingSpinner(true, 'Generating essay guidance...');
  elements.btnGenerateEssayGuidance.disabled = true;

  try {
    const response = await fetch('/api/generate-essay-guidance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentData: student,
        universityData: uni,
        essayPrompt,
        wordLimit: wordLimit || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate essay guidance');
    }

    const result = await response.json();

    // Add essay guidance to list
    const essayId = Date.now();
    const essayItem = document.createElement('div');
    essayItem.className = 'card mb-3 border-info';
    essayItem.innerHTML = `
      <div class="card-header bg-light">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">Essay Guidance</h6>
          <button class="btn btn-sm btn-outline-danger" onclick="this.closest('.card').remove(); updateEssayExportButton();">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="card-body">
        <p class="text-muted small mb-3"><strong>Prompt:</strong> ${essayPrompt.substring(0, 100)}...</p>
        <div style="background: #f9fafb; padding: 1.5rem; border-radius: 6px; font-size: 0.95rem; line-height: 1.8; max-height: 500px; overflow-y: auto;">
          ${result.guidance}
        </div>
      </div>
    `;

    // Style the HTML content within the essay guidance
    const essayContent = essayItem.querySelector('div[style*="background: #f9fafb"]');
    if (essayContent) {
      essayContent.querySelectorAll('h2, h3').forEach(h => {
        h.style.marginTop = '1.5rem';
        h.style.marginBottom = '0.75rem';
        h.style.color = '#1f2937';
        h.style.fontWeight = '600';
      });
      essayContent.querySelectorAll('p').forEach(p => {
        p.style.marginBottom = '0.75rem';
      });
      essayContent.querySelectorAll('ul').forEach(ul => {
        ul.style.marginLeft = '1.25rem';
        ul.style.marginBottom = '0.75rem';
      });
      essayContent.querySelectorAll('li').forEach(li => {
        li.style.marginBottom = '0.5rem';
      });
    }

    elements.essayGuidanceList.insertBefore(essayItem, elements.essayGuidanceList.firstChild);
    elements.essayPrompt.value = '';
    elements.essayWordLimit.value = '';
    // Enable export button when essays exist
    if (elements.essayGuidanceList.children.length > 0) {
      elements.btnExportAllEssaysPdf.disabled = false;
    }
  } catch (error) {
    alert('Error generating essay guidance: ' + error.message);
    console.error(error);
  } finally {
    showLoadingSpinner(false);
    elements.btnGenerateEssayGuidance.disabled = false;
  }
}

function updateEssayExportButton() {
  if (elements.essayGuidanceList.children.length === 0) {
    elements.btnExportAllEssaysPdf.disabled = true;
  } else {
    elements.btnExportAllEssaysPdf.disabled = false;
  }
}

function exportGuidancePdf() {
  if (!currentStudentId || !currentUniversityId) {
    alert('Please select a student and university first');
    return;
  }

  const student = StorageManager.getStudent(currentStudentId);
  const uni = StorageManager.getUniversity(currentStudentId, currentUniversityId);

  if (!elements.guidanceContent.innerHTML) {
    alert('No guidance generated yet');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Bootstrap CSS for PDF rendering
  const bootstrapStyles = `
    <style>
      * { margin: 0 !important; padding: 0 !important; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 3px !important; line-height: 1.3 !important; color: #000 !important; }
      .container { max-width: 750px; margin: 0 auto; padding: 4px; }
      h1, h2, h3, h4, h5, h6 { margin: 2px 0 1px 0 !important; font-weight: 600 !important; line-height: 1 !important; }
      h1 { font-size: 6px !important; }
      h2 { font-size: 4.5px !important; color: #4f46e5 !important; }
      h3 { font-size: 3.5px !important; color: #1f2937 !important; }
      h4, h5, h6 { font-size: 3px !important; }
      p { margin: 1px 0 !important; font-size: 3px !important; }
      ul, ol { margin: 1px 0 1px 6px !important; }
      li { margin: 1px 0 !important; font-size: 3px !important; }
      .mb-2 { margin-bottom: 1px !important; }
      .mb-3 { margin-bottom: 2px !important; }
      .mb-4 { margin-bottom: 3px !important; }
      .alert { padding: 3px !important; margin: 2px 0 !important; border-radius: 2px; font-size: 3px !important; }
      .alert-info { background-color: #e0f2fe; border-left: 2px solid #0284c7; color: #075985; }
      .alert-warning { background-color: #fef3c7; border-left: 2px solid #f59e0b; color: #92400e; }
      .text-primary { color: #4f46e5 !important; }
      .text-secondary { color: #6b7280 !important; }
      .fw-bold { font-weight: 600 !important; }
      .blockquote { margin: 2px 0 !important; padding-left: 6px; border-left: 2px solid #4f46e5; color: #6b7280; font-style: italic; font-size: 3px !important; }
      .list-unstyled { list-style: none; margin: 0; padding: 0; }
      .ps-3 { padding-left: 4px !important; }
      strong { font-weight: 600 !important; }
      code { font-size: 2.5px !important; }
      table { font-size: 2.5px !important; }
    </style>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      ${bootstrapStyles}
    </head>
    <body>
      <div class="container">
        <h1 style="color: #4f46e5 !important; margin-bottom: 8px !important;">Admissions Guidance Report</h1>
        <p><strong>Student:</strong> ${student.name}</p>
        <p><strong>University:</strong> ${uni.universityName}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <hr style="margin: 8px 0 !important; border: none; border-top: 1px solid #e5e7eb;">
        ${elements.guidanceContent.innerHTML}
      </div>
    </body>
    </html>
  `;

  doc.html(htmlContent, {
    margin: [10, 10, 10, 10],
    compress: true,
    useCORS: true,
    allowTaint: true,
    onclone: (clonedDocument) => {
      // Remove all inline styles that might override PDF styles
      clonedDocument.querySelectorAll('*').forEach(el => {
        el.removeAttribute('style');
      });

      // Add aggressive overrides for all text
      const styles = clonedDocument.createElement('style');
      styles.innerHTML = `
        * { font-size: inherit !important; }
        html, body { font-size: 3px !important; }
        h1, h2, h3, h4, h5, h6 { font-weight: 600 !important; line-height: 1 !important; }
        h1 { font-size: 6px !important; margin: 2px 0 1px 0 !important; }
        h2 { font-size: 4.5px !important; margin: 2px 0 1px 0 !important; color: #4f46e5 !important; }
        h3 { font-size: 3.5px !important; margin: 1px 0 !important; }
        p, span, div, li { font-size: 3px !important; }
      `;
      clonedDocument.head.appendChild(styles);
    },
    callback: (pdf) => {
      pdf.save(`${uni.universityName}_guidance.pdf`);
    }
  });
}

function exportAllEssaysPdf() {
  if (!currentStudentId || !currentUniversityId) {
    alert('Please select a student and university first');
    return;
  }

  const student = StorageManager.getStudent(currentStudentId);
  const uni = StorageManager.getUniversity(currentStudentId, currentUniversityId);
  const essayItems = elements.essayGuidanceList.querySelectorAll('.card');

  if (essayItems.length === 0) {
    alert('No essays to export');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Bootstrap CSS for PDF rendering
  const bootstrapStyles = `
    <style>
      * { margin: 0 !important; padding: 0 !important; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 3px !important; line-height: 1.3 !important; color: #000 !important; }
      .container { max-width: 750px; margin: 0 auto; padding: 4px; }
      h1, h2, h3, h4, h5, h6 { margin: 2px 0 1px 0 !important; font-weight: 600 !important; line-height: 1 !important; }
      h1 { font-size: 6px !important; }
      h2 { font-size: 4.5px !important; color: #4f46e5 !important; }
      h3 { font-size: 3.5px !important; color: #1f2937 !important; }
      h4, h5, h6 { font-size: 3px !important; }
      .essay-section { margin: 3px 0 !important; padding: 3px !important; background-color: #f9fafb; border-radius: 2px; }
      .essay-prompt { font-style: italic; color: #6b7280; margin: 1px 0 !important; font-size: 3px !important; }
      .essay-guidance { margin-top: 2px !important; }
      p { margin: 1px 0 !important; font-size: 3px !important; }
      ul, ol { margin: 1px 0 1px 6px !important; }
      li { margin: 1px 0 !important; font-size: 3px !important; }
      .mb-2 { margin-bottom: 1px !important; }
      .mb-3 { margin-bottom: 2px !important; }
      .mb-4 { margin-bottom: 3px !important; }
      .alert { padding: 3px !important; margin: 2px 0 !important; border-radius: 2px; font-size: 3px !important; }
      .alert-info { background-color: #e0f2fe; border-left: 2px solid #0284c7; color: #075985; }
      .alert-warning { background-color: #fef3c7; border-left: 2px solid #f59e0b; color: #92400e; }
      .text-primary { color: #4f46e5 !important; }
      .text-secondary { color: #6b7280 !important; }
      .fw-bold { font-weight: 600 !important; }
      .blockquote { margin: 2px 0 !important; padding-left: 6px; border-left: 2px solid #4f46e5; color: #6b7280; font-style: italic; font-size: 3px !important; }
      .list-unstyled { list-style: none; margin: 0; padding: 0; }
      .ps-3 { padding-left: 4px !important; }
      strong { font-weight: 600 !important; }
      code { font-size: 2.5px !important; }
      table { font-size: 2.5px !important; }
      hr { margin: 3px 0 !important; border: none; border-top: 1px solid #e5e7eb; }
    </style>
  `;

  const essaysHtml = Array.from(essayItems).map((item, index) => {
    const promptText = item.querySelector('.text-muted.small')?.textContent || '';
    const guidanceHtml = item.querySelector('[style*="background"]')?.innerHTML || '';
    return `
      <div class="essay-section">
        <h2>Essay ${index + 1}</h2>
        <div class="essay-prompt"><strong>Prompt:</strong> ${promptText}</div>
        <div class="essay-guidance">${guidanceHtml}</div>
      </div>
      <hr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      ${bootstrapStyles}
    </head>
    <body>
      <div class="container">
        <h1 style="color: #4f46e5; margin-bottom: 20px;">Essay Guidance Collection</h1>
        <p><strong>Student:</strong> ${student.name}</p>
        <p><strong>University:</strong> ${uni.universityName}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <hr>
        ${essaysHtml}
      </div>
    </body>
    </html>
  `;

  doc.html(htmlContent, {
    margin: [10, 10, 10, 10],
    compress: true,
    useCORS: true,
    allowTaint: true,
    onclone: (clonedDocument) => {
      // Remove all inline styles that might override PDF styles
      clonedDocument.querySelectorAll('*').forEach(el => {
        el.removeAttribute('style');
      });

      // Add aggressive overrides for all text
      const styles = clonedDocument.createElement('style');
      styles.innerHTML = `
        * { font-size: inherit !important; }
        html, body { font-size: 3px !important; }
        h1, h2, h3, h4, h5, h6 { font-weight: 600 !important; line-height: 1 !important; }
        h1 { font-size: 6px !important; margin: 2px 0 1px 0 !important; }
        h2 { font-size: 4.5px !important; margin: 2px 0 1px 0 !important; color: #4f46e5 !important; }
        h3 { font-size: 3.5px !important; margin: 1px 0 !important; }
        p, span, div, li { font-size: 3px !important; }
      `;
      clonedDocument.head.appendChild(styles);
    },
    callback: (pdf) => {
      pdf.save(`${uni.universityName}_essays.pdf`);
    }
  });
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function showLoadingSpinner(show, text = 'Loading...') {
  if (show) {
    elements.loadingSpinner.classList.add('active');
    elements.loadingText.textContent = text;
  } else {
    elements.loadingSpinner.classList.remove('active');
  }
}
