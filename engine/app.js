/**
 * Tatra Sales and Engineering Interactive English Testing Engine
 * Self-contained vanilla JS testing engine for TATRA TRUCKS a.s. (International Defense, Commercial Sales & Tender Engineering).
 */

class SuiteTestEngine {
  constructor(options = {}) {
    this.containerId = options.containerId || 'test-app-root';
    this.storagePrefix = 'tatra_sales_test_';
    this.testData = null;
    this.userAnswers = {};
    this.firstTryAnswers = {};
    this.currentQuestionIndex = 0;
    this.viewMode = 'step';
  }

  init(testData) {
    this.testData = testData;
    this.userAnswers = {};
    this.firstTryAnswers = {};
    this.currentQuestionIndex = 0;
    window.currentSuiteEngine = this;
    this.loadSavedState();
    this.render();
  }

  loadSavedState() {
    if (!this.testData || !this.testData.test_id) return;
    try {
      const saved = localStorage.getItem(`${this.storagePrefix}${this.testData.test_id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userAnswers) this.userAnswers = parsed.userAnswers;
        if (parsed.firstTryAnswers) this.firstTryAnswers = parsed.firstTryAnswers;
      }
    } catch (e) {}
  }

  saveState() {
    if (!this.testData || !this.testData.test_id) return;
    try {
      localStorage.setItem(`${this.storagePrefix}${this.testData.test_id}`, JSON.stringify({
        userAnswers: this.userAnswers,
        firstTryAnswers: this.firstTryAnswers,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {}
  }

  resetTest() {
    if (confirm('Reset all answers for this test module?')) {
      this.userAnswers = {};
      this.firstTryAnswers = {};
      this.currentQuestionIndex = 0;
      if (this.testData && this.testData.test_id) {
        localStorage.removeItem(`${this.storagePrefix}${this.testData.test_id}`);
      }
      this.render();
      this.showToast('Test progress has been reset.');
    }
  }

  setViewMode(mode) {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.render();
  }

  handleAnswerSelect(questionIndex, selectedKey) {
    const question = this.testData.questions[questionIndex];
    const qid = question.id;
    const isCorrect = (selectedKey === question.correct_key);

    if (this.firstTryAnswers[qid] === undefined) {
      this.firstTryAnswers[qid] = isCorrect;
    }

    const prevAttempts = (this.userAnswers[qid] && this.userAnswers[qid].attemptCount) || 0;
    this.userAnswers[qid] = {
      selectedKey: selectedKey,
      isCorrect: isCorrect,
      attemptCount: prevAttempts + 1
    };

    this.saveState();
    this.render();

    if (this.isTestCompleted()) {
      const totalQ = this.testData.questions.length;
      const answeredCount = Object.keys(this.userAnswers).length;
      if (answeredCount === totalQ && questionIndex === totalQ - 1) {
        setTimeout(() => this.openResultsModal(), 600);
      }
    }
  }

  isTestCompleted() {
    if (!this.testData || !this.testData.questions) return false;
    return Object.keys(this.userAnswers).length === this.testData.questions.length;
  }

  calculateScore() {
    if (!this.testData || !this.testData.questions) return { score: 0, total: 0, percent: 0 };
    const total = this.testData.questions.length;
    let correctCount = 0;
    this.testData.questions.forEach(q => {
      if (this.firstTryAnswers[q.id] === true) correctCount += 1;
    });
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return { score: correctCount, total, percent };
  }

  getMissedQuestions() {
    if (!this.testData || !this.testData.questions) return [];
    return this.testData.questions.filter(q => {
      const state = this.userAnswers[q.id];
      return state && !this.firstTryAnswers[q.id];
    });
  }

  render() {
    const root = document.getElementById(this.containerId);
    if (!root) return;
    if (!this.testData) {
      root.innerHTML = `<div class="question-card"><p>Loading test module...</p></div>`;
      return;
    }

    const { score, total, percent } = this.calculateScore();
    const answeredCount = Object.keys(this.userAnswers).length;

    let html = `
      <nav class="nav-breadcrumbs">
        <a href="index.html">← ${this.escapeHtml('Tatra Sales and Engineering')} Portal</a>
        <span>/</span>
        <span>${this.escapeHtml(this.testData.level)}</span>
        <span>/</span>
        <span>${this.escapeHtml(this.testData.test_id)}</span>
      </nav>

      <header class="test-meta-card">
        <div class="test-badge-row">
          <span class="badge badge-level-${this.testData.level.toLowerCase().replace('/', '-')}">${this.escapeHtml(this.testData.level)}</span>
          <span class="badge badge-track">${this.escapeHtml(this.testData.workplace_track)}</span>
          <span class="badge badge-specialized">${this.escapeHtml(this.testData.category.toUpperCase())}</span>
        </div>
        <h1 class="test-title">${this.escapeHtml(this.testData.title)}</h1>
        <p class="test-description">${this.escapeHtml(this.testData.description)}</p>
        <div class="test-meta-stats">
          <div>⏱ <strong>${this.testData.estimated_time_minutes || 15} min</strong></div>
          <div>📋 <strong>${this.testData.questions.length} Questions</strong></div>
          <div>🎯 Score: <strong>${score}/${total} (${percent}%)</strong></div>
        </div>
      </header>

      <div class="toolbar-card">
        <div class="view-toggle-group">
          <button class="view-btn ${this.viewMode === 'step' ? 'active' : ''}" id="btn-view-step">Step-by-Step</button>
          <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" id="btn-view-list">List View</button>
        </div>

        <div class="progress-summary-box">
          <div class="progress-bar-outer">
            <div class="progress-bar-fill" style="width: ${(answeredCount / total) * 100}%"></div>
          </div>
          <span class="progress-text">${answeredCount} / ${total} answered</span>
        </div>

        <div>
          <button class="btn btn-secondary" id="btn-open-results">📊 Results</button>
          <button class="btn btn-export" id="btn-export-notebooklm">📓 NotebookLM Export</button>
          <button class="btn btn-reset" id="btn-reset-test">↺ Reset</button>
        </div>
      </div>

      <nav class="question-nav-strip">
        ${this.testData.questions.map((q, idx) => {
          const ans = this.userAnswers[q.id];
          let statusClass = '';
          if (ans) {
            statusClass = this.firstTryAnswers[q.id] ? 'answered-correct' : 'answered-wrong';
          }
          if (this.viewMode === 'step' && idx === this.currentQuestionIndex) {
            statusClass += ' current';
          }
          return `<button class="nav-dot ${statusClass}" data-q-idx="${idx}">${idx + 1}</button>`;
        }).join('')}
      </nav>

      <main class="test-content-area">
        ${this.viewMode === 'step' 
          ? this.renderSingleQuestion(this.currentQuestionIndex) 
          : this.testData.questions.map((_, idx) => this.renderSingleQuestion(idx)).join('')}
      </main>
    `;

    root.innerHTML = html;
    this.attachEventListeners();
  }

  renderSingleQuestion(index) {
    const q = this.testData.questions[index];
    if (!q) return '';

    const ansState = this.userAnswers[q.id];
    const isAnswered = Boolean(ansState);
    const selectedKey = ansState ? ansState.selectedKey : null;
    const isCorrect = ansState ? ansState.isCorrect : false;

    const formattedPrompt = this.escapeHtml(q.prompt).replace(/_{3,}/g, '<span class="blank-slot">_______</span>');

    let optionsHtml = q.options.map(opt => {
      let optClass = 'option-btn';
      let statusIndicator = '';

      if (isAnswered) {
        if (opt.key === selectedKey) {
          optClass += isCorrect ? ' selected-correct' : ' selected-wrong';
          statusIndicator = isCorrect ? ' ✓' : ' ✕';
        } else if (!isCorrect && opt.key === q.correct_key) {
          optClass += ' is-revealed-correct';
          statusIndicator = ' (Correct)';
        }
      }

      return `
        <button class="${optClass}" data-q-idx="${index}" data-opt-key="${opt.key}">
          <span class="option-letter">${opt.key}</span>
          <span class="option-text">${this.escapeHtml(opt.text)}${statusIndicator}</span>
        </button>
      `;
    }).join('');

    let guidanceHtml = '';
    if (isAnswered) {
      if (isCorrect) {
        guidanceHtml = `
          <div class="guidance-box guidance-correct">
            <div class="guidance-header">✓ Correct Answer! (Option ${q.correct_key})</div>
            <div class="guidance-section"><strong>Technical Rationale:</strong> ${this.escapeHtml(q.explanations.correct)}</div>
            <div class="cz-note-card">
              <span>💡</span>
              <div><strong>Czech Contrastive Insight:</strong> ${this.escapeHtml(q.cz_learning_point)}</div>
            </div>
          </div>
        `;
      } else {
        const wrongExp = q.explanations[`wrong_${selectedKey}`] || 'This choice does not fit the required grammar aspect or register.';
        guidanceHtml = `
          <div class="guidance-box guidance-wrong">
            <div class="guidance-header">✕ Incorrect Selection (Option ${selectedKey})</div>
            <div class="guidance-section"><strong>Why Option ${selectedKey} is wrong:</strong> ${this.escapeHtml(wrongExp)}</div>
            <div class="guidance-section"><strong>Correct Solution (${q.correct_key}):</strong> ${this.escapeHtml(q.explanations.correct)}</div>
            <div class="cz-note-card">
              <span>⚠️</span>
              <div><strong>Czech Interference / Contrastive Note:</strong> ${this.escapeHtml(q.cz_learning_point)}</div>
            </div>
            <div class="corp-example-card">
              <strong>Workplace Application:</strong> Crucial for accurate reporting in ${this.escapeHtml(q.workplace_track)}.
            </div>
          </div>
        `;
      }
    }

    let stepNavHtml = '';
    if (this.viewMode === 'step') {
      const isFirst = index === 0;
      const isLast = index === this.testData.questions.length - 1;
      stepNavHtml = `
        <footer class="step-nav-footer">
          <button class="btn btn-secondary" id="btn-prev-q" ${isFirst ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>← Previous</button>
          <span>Question ${index + 1} of ${this.testData.questions.length}</span>
          ${isLast ? '<button class="btn btn-primary" id="btn-finish-test">Complete Test →</button>' : '<button class="btn btn-primary" id="btn-next-q">Next →</button>'}
        </footer>
      `;
    }

    return `
      <article class="question-card" id="q-card-${index}">
        <header class="question-card-header">
          <span>Question ${index + 1} of ${this.testData.questions.length} (${q.id})</span>
          <span class="question-track-tag">${this.escapeHtml(q.workplace_track)}</span>
        </header>
        <div class="question-prompt">${formattedPrompt}</div>
        <div class="options-list">${optionsHtml}</div>
        ${guidanceHtml}
        ${stepNavHtml}
      </article>
    `;
  }

  attachEventListeners() {
    const btnStep = document.getElementById('btn-view-step');
    if (btnStep) btnStep.onclick = () => this.setViewMode('step');
    const btnList = document.getElementById('btn-view-list');
    if (btnList) btnList.onclick = () => this.setViewMode('list');
    const btnReset = document.getElementById('btn-reset-test');
    if (btnReset) btnReset.onclick = () => this.resetTest();
    const btnResults = document.getElementById('btn-open-results');
    if (btnResults) btnResults.onclick = () => this.openResultsModal();
    const btnExport = document.getElementById('btn-export-notebooklm');
    if (btnExport) btnExport.onclick = () => this.exportNotebookLM();

    document.querySelectorAll('.nav-dot').forEach(btn => {
      btn.onclick = (e) => this.goToQuestion(parseInt(e.currentTarget.getAttribute('data-q-idx'), 10));
    });

    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.onclick = (e) => {
        const qIdx = parseInt(e.currentTarget.getAttribute('data-q-idx'), 10);
        const optKey = e.currentTarget.getAttribute('data-opt-key');
        this.handleAnswerSelect(qIdx, optKey);
      };
    });

    const btnPrev = document.getElementById('btn-prev-q');
    if (btnPrev) btnPrev.onclick = () => { if (this.currentQuestionIndex > 0) { this.currentQuestionIndex--; this.render(); window.scrollTo({ top: 120, behavior: 'smooth' }); } };
    const btnNext = document.getElementById('btn-next-q');
    if (btnNext) btnNext.onclick = () => { if (this.currentQuestionIndex < this.testData.questions.length - 1) { this.currentQuestionIndex++; this.render(); window.scrollTo({ top: 120, behavior: 'smooth' }); } };
    const btnFinish = document.getElementById('btn-finish-test');
    if (btnFinish) btnFinish.onclick = () => this.openResultsModal();
  }

  goToQuestion(idx) {
    if (idx < 0 || idx >= this.testData.questions.length) return;
    this.currentQuestionIndex = idx;
    if (this.viewMode === 'step') {
      this.render();
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      const card = document.getElementById(`q-card-${idx}`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  openResultsModal() {
    const { score, total, percent } = this.calculateScore();
    const missed = this.getMissedQuestions();

    let rating = 'Need More Practice';
    let ratingColor = '#ef4444';
    if (percent >= 90) { rating = 'Mastery / Certified'; ratingColor = '#10b981'; }
    else if (percent >= 75) { rating = 'Strong Proficiency'; ratingColor = '#990011'; }
    else if (percent >= 60) { rating = 'Satisfactory Baseline'; ratingColor = '#f59e0b'; }

    const modalHtml = `
      <div class="results-modal-backdrop" id="results-modal">
        <div class="results-modal-content">
          <div style="text-align: center; margin-bottom: 24px;">
            <div class="results-score-circle">
              <span class="score-num">${percent}%</span>
              <span class="score-label">First-Try</span>
            </div>
            <h2 style="color: ${ratingColor}; margin-bottom: 6px;">${rating}</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Module: <strong>${this.escapeHtml(this.testData.title)}</strong> (${this.escapeHtml(this.testData.test_id)})
            </p>
          </div>

          <div class="results-breakdown">
            <div class="results-stat-box"><div style="font-size:1.3rem; font-weight:700; color:#10b981;">${score}</div><div>Correct First-Try</div></div>
            <div class="results-stat-box"><div style="font-size:1.3rem; font-weight:700; color:#ef4444;">${total - score}</div><div>Review Needed</div></div>
            <div class="results-stat-box"><div style="font-size:1.3rem; font-weight:700;">${total}</div><div>Total Items</div></div>
          </div>

          ${missed.length > 0 ? `
            <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:var(--radius-md); padding:16px; margin-bottom:20px;">
              <h3 style="color:#9f1239; font-size:0.95rem; margin-bottom:8px;">Recommended Focus Areas:</h3>
              <ul style="padding-left:20px; font-size:0.88rem; color:#4c0519;">
                ${missed.map(m => `<li><strong>${m.id}:</strong> ${this.escapeHtml(m.cz_learning_point)}</li>`).join('')}
              </ul>
            </div>
          ` : '<div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:var(--radius-md); padding:16px; margin-bottom:20px; text-align:center; color:#065f46;">🎉 Outstanding! 100% first-try accuracy.</div>'}

          <div class="modal-actions">
            <button class="btn btn-export" id="modal-btn-export">📓 Generate NotebookLM Study Guide</button>
            <button class="btn btn-secondary" id="modal-btn-close">Close</button>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById('results-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('modal-btn-close').onclick = () => document.getElementById('results-modal').remove();
    document.getElementById('modal-btn-export').onclick = () => this.exportNotebookLM();
  }

  generateNotebookLMMarkdown() {
    const { score, total, percent } = this.calculateScore();
    const missed = this.getMissedQuestions();
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let md = `# ${this.testData.title} - Study Digest\n`;
    md += `**Program:** Tatra Sales and Engineering (TATRA TRUCKS a.s.) | **Module:** ${this.testData.test_id} | **Level:** ${this.testData.level} | **Date:** ${dateStr}\n`;
    md += `**Track:** ${this.testData.workplace_track} | **First-Try Score:** ${score}/${total} (${percent}%)\n\n---\n\n`;

    md += `## Executive Diagnostic Summary\n`;
    md += `This customized study digest is generated for technical sales representatives, international defense tender negotiators, and export logistics managers at Tatra Trucks.\n`;
    md += `It isolates contrastive grammar interference (Czenglish) and specific technical vocabulary gaps recorded during the assessment.\n\n`;

    if (missed.length > 0) {
      md += `### Items Requiring Reinforcement (${missed.length} items):\n\n`;
      missed.forEach((q, idx) => {
        const userState = this.userAnswers[q.id];
        const chosenKey = userState ? userState.selectedKey : 'None';
        const chosenOpt = q.options.find(o => o.key === chosenKey);
        const correctOpt = q.options.find(o => o.key === q.correct_key);

        md += `#### ${idx + 1}. ${q.id} (${q.workplace_track})\n`;
        md += `* **Prompt:** "${q.prompt}"\n`;
        md += `* **Selected Choice:** [${chosenKey}] "${chosenOpt ? chosenOpt.text : 'N/A'}" *(Incorrect)*\n`;
        md += `* **Correct Option:** [${q.correct_key}] "${correctOpt ? correctOpt.text : ''}"\n`;
        md += `* **Why the chosen option is wrong:** ${q.explanations['wrong_' + chosenKey] || 'Grammatical mismatch.'}\n`;
        md += `* **Correct Rationale:** ${q.explanations.correct}\n`;
        md += `* **Czech Contrastive Linguistic Note:** ${q.cz_learning_point}\n\n`;
      });
    }

    md += `## Complete Question Bank\n\n`;
    this.testData.questions.forEach((q, idx) => {
      md += `### ${idx + 1}. [${q.id}] ${q.prompt}\n`;
      q.options.forEach(opt => {
        const isCorrect = (opt.key === q.correct_key);
        md += `  * ${opt.key}) ${opt.text}${isCorrect ? ' **[CORRECT]**' : ''}\n`;
      });
      md += `\n* **Explanation:** ${q.explanations.correct}\n`;
      md += `* **Czech Note:** ${q.cz_learning_point}\n\n`;
    });

    md += `---\n\n## Recommended NotebookLM Audio Overview Prompt\n`;
    md += `> *"Act as two senior professional trainers debriefing Czech professionals from TATRA TRUCKS a.s. on the module '${this.testData.title}'. Focus on the contrastive linguistic mistakes made by Czech native speakers, explain why these errors occur, and model how to express these concepts with precision in authentic workplace scenarios."*\n`;

    return md;
  }

  exportNotebookLM() {
    const mdContent = this.generateNotebookLMMarkdown();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mdContent).then(() => this.showToast('Copied Study Digest to clipboard!')).catch(() => {});
    }
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${this.testData.test_id}_Study_Digest.md`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    this.showToast('Downloaded Study Digest (.md) for NotebookLM!');
  }

  showToast(msg) {
    const existing = document.querySelector('.toast-notice');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-notice';
    toast.innerHTML = `<span>📋</span> <span>${this.escapeHtml(msg)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast && toast.parentNode) toast.remove(); }, 3500);
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}

window.SuiteTestEngine = SuiteTestEngine;
