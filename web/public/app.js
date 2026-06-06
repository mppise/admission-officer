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

  showLoadingSpinner(true, 'Scraping university website...');

  try {
    const response = await fetch('/api/scrape-university', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, intendedMajors }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Scraping failed');
    }

    const universityData = await response.json();
    const uniId = Date.now().toString();

    StorageManager.saveUniversity(currentStudentId, uniId, universityData);
    elements.universityDomain.value = '';

    renderUniversitiesList();
    selectUniversity(uniId);
  } catch (error) {
    alert('Error scraping university: ' + error.message);
    console.error(error);
  } finally {
    showLoadingSpinner(false);
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
    const isActive = uniId === currentUniversityId;
    return `
      <div class="list-group-item ${isActive ? 'active' : ''}" style="padding: 0.75rem; cursor: pointer; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem;"
           onclick="selectUniversity('${uniId}')">
        <strong>${uni.universityName || 'Unnamed University'}</strong>
        <small class="text-muted d-block">${uni.tagline || 'No tagline'}</small>
      </div>
    `;
  }).join('');

  if (universities.length > 0) {
    elements.btnExportUniversityPdf.disabled = false;
  }
}

function selectUniversity(uniId) {
  currentUniversityId = uniId;
  renderUniversitiesList();
  loadUniversityForm();
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
  doc.setFontSize(20);
  doc.text('Student Profile', 20, yOffset);
  yOffset += 15;

  doc.setFontSize(12);
  doc.setTextColor(80);

  // Personal Information
  doc.text('PERSONAL INFORMATION', 20, yOffset);
  yOffset += 8;
  doc.setFontSize(10);
  const personalInfo = [
    `Name: ${student.name}`,
    `Graduation Year: ${student.gradYear || '—'}`,
    `High School: ${student.highSchool || '—'}`,
    `Intended Majors: ${(student.intendedMajors || []).join(', ') || '—'}`,
  ];
  personalInfo.forEach(line => {
    doc.text(line, 20, yOffset);
    yOffset += 6;
  });
  yOffset += 5;

  // Academic Information
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text('ACADEMIC INFORMATION', 20, yOffset);
  yOffset += 8;
  doc.setFontSize(10);
  const academicInfo = [
    `Weighted GPA: ${student.gpaWeighted || '—'}`,
    `Unweighted GPA: ${student.gpaUnweighted || '—'}`,
    `Class Rank: ${student.classRank || '—'}`,
  ];
  academicInfo.forEach(line => {
    doc.text(line, 20, yOffset);
    yOffset += 6;
  });
  yOffset += 5;

  // Test Scores
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text('STANDARDIZED TESTS', 20, yOffset);
  yOffset += 8;
  doc.setFontSize(10);
  const testInfo = [
    `SAT Total: ${student.sat?.total || '—'} (Math: ${student.sat?.math || '—'}, Reading: ${student.sat?.reading || '—'})`,
    `ACT Composite: ${student.act?.composite || '—'}`,
  ];
  testInfo.forEach(line => {
    doc.text(line, 20, yOffset);
    yOffset += 6;
  });

  // AP Scores
  if (student.apScores && student.apScores.length > 0) {
    yOffset += 5;
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text('AP Scores', 20, yOffset);
    yOffset += 6;
    doc.setFontSize(10);
    student.apScores.forEach(score => {
      doc.text(`${score.subject}: ${score.score}`, 25, yOffset);
      yOffset += 5;
    });
  }

  // Extracurriculars
  if (student.extracurriculars && student.extracurriculars.length > 0) {
    yOffset += 5;
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text('EXTRACURRICULAR ACTIVITIES', 20, yOffset);
    yOffset += 8;
    doc.setFontSize(10);
    student.extracurriculars.forEach(activity => {
      doc.text(`${activity.activityName}`, 20, yOffset);
      yOffset += 4;
      if (activity.description) {
        const lines = doc.splitTextToSize(activity.description, 150);
        lines.forEach(line => {
          doc.text(line, 25, yOffset);
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
  doc.setFontSize(20);
  doc.text(uni.universityName, 20, yOffset);
  yOffset += 12;

  doc.setFontSize(10);
  doc.setTextColor(100);
  if (uni.tagline) {
    doc.text(uni.tagline, 20, yOffset);
    yOffset += 8;
  }

  // Mission
  if (uni.mission) {
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text('MISSION', 20, yOffset);
    yOffset += 6;
    doc.setFontSize(10);
    const missionLines = doc.splitTextToSize(uni.mission, 170);
    missionLines.forEach(line => {
      doc.text(line, 20, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Culture
  if (uni.culture) {
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text('CULTURE', 20, yOffset);
    yOffset += 6;
    doc.setFontSize(10);
    const cultureLines = doc.splitTextToSize(uni.culture, 170);
    cultureLines.forEach(line => {
      doc.text(line, 20, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Core Values
  if (uni.coreValues && uni.coreValues.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text('CORE VALUES', 20, yOffset);
    yOffset += 6;
    doc.setFontSize(10);
    uni.coreValues.forEach(value => {
      doc.text(`• ${value}`, 25, yOffset);
      yOffset += 5;
    });
    yOffset += 3;
  }

  // Academic Specialties
  if (uni.academicSpecialties && uni.academicSpecialties.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text('ACADEMIC STRENGTHS', 20, yOffset);
    yOffset += 6;
    doc.setFontSize(10);
    uni.academicSpecialties.forEach(spec => {
      doc.text(`• ${spec}`, 25, yOffset);
      yOffset += 5;
    });
  }

  doc.save(`${uni.universityName}_profile.pdf`);
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
