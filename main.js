// Import all JSON files from the data directory using Vite's glob import
const modules = import.meta.glob('./data/*.json', { eager: true });

// State
let allQuestions = [];
let filteredQuestions = [];
let topics = new Set();
let currentMode = 'study'; // 'study', 'quiz-setup', 'quiz-active', 'quiz-results'

// Study State
let studyIndex = 0;
let studyOptionSelected = false;

// Quiz State
let quizQuestions = [];
let quizIndex = 0;
let quizAnswers = {}; // id -> selected option key

// LocalStorage State
let starredQuestions = JSON.parse(localStorage.getItem('hxy_starred') || '[]'); // Array of q.id
let userNotes = JSON.parse(localStorage.getItem('hxy_notes') || '{}'); // Object mapping q.id -> note string

function saveState() {
  localStorage.setItem('hxy_starred', JSON.stringify(starredQuestions));
  localStorage.setItem('hxy_notes', JSON.stringify(userNotes));
}

// Toast Notification
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// DOM Elements - Setup
const body = document.body;
const themeToggleBtn = document.getElementById('theme-toggle');
const iconSun = document.getElementById('icon-sun');
const iconMoon = document.getElementById('icon-moon');

// Navigation & Filters
const btnStudyMode = document.getElementById('btn-study-mode');
const btnQuizMode = document.getElementById('btn-quiz-mode');
const btnRevisionMode = document.getElementById('btn-revision-mode');
const topicsFilterContainer = document.getElementById('topics-filter');
const btnApplyFilters = document.getElementById('btn-apply-filters');

// Views
const studyView = document.getElementById('study-view');
const quizSetupView = document.getElementById('quiz-setup-view');
const quizActiveView = document.getElementById('quiz-active-view');
const quizResultsView = document.getElementById('quiz-results-view');
const revisionView = document.getElementById('revision-view');

// Initialize Data
function initData() {
  for (const path in modules) {
    const filename = path.split('/').pop().replace('.json', '').replace(/_/g, ' ');
    const data = modules[path].default || modules[path];
    
    data.forEach(q => {
      q.topic = filename; // enforce topic from filename
      // Make ID globally unique by prepending topic
      q.id = filename + '_' + (q.id || q.question.substring(0, 20).replace(/\s+/g, '_'));
      allQuestions.push(q);
      topics.add(filename);
    });
  }

  // Render topics checkboxes
  topicsFilterContainer.innerHTML = '';
  topics.forEach(topic => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${topic}" checked> ${topic}`;
    topicsFilterContainer.appendChild(label);
  });

  applyFilters();
}

// Theme Toggle
themeToggleBtn.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  iconSun.classList.toggle('hidden');
  iconMoon.classList.toggle('hidden');
});

// Mode Switching
btnStudyMode.addEventListener('click', () => setMode('study'));
btnQuizMode.addEventListener('click', () => setMode('quiz-setup'));
btnRevisionMode.addEventListener('click', () => setMode('revision'));

let quizTimerInterval = null;

function setMode(mode) {
  currentMode = mode;
  
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  
  // Update Buttons
  btnStudyMode.classList.toggle('active', mode === 'study');
  btnQuizMode.classList.toggle('active', mode.startsWith('quiz'));
  btnRevisionMode.classList.toggle('active', mode === 'revision');

  // Hide all views
  studyView.classList.add('hidden');
  quizSetupView.classList.add('hidden');
  quizActiveView.classList.add('hidden');
  quizResultsView.classList.add('hidden');
  revisionView.classList.add('hidden');

  // Show correct view
  if (mode === 'study') {
    studyView.classList.remove('hidden');
    renderStudyQuestion();
  } else if (mode === 'quiz-setup') {
    quizSetupView.classList.remove('hidden');
  } else if (mode === 'quiz-active') {
    quizActiveView.classList.remove('hidden');
  } else if (mode === 'quiz-results') {
    quizResultsView.classList.remove('hidden');
  } else if (mode === 'revision') {
    revisionView.classList.remove('hidden');
    renderRevisionHub();
  }
}

// Filtering
btnApplyFilters.addEventListener('click', applyFilters);

function applyFilters() {
  const selectedTopics = Array.from(topicsFilterContainer.querySelectorAll('input:checked')).map(cb => cb.value);
  const selectedDifficulties = Array.from(document.getElementById('difficulty-filter').querySelectorAll('input:checked')).map(cb => cb.value);

  filteredQuestions = allQuestions.filter(q => {
    const qDiff = q.difficulty || "Unknown";
    return selectedTopics.includes(q.topic) && selectedDifficulties.includes(qDiff);
  });

  if (filteredQuestions.length === 0) {
    alert('No questions match the selected filters.');
    return;
  }

  // Update study mode state if active
  if (studyIndex >= filteredQuestions.length) {
    studyIndex = 0;
  }
  
  if (currentMode === 'study') {
    renderStudyQuestion();
  }
}

// ======================= STUDY MODE =======================
const studyTopicBadge = document.getElementById('study-topic');
const studyDiffBadge = document.getElementById('study-difficulty');
const studyQuestionText = document.getElementById('study-question-text');
const studyOptions = document.getElementById('study-options');
const studyExplanation = document.getElementById('study-explanation');
const studyExplanationText = document.getElementById('study-explanation-text');
const inputQNum = document.getElementById('input-q-num');
const totalQSpan = document.getElementById('total-q');
const btnNext = document.getElementById('btn-next');
const btnPrev = document.getElementById('btn-prev');

// Action Buttons
const btnStarStudy = document.getElementById('btn-star-study');
const btnNoteStudy = document.getElementById('btn-note-study');
const studyNoteContainer = document.getElementById('study-note-container');
const studyNoteInput = document.getElementById('study-note-input');
const btnSaveNote = document.getElementById('btn-save-note');
const noteSaveStatus = document.getElementById('note-save-status');

function renderStudyQuestion() {
  if (filteredQuestions.length === 0) return;
  const q = filteredQuestions[studyIndex];
  
  studyTopicBadge.textContent = q.topic;
  studyDiffBadge.textContent = q.difficulty || 'Unknown';
  studyQuestionText.textContent = q.question;
  
  inputQNum.value = studyIndex + 1;
  inputQNum.max = filteredQuestions.length;
  totalQSpan.textContent = filteredQuestions.length;
  
  studyOptions.innerHTML = '';
  studyExplanation.classList.add('hidden');
  studyOptionSelected = false;
  
  // Setup Actions State
  btnStarStudy.classList.toggle('starred', starredQuestions.includes(q.id));
  btnStarStudy.onclick = () => {
    if (starredQuestions.includes(q.id)) {
      starredQuestions = starredQuestions.filter(id => id !== q.id);
      btnStarStudy.classList.remove('starred');
    } else {
      starredQuestions.push(q.id);
      btnStarStudy.classList.add('starred');
    }
    saveState();
  };

  studyNoteContainer.classList.add('hidden');
  studyNoteInput.value = userNotes[q.id] || '';
  btnNoteStudy.classList.toggle('has-note', !!userNotes[q.id]);
  noteSaveStatus.style.display = 'none';

  btnNoteStudy.onclick = () => {
    studyNoteContainer.classList.toggle('hidden');
  };

  btnSaveNote.onclick = () => {
    const val = studyNoteInput.value.trim();
    if (val) {
      userNotes[q.id] = val;
      btnNoteStudy.classList.add('has-note');
      showToast("Note saved successfully!");
    } else {
      delete userNotes[q.id];
      btnNoteStudy.classList.remove('has-note');
      showToast("Note removed.");
    }
    saveState();
    studyNoteContainer.classList.add('hidden');
  };

  if (q.options) {
    for (const [key, text] of Object.entries(q.options)) {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<strong>${key}.</strong> <span>${text}</span>`;
      
      btn.addEventListener('click', () => handleStudyOptionClick(btn, key, q));
      studyOptions.appendChild(btn);
    }
  } else {
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = 'Reveal Answer';
    btn.addEventListener('click', () => {
      btn.classList.add('hidden');
      studyExplanationText.textContent = q.explanation || q.answer || "No explanation provided.";
      studyExplanation.classList.remove('hidden');
    });
    studyOptions.appendChild(btn);
  }
}

function handleStudyOptionClick(btn, key, q) {
  if (studyOptionSelected) return; // Prevent multiple clicks
  studyOptionSelected = true;

  // Reveal correct answer and explanation immediately
  const isCorrect = key === q.answer;
  if (isCorrect) {
    btn.classList.add('correct');
    if (window.confetti) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  } else {
    btn.classList.add('incorrect');
    // Highlight correct option too
    Array.from(studyOptions.children).forEach(childBtn => {
      if (childBtn.textContent.startsWith(q.answer + '.')) {
        childBtn.classList.add('correct');
      }
    });
  }

  // Show explanation
  studyExplanationText.textContent = q.explanation || (q.options[q.answer] ? `Correct answer is ${q.answer}: ${q.options[q.answer]}` : "No explanation provided.");
  studyExplanation.classList.remove('hidden');
}

btnNext.addEventListener('click', () => {
  if (filteredQuestions.length === 0) return;
  studyIndex = (studyIndex + 1) % filteredQuestions.length;
  renderStudyQuestion();
});

btnPrev.addEventListener('click', () => {
  if (filteredQuestions.length === 0) return;
  studyIndex = (studyIndex - 1 + filteredQuestions.length) % filteredQuestions.length;
  renderStudyQuestion();
});

inputQNum.addEventListener('change', (e) => {
  let val = parseInt(e.target.value);
  if (isNaN(val) || val < 1) val = 1;
  if (val > filteredQuestions.length) val = filteredQuestions.length;
  studyIndex = val - 1;
  renderStudyQuestion();
});

// ======================= QUIZ MODE =======================
const btnStartQuiz = document.getElementById('btn-start-quiz');
const inputQuizCount = document.getElementById('quiz-question-count');

const quizCurrentQSpan = document.getElementById('quiz-current-q');
const quizTotalQSpan = document.getElementById('quiz-total-q');
const quizQuestionText = document.getElementById('quiz-question-text');
const quizOptions = document.getElementById('quiz-options');
const btnQuizNext = document.getElementById('btn-quiz-next');
const btnQuizSubmit = document.getElementById('btn-quiz-submit');

btnStartQuiz.addEventListener('click', () => {
  if (filteredQuestions.length === 0) {
    alert("Please adjust filters to include some questions.");
    return;
  }
  
  let count = parseInt(inputQuizCount.value) || 10;
  if (count > filteredQuestions.length) count = filteredQuestions.length;
  
  // Shuffle and pick
  const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
  quizQuestions = shuffled.slice(0, count);
  
  quizIndex = 0;
  quizAnswers = {};
  setMode('quiz-active');
  
  // Timer Setup
  const inputTimeLimit = document.getElementById('quiz-time-limit');
  const timeLimitMins = parseFloat(inputTimeLimit.value);
  const timerDisplay = document.getElementById('quiz-timer-display');
  
  if (timeLimitMins > 0) {
    let timeLeft = Math.floor(timeLimitMins * 60);
    timerDisplay.classList.remove('hidden');
    
    const updateDisplay = () => {
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${m}:${s}`;
      if (timeLeft <= 10) {
        timerDisplay.style.color = 'var(--error)';
        timerDisplay.style.background = 'rgba(239, 68, 68, 0.15)';
      } else {
        timerDisplay.style.color = '';
        timerDisplay.style.background = '';
      }
    };
    updateDisplay();
    
    quizTimerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(quizTimerInterval);
        showToast("Time's up!");
        finishQuiz();
      } else {
        updateDisplay();
      }
    }, 1000);
  } else {
    timerDisplay.classList.add('hidden');
  }
  
  renderQuizQuestion();
});

function renderQuizQuestion() {
  const q = quizQuestions[quizIndex];
  
  quizCurrentQSpan.textContent = quizIndex + 1;
  quizTotalQSpan.textContent = quizQuestions.length;
  
  // Update progress bar
  const progressFill = document.getElementById('quiz-progress-fill');
  if (progressFill) {
    const pct = ((quizIndex) / quizQuestions.length) * 100;
    // Animate to new width
    setTimeout(() => {
      progressFill.style.width = `${((quizIndex + 1) / quizQuestions.length) * 100}%`;
    }, 50);
  }

  quizQuestionText.textContent = `Q${quizIndex + 1}. ${q.question}`;
  
  quizOptions.innerHTML = '';
  
  if (q.options) {
    for (const [key, text] of Object.entries(q.options)) {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<strong>${key}.</strong> <span>${text}</span>`;
      
      // Restore selection if navigating back (optional, but good UX)
      if (quizAnswers[q.id] === key) {
        btn.classList.add('selected-quiz');
      }
      
      btn.addEventListener('click', () => {
        // clear others
        Array.from(quizOptions.children).forEach(b => b.classList.remove('selected-quiz'));
        btn.classList.add('selected-quiz');
        quizAnswers[q.id] = key;
      });
      
      quizOptions.appendChild(btn);
    }
  } else {
    const p = document.createElement('p');
    p.textContent = "This is a descriptive question. Think of the answer and proceed.";
    p.style.color = "var(--text-secondary)";
    p.style.fontStyle = "italic";
    p.style.padding = "16px";
    quizOptions.appendChild(p);
    quizAnswers[q.id] = "Descriptive";
  }
  
  // Update buttons
  if (quizIndex === quizQuestions.length - 1) {
    btnQuizNext.classList.add('hidden');
    btnQuizSubmit.classList.remove('hidden');
  } else {
    btnQuizNext.classList.remove('hidden');
    btnQuizSubmit.classList.add('hidden');
  }
}

btnQuizNext.addEventListener('click', () => {
  if (quizIndex < quizQuestions.length - 1) {
    quizIndex++;
    renderQuizQuestion();
  }
});

btnQuizSubmit.addEventListener('click', finishQuiz);

function finishQuiz() {
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  
  let score = 0;
  const reviewContainer = document.getElementById('quiz-review-container');
  reviewContainer.innerHTML = '';
  
  quizQuestions.forEach((q, idx) => {
    const userAns = quizAnswers[q.id];
    let isCorrect = false;
    
    if (q.options) {
      isCorrect = userAns === q.answer;
      if (isCorrect) score++;
    } else {
      isCorrect = true; // Auto-point for descriptive
      score++;
    }
    
    // Create review card
    const card = document.createElement('div');
    card.className = 'glass-panel review-card';
    
    const isStarred = starredQuestions.includes(q.id);
    const starLabel = isStarred ? '⭐ Unstar' : '⭐ Star';
    
    let html = `<div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <h3>Q${idx + 1}. ${q.question}</h3>
                  <button class="btn-nav quiz-star-btn">${starLabel}</button>
                </div>
                <div class="options-container" style="pointer-events:none;">`;
                
    if (q.options) {
      for (const [key, text] of Object.entries(q.options)) {
        let cssClass = 'option-btn';
        if (key === q.answer) {
          cssClass += ' correct';
        } else if (key === userAns) {
          cssClass += ' incorrect';
        }
        html += `<div class="${cssClass}"><strong>${key}.</strong> <span>${text}</span></div>`;
      }
    } else {
      html += `<div class="option-btn correct">Descriptive Question</div>`;
    }
    
    html += `</div>
             <div class="explanation-box" style="margin-top:16px;">
               <strong>Answer:</strong> ${q.explanation || q.answer || 'No explanation available.'}
             </div>`;
             
    card.innerHTML = html;
    
    // Add star logic
    const starBtn = card.querySelector('.quiz-star-btn');
    starBtn.addEventListener('click', () => {
      if (starredQuestions.includes(q.id)) {
        starredQuestions = starredQuestions.filter(id => id !== q.id);
        starBtn.textContent = '⭐ Star';
      } else {
        starredQuestions.push(q.id);
        starBtn.textContent = '⭐ Unstar';
      }
      saveState();
    });
    
    reviewContainer.appendChild(card);
  });
  
  document.getElementById('quiz-score-num').textContent = score;
  document.getElementById('quiz-score-total').textContent = quizQuestions.length;
  
  const pct = score / quizQuestions.length;
  const feedback = document.getElementById('quiz-feedback-msg');
  if (pct === 1) {
    feedback.textContent = "Perfect score! Outstanding!";
    if (window.confetti) {
      const duration = 3000;
      const end = Date.now() + duration;
      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#06b6d4', '#8b5cf6'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#06b6d4', '#8b5cf6'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }
  } else if (pct >= 0.8) {
    feedback.textContent = "Great job! You know your stuff.";
  } else if (pct >= 0.5) {
    feedback.textContent = "Good effort, keep studying!";
  } else {
    feedback.textContent = "More practice needed. Keep going!";
  }
  
  setMode('quiz-results');
}

document.getElementById('btn-quiz-restart').addEventListener('click', () => {
  setMode('quiz-setup');
});


// 3D Card Hover Effect
function add3DHoverEffect(card) {
  if (!card) return;
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -3; // Subtle tilt
    const rotateY = ((x - centerX) / centerX) * 3;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  });
}

add3DHoverEffect(document.getElementById('study-question-card'));
add3DHoverEffect(document.getElementById('quiz-question-card'));

// ======================= REVISION HUB =======================
function renderRevisionHub() {
  const revisionList = document.getElementById('revision-list');
  revisionList.innerHTML = '';
  
  const markedQuestions = allQuestions.filter(q => starredQuestions.includes(q.id) || userNotes[q.id]);
  
  if (markedQuestions.length === 0) {
    revisionList.innerHTML = '<p style="color:var(--text-secondary);">No starred questions or notes found yet!</p>';
    return;
  }
  
  markedQuestions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'glass-panel revision-card-item';
    card.style.padding = '24px';
    
    let metaHtml = '<div class="revision-meta">';
    if (starredQuestions.includes(q.id)) {
      metaHtml += '<span class="badge diff-badge">⭐ Starred</span>';
    }
    if (userNotes[q.id]) {
      metaHtml += '<span class="badge topic-badge">📝 Has Note</span>';
    }
    metaHtml += '</div>';
    
    let noteHtml = '';
    if (userNotes[q.id]) {
      noteHtml = `<div class="revision-note-preview"><strong>Note:</strong> ${userNotes[q.id]}</div>`;
    }
    
    card.innerHTML = `
      ${metaHtml}
      <h3>${q.question}</h3>
      <p style="font-size: 0.85rem; margin-bottom: 12px; color: var(--text-secondary)">Topic: ${q.topic} | Difficulty: ${q.difficulty || 'Unknown'}</p>
      ${noteHtml}
    `;
    
    card.addEventListener('click', () => {
      // Set filters to match this question so we can find it
      const topicCheckbox = Array.from(topicsFilterContainer.querySelectorAll('input')).find(cb => cb.value === q.topic);
      if (topicCheckbox && !topicCheckbox.checked) topicCheckbox.checked = true;
      
      const diffCheckbox = Array.from(document.getElementById('difficulty-filter').querySelectorAll('input')).find(cb => cb.value === (q.difficulty || 'Unknown'));
      if (diffCheckbox && !diffCheckbox.checked) diffCheckbox.checked = true;
      
      applyFilters();
      
      const idx = filteredQuestions.findIndex(fq => fq.id === q.id);
      if (idx !== -1) {
        studyIndex = idx;
      }
      setMode('study');
    });
    
    revisionList.appendChild(card);
  });
}

// Boot
initData();
