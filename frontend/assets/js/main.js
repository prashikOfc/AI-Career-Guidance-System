/* AI-Based Career Guidance System - main.js (Classic Modern & Admin/User Sessions) */

const API_BASE_URL = 'http://localhost:5000/api';
let serverOnline = false;
let userSession = null;

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Load Active Session
  const sessionStr = localStorage.getItem('userSession');
  if (sessionStr) {
    userSession = JSON.parse(sessionStr);
  }

  // Route Guards
  handlePageGuards();

  initTheme();
  checkServerStatus().then(() => {
    setupAuthModal();
    initChatbot();
    
    // Page-specific initializers based on element existence
    if (document.getElementById('assessment-form')) {
      initAssessmentWizard();
    }
    if (document.getElementById('result-page-container')) {
      initResultsPage();
    }
    if (document.getElementById('resume-page-container')) {
      initResumeAnalyzer();
    }
    if (document.getElementById('dashboard-page-container')) {
      initDashboard();
    }
    if (document.getElementById('admin-page-container')) {
      initAdminPanel();
    }
  });

  // AOS animation init
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 600,
      once: true,
      easing: 'ease-out'
    });
  }
});

/* ==========================================================================
   0. Session Access Redirection Guards
   ========================================================================== */
function handlePageGuards() {
  const currentPath = window.location.pathname.toLowerCase();
  
  const requiresLogin = currentPath.includes('dashboard.html') ||
                        currentPath.includes('assessment.html') ||
                        currentPath.includes('resume.html') ||
                        currentPath.includes('result.html') ||
                        currentPath.includes('admin.html');
                        
  if (requiresLogin && !userSession) {
    alert("Please Sign In to access this page.");
    window.location.href = 'index.html?triggerAuth=true';
  } else if (currentPath.includes('admin.html') && userSession?.role !== 'admin') {
    alert("Access Denied. Administrator credentials are required.");
    window.location.href = 'index.html';
  }
}

/* ==========================================================================
   1. Server Connectivity & Dynamic Auth Injection
   ========================================================================== */
async function checkServerStatus() {
  const dbStatusContainer = document.getElementById('db-status-container');
  try {
    const res = await fetch(`${API_BASE_URL}/status`);
    if (res.ok) {
      const data = await res.json();
      serverOnline = true;
      if (dbStatusContainer) {
        if (data.db_type === 'mysql') {
          dbStatusContainer.innerHTML = `<span class="db-badge db-mysql" title="MySQL Connected"><i class="bi bi-database-fill-check"></i> MySQL Connected</span>`;
        } else {
          dbStatusContainer.innerHTML = '';
        }
      }
    } else {
      throw new Error();
    }
  } catch (e) {
    serverOnline = false;
    if (dbStatusContainer) {
      dbStatusContainer.innerHTML = `<span class="db-badge bg-secondary text-white" title="Server offline, running in offline browser sandbox"><i class="bi bi-database-slash"></i> Offline Mode</span>`;
    }
  }
}

function setupAuthModal() {
  // Inject Auth Modal dynamically if not exists (Login / Register / Admin Login tabs)
  if (!document.getElementById('syncModal')) {
    const modalHTML = `
      <div class="modal fade" id="syncModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content glass-card" style="border: 1px solid var(--glass-border);">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold" id="authModalLabel"><i class="bi bi-shield-lock-fill text-gradient me-2"></i>Account Synchronization</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" style="filter: invert(1);"></button>
            </div>
            <div class="modal-body py-4">
              <!-- Navigation Tabs -->
              <ul class="nav nav-tabs border-bottom border-secondary border-opacity-10 mb-3" id="authTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active py-2 border-0 bg-transparent" id="login-tab" data-bs-toggle="tab" data-bs-target="#login-panel" type="button" role="tab" aria-controls="login-panel" aria-selected="true">Sign In</button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link py-2 border-0 bg-transparent" id="register-tab" data-bs-toggle="tab" data-bs-target="#register-panel" type="button" role="tab" aria-controls="register-panel" aria-selected="false">Register</button>
                </li>
              </ul>
              
              <!-- Tab Panels -->
              <div class="tab-content" id="authTabContent">
                <!-- SIGN IN PANEL -->
                <div class="tab-pane fade show active" id="login-panel" role="tabpanel" aria-labelledby="login-tab">
                  <form id="login-form">
                    <div class="mb-3">
                      <label for="login-email" class="form-label small text-muted">Email Address</label>
                      <input type="email" class="form-control glass-input" id="login-email" required placeholder="e.g. candidate@example.com">
                    </div>
                    <div class="mb-3">
                      <label for="login-password" class="form-label small text-muted">Password</label>
                      <input type="password" class="form-control glass-input" id="login-password" required placeholder="••••••••">
                    </div>
                    <div id="login-message" class="small mt-2" style="display: none;"></div>
                    <button type="submit" class="btn btn-cyber w-100 mt-3" id="login-submit-btn">Sign In</button>
                  </form>
                </div>
                
                <!-- REGISTER PANEL -->
                <div class="tab-pane fade" id="register-panel" role="tabpanel" aria-labelledby="register-tab">
                  <form id="register-form">
                    <div class="mb-3">
                      <label for="reg-name" class="form-label small text-muted">Full Name</label>
                      <input type="text" class="form-control glass-input" id="reg-name" required placeholder="Jane Doe">
                    </div>
                    <div class="mb-3">
                      <label for="reg-email" class="form-label small text-muted">Email Address</label>
                      <input type="email" class="form-control glass-input" id="reg-email" required placeholder="jane@example.com">
                    </div>
                    <div class="mb-3">
                      <label for="reg-password" class="form-label small text-muted">Password (Min. 6 chars)</label>
                      <input type="password" class="form-control glass-input" id="reg-password" minlength="6" required placeholder="••••••••">
                    </div>
                    <div class="row">
                      <div class="col-6 mb-3">
                        <label for="reg-age" class="form-label small text-muted">Age</label>
                        <input type="number" class="form-control glass-input" id="reg-age" required min="10" max="99" value="21">
                      </div>
                      <div class="col-6 mb-3">
                        <label for="reg-gpa" class="form-label small text-muted">GPA / Grade</label>
                        <input type="text" class="form-control glass-input" id="reg-gpa" required placeholder="3.8/4.0">
                      </div>
                    </div>
                    <div class="mb-3">
                      <label for="reg-degree" class="form-label small text-muted">Academic Credentials</label>
                      <select class="form-select glass-input text-white bg-dark" id="reg-degree" style="background-color: var(--card-bg) !important;">
                        <option value="High School">High School</option>
                        <option value="Bachelor's" selected>Bachelor's Degree</option>
                        <option value="Master's">Master's Degree</option>
                        <option value="Doctorate">PhD / Doctorate</option>
                      </select>
                    </div>
                    <div id="reg-message" class="small mt-2" style="display: none;"></div>
                    <button type="submit" class="btn btn-cyber w-100 mt-3" id="reg-submit-btn">Create Account</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Navbar Session Render (Inject Profile Dropdown menu and a visible Sign Out button)
  const navSyncBtn = document.getElementById('nav-sync-btn');
  if (navSyncBtn) {
    if (userSession) {
      // Replace Auth button with a beautiful profile dropdown menu and a separate, clear Sign Out button next to it!
      const navItem = navSyncBtn.parentElement;
      navItem.innerHTML = `
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <div class="dropdown">
            <button class="btn btn-cyber-purple py-1 px-3 dropdown-toggle d-flex align-items-center" type="button" id="sessionDropdown" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-person-circle me-1 text-gradient"></i> ${userSession.name}
            </button>
            <ul class="dropdown-menu dropdown-menu-end glass-card p-2" aria-labelledby="sessionDropdown" style="background: var(--card-bg); border: 1px solid var(--glass-border); min-width: 220px;">
              <li><span class="dropdown-item-text small text-muted text-truncate d-block">${userSession.email}</span></li>
              <li><span class="dropdown-item-text small badge bg-secondary-subtle text-secondary py-1 px-2 mb-2 d-inline-block">${userSession.role === 'admin' ? 'Administrator' : 'Student'}</span></li>
              ${userSession.role === 'admin' ? '<li><a class="dropdown-item rounded text-white py-2 small" href="admin.html"><i class="bi bi-shield-fill me-2 text-gradient"></i>Admin Portal</a></li>' : ''}
              <li><a class="dropdown-item rounded text-white py-2 small" href="dashboard.html"><i class="bi bi-grid-fill me-2 text-gradient"></i>Dashboard</a></li>
              <li><hr class="dropdown-divider border-secondary border-opacity-10"></li>
              <li><button class="dropdown-item text-danger rounded py-2 small" id="logout-btn-dropdown"><i class="bi bi-box-arrow-right me-2"></i>Sign Out</button></li>
            </ul>
          </div>
          <button class="btn btn-logout py-1 px-3 d-flex align-items-center" id="logout-btn" title="Sign Out of account">
            <i class="bi bi-box-arrow-right me-1"></i> Sign Out
          </button>
        </div>
      `;

      // Log out handler
      const performLogout = () => {
        localStorage.removeItem('userSession');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('lastAssessment');
        localStorage.removeItem('assessmentsHistory');
        localStorage.removeItem('savedCareers');
        localStorage.removeItem('lastATSScan');
        window.location.href = 'index.html';
      };

      document.getElementById('logout-btn').addEventListener('click', performLogout);
      const logoutDropdownBtn = document.getElementById('logout-btn-dropdown');
      if (logoutDropdownBtn) {
        logoutDropdownBtn.addEventListener('click', performLogout);
      }
    } else {
      // If index requested a login pop-up, trigger it
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('triggerAuth') === 'true') {
        const modal = new bootstrap.Modal(document.getElementById('syncModal'));
        modal.show();
      }
    }
  }

  // Register Submit Handler
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const age = parseInt(document.getElementById('reg-age').value);
      const degree = document.getElementById('reg-degree').value;
      const gpa = document.getElementById('reg-gpa').value.trim();
      const msg = document.getElementById('reg-message');
      const submitBtn = document.getElementById('reg-submit-btn');

      submitBtn.setAttribute('disabled', 'true');
      submitBtn.textContent = 'Registering...';
      msg.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, age, degree, gpa })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          localStorage.setItem('userSession', JSON.stringify(data.session));
          localStorage.setItem('userProfile', JSON.stringify({
            name, email, age, degree, gpa, role: 'user'
          }));
          
          // Clear any historical data left in storage
          localStorage.removeItem('lastAssessment');
          localStorage.removeItem('assessmentsHistory');
          localStorage.removeItem('savedCareers');
          localStorage.removeItem('lastATSScan');

          msg.className = 'small mt-2 text-success';
          msg.textContent = 'Account created successfully! Redirecting...';
          msg.style.display = 'block';
          
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1200);
        } else {
          throw new Error(data.error || 'Registration failed');
        }
      } catch (err) {
        msg.className = 'small mt-2 text-danger';
        msg.textContent = err.message;
        msg.style.display = 'block';
        submitBtn.removeAttribute('disabled');
        submitBtn.textContent = 'Create Account';
      }
    });
  }

  // Login Submit Handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const msg = document.getElementById('login-message');
      const submitBtn = document.getElementById('login-submit-btn');

      submitBtn.setAttribute('disabled', 'true');
      submitBtn.textContent = 'Signing In...';
      msg.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('userSession', JSON.stringify(data.session));

          // Fetch user historical logs from MySQL backend and sync
          const syncRes = await fetch(`${API_BASE_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.exists) {
              localStorage.setItem('userProfile', JSON.stringify(syncData.user));
              if (syncData.assessments && syncData.assessments.length > 0) {
                localStorage.setItem('lastAssessment', JSON.stringify(syncData.assessments[0]));
                localStorage.setItem('assessmentsHistory', JSON.stringify(syncData.assessments));
              } else {
                localStorage.removeItem('lastAssessment');
                localStorage.removeItem('assessmentsHistory');
              }
              localStorage.setItem('savedCareers', JSON.stringify(syncData.saved_careers || []));
              if (syncData.resume_scans && syncData.resume_scans.length > 0) {
                localStorage.setItem('lastATSScan', JSON.stringify(syncData.resume_scans[0]));
              } else {
                localStorage.removeItem('lastATSScan');
              }
            }
          }

          msg.className = 'small mt-2 text-success';
          msg.textContent = 'Signed in successfully! Syncing dashboard...';
          msg.style.display = 'block';

          setTimeout(() => {
            if (data.session.role === 'admin') {
              window.location.href = 'admin.html';
            } else {
              window.location.href = 'dashboard.html';
            }
          }, 1200);
        } else {
          throw new Error(data.error || 'Authentication failed');
        }
      } catch (err) {
        msg.className = 'small mt-2 text-danger';
        msg.textContent = err.message;
        msg.style.display = 'block';
        submitBtn.removeAttribute('disabled');
        submitBtn.textContent = 'Sign In';
      }
    });
  }
}

/* ==========================================================================
   2. Dark/Light Theme Manager
   ========================================================================== */
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', currentTheme);
  updateThemeIcon(themeToggle, currentTheme);

  themeToggle.addEventListener('click', () => {
    const activeTheme = document.body.getAttribute('data-theme');
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(themeToggle, newTheme);
    
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
  });
}

function updateThemeIcon(btn, theme) {
  const icon = btn.querySelector('i');
  if (!icon) return;
  if (theme === 'light') {
    icon.className = 'bi bi-moon-fill';
  } else {
    icon.className = 'bi bi-sun-fill';
  }
}

/* ==========================================================================
   3. Dynamic AI Counseling Chatbot
   ========================================================================== */
function initChatbot() {
  const bubble = document.getElementById('chatbot-bubble');
  const dialog = document.getElementById('chatbot-dialog');
  const closeBtn = document.getElementById('chatbot-close');
  const sendBtn = document.getElementById('chatbot-send');
  const inputField = document.getElementById('chatbot-input');
  const body = document.getElementById('chatbot-body');

  if (!bubble || !dialog) return;

  bubble.addEventListener('click', async () => {
    dialog.classList.toggle('active');
    if (dialog.classList.contains('active')) {
      inputField.focus();
      
      const email = userSession?.email;
      if (email && serverOnline) {
        body.innerHTML = '<div class="text-center py-4 text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>Loading counseling logs...</div>';
        try {
          const res = await fetch(`${API_BASE_URL}/chat?email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const data = await res.json();
            body.innerHTML = '';
            if (data.chats && data.chats.length > 0) {
              data.chats.forEach(c => appendMessage(c.sender, c.message));
            } else {
              appendMessage('bot', 'Hello! I am your AI Career Mentor. Ask me any question about fields, skills, resumes, or learning roadmaps.');
            }
          }
        } catch (e) {
          body.innerHTML = '';
          appendMessage('bot', 'Hello! I am your AI Career Mentor. Ask me any question about fields, skills, resumes, or learning roadmaps.');
        }
      } else {
        if (body.children.length === 0) {
          appendMessage('bot', 'Hello! I am your AI Career Mentor. Ask me any question about fields, skills, resumes, or learning roadmaps.');
        }
      }
      body.scrollTop = body.scrollHeight;
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dialog.classList.remove('active');
    });
  }

  const handleMessageSend = async () => {
    const text = inputField.value.trim();
    if (!text) return;

    appendMessage('user', text);
    inputField.value = '';
    body.scrollTop = body.scrollHeight;

    // Append Typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-msg bot typing-indicator d-flex align-items-center';
    typingDiv.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style="font-size: 0.6rem;"></span>Thinking...';
    body.appendChild(typingDiv);
    body.scrollTop = body.scrollHeight;

    let response = '';
    let isGeminiUsed = false;
    let apiKeyMissing = false;

    if (serverOnline) {
      try {
        const email = userSession?.email;
        const res = await fetch(`${API_BASE_URL}/chat/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: text,
            email: email || null
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            response = data.response;
            isGeminiUsed = true;
          } else if (data.error === 'API_KEY_NOT_CONFIGURED') {
            apiKeyMissing = true;
          }
        } else {
          try {
            const errData = await res.json();
            console.error("Server API returned error:", errData.error);
          } catch (e) {
            console.error("Server API error response status:", res.status);
          }
        }
      } catch (err) {
        console.error("Gemini API server communication error:", err);
      }
    }

    // Remove typing indicator
    if (typingDiv.parentNode) {
      typingDiv.parentNode.removeChild(typingDiv);
    }

    if (!isGeminiUsed) {
      const mockResponse = getMockAIResponse(text);
      response = mockResponse + (apiKeyMissing ? "\n\n(Note: Set API_KEY on the server to enable real-time live AI counseling.)" : "");
    }

    appendMessage('bot', response);
    body.scrollTop = body.scrollHeight;

    const email = userSession?.email;
    if (email && serverOnline) {
      try {
        await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, message: text, bot_response: response })
        });
      } catch (e) {}
    }
  };

  if (sendBtn) {
    sendBtn.addEventListener('click', handleMessageSend);
  }

  if (inputField) {
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleMessageSend();
      }
    });
  }
}

function appendMessage(sender, text) {
  const body = document.getElementById('chatbot-body');
  if (!body) return;
  
  // Ensure a flexbox spacer is present at the top to act as a spring
  let spacer = body.querySelector('.chatbot-spacer');
  if (!spacer) {
    spacer = document.createElement('div');
    spacer.className = 'chatbot-spacer';
    body.appendChild(spacer);
  }
  
  const msg = document.createElement('div');
  msg.className = `chatbot-msg ${sender}`;
  if (sender === 'bot') {
    msg.innerHTML = formatMarkdown(text);
  } else {
    msg.textContent = text;
  }
  body.appendChild(msg);
  
  // Clean scroll to bottom
  setTimeout(() => {
    body.scrollTop = body.scrollHeight;
  }, 50);
}

function formatMarkdown(text) {
  // Simple secure markdown parser for headers, bullet lists, numbers, bold, and paragraphs
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  // Bold
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Inline code
  escaped = escaped.replace(/`(.*?)`/g, '<code>$1</code>');

  const lines = escaped.split('\n');
  let inList = false;
  let htmlResult = [];

  for (let line of lines) {
    let trimmed = line.trim();
    
    // Check for headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      if (inList) {
        htmlResult.push('</ul>');
        inList = false;
      }
      const level = headingMatch[1].length;
      const headingTag = level <= 3 ? 'h5' : 'h6';
      htmlResult.push(`<${headingTag} class="fw-bold mt-3 mb-2" style="color: var(--accent-secondary);">${headingMatch[2]}</${headingTag}>`);
      continue;
    }

    // Check for bullet items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      if (!inList) {
        htmlResult.push('<ul class="mb-2 ps-3">');
        inList = true;
      }
      let itemContent = trimmed.replace(/^[-*•]\s+/, '');
      htmlResult.push(`<li>${itemContent}</li>`);
    } else {
      if (inList) {
        htmlResult.push('</ul>');
        inList = false;
      }
      
      // Check for numbered list items
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        htmlResult.push(`<div class="mb-2"><strong>${numMatch[1]}.</strong> ${numMatch[2]}</div>`);
      } else if (trimmed) {
        htmlResult.push(`<p class="mb-2">${trimmed}</p>`);
      }
    }
  }
  if (inList) {
    htmlResult.push('</ul>');
  }
  
  return htmlResult.join('\n');
}


function getMockAIResponse(input) {
  const query = input.toLowerCase();
  
  if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
    return 'Hi there! How can I assist you with your career exploration today?';
  }
  if (query.includes('resume') || query.includes('cv') || query.includes('ats')) {
    return 'To optimize your resume for ATS scanners: 1. Keep it to a clean single column layout. 2. Use exact keywords from the job description. 3. Quantify achievements (e.g., "Increased sales by 25%").';
  }
  if (query.includes('software') || query.includes('developer') || query.includes('code') || query.includes('programming')) {
    return 'Software Development is a highly sought career with a 22% growth projection. I recommend mastering HTML/CSS/JS first, then diving into modern libraries like React, Node.js, and version control (Git).';
  }
  if (query.includes('data') || query.includes('scientist') || query.includes('analytics')) {
    return 'Data Science commands high salaries (median $122,000). You should focus on Python programming, database SQL integration, and machine learning techniques via packages like Pandas and Scikit-Learn.';
  }
  if (query.includes('design') || query.includes('ux') || query.includes('ui')) {
    return 'UI/UX Design centers on empathy and user behavior. Start by learning Figma tools, researching layout grids, and building user journeys to compose a visual design portfolio.';
  }
  if (query.includes('roadmap') || query.includes('learn')) {
    return 'To build a learning roadmap, select a career target, break it down into core domains, and choose courses. You can take our Career Test to generate a personalized timeline.';
  }
  if (query.includes('counseling') || query.includes('booking') || query.includes('expert')) {
    return 'You can configure sessions with professional practitioners under the dashboard and book mock interviews!';
  }

  return "That's an interesting question! We can map your interests to skills through our main Assessment Form. Give it a try!";
}

/* ==========================================================================
   4. Career Assessment Wizard (Multi-Step Form)
   ========================================================================== */
function initAssessmentWizard() {
  const form = document.getElementById('assessment-form');
  const steps = Array.from(document.querySelectorAll('.wizard-step'));
  const bubbles = Array.from(document.querySelectorAll('.step-bubble'));
  const progressBar = document.getElementById('wizard-progress-bar');
  
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  
  let currentStep = 1;
  const totalSteps = steps.length;

  // Pre-fill user profile fields if logged in and hide password field
  const nameField = document.getElementById('stud-name');
  const emailField = document.getElementById('stud-email');
  const ageField = document.getElementById('stud-age');
  
  if (userSession) {
    if (nameField) {
      nameField.value = userSession.name;
      nameField.setAttribute('readonly', 'true');
    }
    if (emailField) {
      emailField.value = userSession.email;
      emailField.setAttribute('readonly', 'true');
    }
    
    // Hide password field wrapper if present
    const pwWrapper = document.getElementById('password-field-wrapper');
    if (pwWrapper) pwWrapper.style.display = 'none';

    // If we have previous assessment metadata, pre-fill age
    const lastAssessment = JSON.parse(localStorage.getItem('lastAssessment'));
    if (lastAssessment && lastAssessment.user.age && ageField) {
      ageField.value = lastAssessment.user.age;
    }
  } else {
    // Add password input if user is anonymous to sign them up on submit
    const step1Container = steps[0];
    if (step1Container && !document.getElementById('password-field-wrapper')) {
      const pwFieldHTML = `
        <div class="mb-3" id="password-field-wrapper">
          <label for="stud-password" class="form-label small text-muted">Create Account Password (to save data)</label>
          <input type="password" class="form-control glass-input" id="stud-password" required minlength="6" placeholder="Choose minimum 6 characters">
        </div>
      `;
      // Insert before the end of step 1 fields
      const step1Fields = step1Container.querySelectorAll('.mb-3');
      const lastField = step1Fields[step1Fields.length - 1];
      lastField.insertAdjacentHTML('afterend', pwFieldHTML);
    }
  }
  
  // Interactive Selector Cards
  const cards = document.querySelectorAll('.selector-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      if (type === 'interest' || type === 'goal') {
        card.classList.toggle('selected');
      } else {
        const siblingCards = card.closest('.row').querySelectorAll('.selector-card');
        siblingCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      }
      validateStep(currentStep);
    });
  });

  // Sliders
  const sliders = document.querySelectorAll('.custom-slider');
  sliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const valSpan = document.getElementById(`val-${slider.id}`);
      if (valSpan) valSpan.textContent = `${e.target.value}/5`;
    });
  });

  // Inputs
  const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], input[type="password"]');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      validateStep(currentStep);
    });
  });

  // Radios change event listener to validate step 3 MCQ
  const radios = form.querySelectorAll('input[type="radio"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      validateStep(currentStep);
    });
  });

  // Make the entire MCQ option wrapper card clickable
  const mcqWrappers = document.querySelectorAll('.mcq-option-wrapper');
  mcqWrappers.forEach(wrapper => {
    wrapper.addEventListener('click', (e) => {
      const radio = wrapper.querySelector('input[type="radio"]');
      if (radio && e.target !== radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    });
  });

  // Navigation handlers
  nextBtn.addEventListener('click', () => {
    if (currentStep < totalSteps) {
      if (validateStep(currentStep)) {
        currentStep++;
        updateWizard();
      }
    } else {
      if (validateStep(currentStep)) {
        submitAssessment();
      }
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateWizard();
    }
  });

  updateWizard();

  function updateWizard() {
    steps.forEach((step, index) => {
      step.classList.toggle('active', index === (currentStep - 1));
    });

    bubbles.forEach((bubble, index) => {
      bubble.classList.toggle('active', index === (currentStep - 1));
      bubble.classList.toggle('completed', index < (currentStep - 1));
    });

    const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    if (progressBar) progressBar.style.width = `${progressPercent}%`;

    if (currentStep === 1) {
      prevBtn.setAttribute('disabled', 'true');
    } else {
      prevBtn.removeAttribute('disabled');
    }

    if (currentStep === totalSteps) {
      nextBtn.textContent = 'Submit';
    } else {
      nextBtn.textContent = 'Next';
    }

    validateStep(currentStep);
  }

  function validateStep(stepNum) {
    let isValid = false;
    
    switch (stepNum) {
      case 1:
        const nameVal = document.getElementById('stud-name').value.trim();
        const emailVal = document.getElementById('stud-email').value.trim();
        const ageVal = document.getElementById('stud-age').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        let passValid = true;
        const pwField = document.getElementById('stud-password');
        if (!userSession && pwField) {
          passValid = pwField.value.length >= 6;
        }
        
        isValid = nameVal !== '' && emailRegex.test(emailVal) && ageVal !== '' && passValid;
        break;
      case 2:
        const activeDegree = document.querySelector('.selector-card[data-type="degree"].selected');
        const gpaVal = document.getElementById('stud-gpa').value;
        isValid = !!activeDegree && gpaVal !== '';
        break;
      case 3:
        const commQ1 = document.querySelector('input[name="comm-q1"]:checked');
        const commQ2 = document.querySelector('input[name="comm-q2"]:checked');
        const aptQ1 = document.querySelector('input[name="apt-q1"]:checked');
        const aptQ2 = document.querySelector('input[name="apt-q2"]:checked');
        const iqQ1 = document.querySelector('input[name="iq-q1"]:checked');
        const iqQ2 = document.querySelector('input[name="iq-q2"]:checked');
        isValid = !!(commQ1 && commQ2 && aptQ1 && aptQ2 && iqQ1 && iqQ2);
        break;
      case 4:
        isValid = true;
        break;
      case 5:
        const selectedInterests = document.querySelectorAll('.selector-card[data-type="interest"].selected');
        isValid = selectedInterests.length > 0;
        break;
      case 6:
        const selectedGoals = document.querySelectorAll('.selector-card[data-type="goal"].selected');
        isValid = selectedGoals.length > 0;
        break;
    }

    if (isValid) {
      nextBtn.removeAttribute('disabled');
    } else {
      nextBtn.setAttribute('disabled', 'true');
    }
    return isValid;
  }

  async function submitAssessment() {
    nextBtn.setAttribute('disabled', 'true');
    nextBtn.textContent = 'Saving...';
    
    const name = document.getElementById('stud-name').value.trim();
    const email = document.getElementById('stud-email').value.trim();
    const age = parseInt(document.getElementById('stud-age').value.trim());
    const degree = document.querySelector('.selector-card[data-type="degree"].selected').dataset.val;
    const gpa = document.getElementById('stud-gpa').value.trim();
    
    const password = !userSession ? document.getElementById('stud-password').value : null;

    // Skills
    const coding = parseInt(document.getElementById('skill-coding').value);
    const design = parseInt(document.getElementById('skill-design').value);
    const writing = parseInt(document.getElementById('skill-writing').value);
    const analysis = parseInt(document.getElementById('skill-analysis').value);
    const speaking = parseInt(document.getElementById('skill-speaking').value);

    // Interests
    const interests = Array.from(document.querySelectorAll('.selector-card[data-type="interest"].selected'))
      .map(card => card.dataset.val);

    // Goals
    const goals = Array.from(document.querySelectorAll('.selector-card[data-type="goal"].selected'))
      .map(card => card.dataset.val);

    // Calculate Cognitive Scores from Quiz
    const getCommQ1Score = () => {
      const val = document.querySelector('input[name="comm-q1"]:checked')?.value;
      if (val === 'b') return 5;
      if (val === 'c') return 3;
      if (val === 'a') return 2;
      return 1;
    };
    const getCommQ2Score = () => {
      const val = document.querySelector('input[name="comm-q2"]:checked')?.value;
      if (val === 'b') return 5;
      if (val === 'c') return 3;
      if (val === 'a') return 2;
      return 1;
    };
    const getAptQ1Score = () => {
      return document.querySelector('input[name="apt-q1"]:checked')?.value === 'c' ? 5 : 1;
    };
    const getAptQ2Score = () => {
      return document.querySelector('input[name="apt-q2"]:checked')?.value === 'c' ? 5 : 1;
    };
    const getIqQ1Score = () => {
      return document.querySelector('input[name="iq-q1"]:checked')?.value === 'c' ? 5 : 1;
    };
    const getIqQ2Score = () => {
      return document.querySelector('input[name="iq-q2"]:checked')?.value === 'b' ? 5 : 1;
    };

    const commScore = Math.round((getCommQ1Score() + getCommQ2Score()) / 2);
    const aptScore = Math.round((getAptQ1Score() + getAptQ2Score()) / 2);
    const iqScore = Math.round((getIqQ1Score() + getIqQ2Score()) / 2);

    const careerDatabase = [
      {
        name: 'Software Engineer',
        description: 'Design and build application programs, database logic layers, and infrastructure models.',
        skills: ['coding', 'analysis'],
        medianSalary: 115000,
        growthRate: 22,
        courses: ['Introduction to CS - Harvard CS50', 'Full Stack Web Developer Nanodegree - Udacity'],
        interestTag: 'tech',
        scoreWeight: 0.8
      },
      {
        name: 'Data Scientist',
        description: 'Implement complex algorithms, predictive indicators, statistics models, and machine learning matrices.',
        skills: ['analysis', 'coding'],
        medianSalary: 122000,
        growthRate: 36,
        courses: ['Applied Data Science with Python - University of Michigan', 'Machine Learning Specialization - Coursera'],
        interestTag: 'science',
        scoreWeight: 0.8
      },
      {
        name: 'UI/UX Designer',
        description: 'Evaluate user research maps, generate UI wireframes, and design high-fidelity layouts in Figma.',
        skills: ['design', 'writing'],
        medianSalary: 88000,
        growthRate: 15,
        courses: ['Google UX Design Professional Certificate', 'Product Design Micro-Degree - interaction-design.org'],
        interestTag: 'arts',
        scoreWeight: 0.8
      },
      {
        name: 'Product Manager',
        description: 'Define product scopes, align cross-functional engineering pods, and formulate business strategies.',
        skills: ['speaking', 'writing', 'analysis'],
        medianSalary: 110000,
        growthRate: 12,
        courses: ['Product Management Specialization - Coursera', 'Become a Product Manager - Udemy'],
        interestTag: 'business',
        scoreWeight: 0.8
      },
      {
        name: 'Information Security Analyst',
        description: 'Deploy firewalls, trace security breach pathways, perform auditing, and secure endpoints.',
        skills: ['analysis', 'coding'],
        medianSalary: 108000,
        growthRate: 32,
        courses: ['CompTIA Security+ Certification Course', 'Introduction to Cybersecurity - edX'],
        interestTag: 'tech',
        scoreWeight: 0.75
      }
    ];

    const cognitiveWeights = {
      'Software Engineer': { aptitude: 0.4, iq: 0.4, communication: 0.2 },
      'Data Scientist': { iq: 0.6, aptitude: 0.4, communication: 0.0 },
      'UI/UX Designer': { communication: 0.7, aptitude: 0.3, iq: 0.0 },
      'Product Manager': { communication: 0.8, iq: 0.2, aptitude: 0.0 },
      'Information Security Analyst': { aptitude: 0.6, iq: 0.4, communication: 0.0 }
    };

    const matches = careerDatabase.map(career => {
      let skillMatchTotal = 0;
      career.skills.forEach(skillKey => {
        if (skillKey === 'coding') skillMatchTotal += coding;
        if (skillKey === 'design') skillMatchTotal += design;
        if (skillKey === 'writing') skillMatchTotal += writing;
        if (skillKey === 'analysis') skillMatchTotal += analysis;
        if (skillKey === 'speaking') skillMatchTotal += speaking;
      });
      
      const weights = cognitiveWeights[career.name] || { aptitude: 0.33, iq: 0.33, communication: 0.34 };
      const userCognitiveAvg = (aptScore * weights.aptitude) + (iqScore * weights.iq) + (commScore * weights.communication);
      
      const skillAvg = (skillMatchTotal / career.skills.length);
      const totalCapability = (skillAvg * 0.6 + userCognitiveAvg * 0.4) / 5;
      
      const interestBonus = interests.includes(career.interestTag) ? 0.2 : 0.0;
      let finalPercentage = Math.round((totalCapability * 0.8 + interestBonus) * 100);
      finalPercentage = Math.min(99, Math.max(40, finalPercentage)); 

      const missingSkills = [];
      const userSkills = { coding, design, writing, analysis, speaking };
      career.skills.forEach(skillKey => {
        if (userSkills[skillKey] < 4) {
          missingSkills.push(skillKey);
        }
      });

      return {
        ...career,
        matchPercentage: finalPercentage,
        missingSkills: missingSkills
      };
    });

    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    const assessmentResult = {
      user: { name, email, age, degree, gpa },
      timestamp: new Date().toLocaleDateString(),
      matches: matches,
      userScores: { coding, design, writing, analysis, speaking, communication: commScore, aptitude: aptScore, iq: iqScore }
    };

    // Save locally
    localStorage.setItem('lastAssessment', JSON.stringify(assessmentResult));
    localStorage.setItem('userProfile', JSON.stringify({
      name, email, age, degree, gpa, role: userSession ? userSession.role : 'user'
    }));
    const allAssessments = JSON.parse(localStorage.getItem('assessmentsHistory')) || [];
    allAssessments.push(assessmentResult);
    localStorage.setItem('assessmentsHistory', JSON.stringify(allAssessments));

    // Save to Database if online
    if (serverOnline) {
      try {
        await fetch(`${API_BASE_URL}/assessments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email, name, age, degree, gpa, password,
            timestamp: assessmentResult.timestamp,
            userScores: assessmentResult.userScores,
            interests, goals, matches
          })
        });

        // Auto-login anonymous users upon assessment completion
        if (!userSession) {
          const authData = {
            email,
            name,
            role: 'user',
            token: `session-${email}`
          };
          localStorage.setItem('userSession', JSON.stringify(authData));
        }
      } catch (err) {
        console.error("Failed database assessment sync:", err);
      }
    }

    window.location.href = 'result.html';
  }
}

/* ==========================================================================
   5. Assessment Result Page
   ========================================================================== */
function initResultsPage() {
  const resultDataStr = localStorage.getItem('lastAssessment');
  if (!resultDataStr) {
    document.getElementById('result-page-container').innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-exclamation-triangle-fill text-warning display-3 mb-3"></i>
        <h2>No Career Results Found</h2>
        <p class="text-muted mb-4">Please complete the questionnaire wizard to map results.</p>
        <a href="assessment.html" class="btn btn-cyber">Take Assessment</a>
      </div>
    `;
    return;
  }

  const resultData = JSON.parse(resultDataStr);
  const bestMatch = resultData.matches[0];
  
  const userTitle = document.getElementById('result-user-title');
  if (userTitle) userTitle.textContent = `Excellent work, ${resultData.user.name}!`;

  const cogScorecard = document.getElementById('cognitive-scorecard');
  if (cogScorecard) {
    const comm = resultData.userScores.communication || 3;
    const apt = resultData.userScores.aptitude || 3;
    const iq = resultData.userScores.iq || 3;
    
    cogScorecard.innerHTML = `
      <div class="d-flex flex-column gap-3">
        <div>
          <div class="d-flex justify-content-between mb-1">
            <span class="small fw-semibold text-white">Communication Skills</span>
            <span class="small text-gradient fw-bold">${comm}/5</span>
          </div>
          <div class="progress bg-secondary-subtle" style="height: 6px;">
            <div class="progress-bar bg-primary" style="width: ${comm * 20}%;"></div>
          </div>
        </div>
        <div>
          <div class="d-flex justify-content-between mb-1">
            <span class="small fw-semibold text-white">Logical Aptitude</span>
            <span class="small text-gradient fw-bold">${apt}/5</span>
          </div>
          <div class="progress bg-secondary-subtle" style="height: 6px;">
            <div class="progress-bar bg-warning" style="width: ${apt * 20}%;"></div>
          </div>
        </div>
        <div>
          <div class="d-flex justify-content-between mb-1">
            <span class="small fw-semibold text-white">Basic IQ & Analytics</span>
            <span class="small text-gradient fw-bold">${iq}/5</span>
          </div>
          <div class="progress bg-secondary-subtle" style="height: 6px;">
            <div class="progress-bar bg-info" style="width: ${iq * 20}%;"></div>
          </div>
        </div>
      </div>
    `;
  }

  const matchesList = document.getElementById('career-matches-list');
  if (matchesList) {
    matchesList.innerHTML = resultData.matches.map((career, idx) => `
      <div class="glass-card mb-4 p-4" data-aos="fade-up" data-aos-delay="${idx * 100}">
        <div class="row align-items-center">
          <div class="col-md-8">
            <h4 class="mb-2 text-gradient">${career.name}</h4>
            <p class="small text-muted mb-3">${career.description}</p>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge bg-secondary py-2 px-3" style="font-weight: 500;">Median Salary: $${career.medianSalary.toLocaleString()}</span>
              <span class="badge bg-secondary py-2 px-3" style="font-weight: 500;">Growth Potential: +${career.growthRate}%</span>
            </div>
          </div>
          <div class="col-md-4 text-center text-md-end">
            <span class="h2 fw-bold text-gradient d-block mb-1">${career.matchPercentage}%</span>
            <span class="small text-muted d-block mb-3">Match Confidence</span>
            <button class="btn btn-cyber btn-sm save-career-btn" data-career="${career.name}">Save Route</button>
          </div>
        </div>
      </div>
    `).join('');

    const saveButtons = document.querySelectorAll('.save-career-btn');
    saveButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const careerName = e.target.dataset.career;
        await saveCareerRoute(careerName);
        e.target.textContent = 'Saved ✔';
        e.target.setAttribute('disabled', 'true');
      });
    });
  }

  const gapContainer = document.getElementById('skill-gap-analysis');
  if (gapContainer) {
    if (bestMatch.missingSkills.length === 0) {
      gapContainer.innerHTML = `
        <div class="p-3 text-success small">
          <i class="bi bi-patch-check-fill me-2"></i> You meet all core capabilities for <strong>${bestMatch.name}</strong>! Focus on building intermediate portfolios.
        </div>
      `;
    } else {
      gapContainer.innerHTML = `
        <p class="small text-muted mb-3">Here is how your current competency compares to required skills for <strong>${bestMatch.name}</strong>:</p>
        <div class="row">
          ${bestMatch.skills.map(skill => {
            const userScore = resultData.userScores[skill] || 3;
            const meetsCriteria = userScore >= 4;
            return `
              <div class="col-md-6 mb-3">
                <div class="d-flex justify-content-between mb-1">
                  <span class="text-capitalize small fw-bold">${skill}</span>
                  <span class="small ${meetsCriteria ? 'text-success' : 'text-danger'}">${userScore}/5 (${meetsCriteria ? 'Meets' : 'Gap'})</span>
                </div>
                <div class="progress bg-secondary-subtle" style="height: 6px;">
                  <div class="progress-bar ${meetsCriteria ? 'bg-success' : 'bg-danger'}" style="width: ${userScore * 20}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  const coursesContainer = document.getElementById('suggested-courses');
  if (coursesContainer) {
    coursesContainer.innerHTML = bestMatch.courses.map(course => `
      <div class="glass-card mb-3 p-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1 fw-bold small text-truncate" style="max-width: 200px;">${course}</h6>
            <span class="small text-muted" style="font-size: 0.75rem;"><i class="bi bi-mortarboard me-1"></i> Interactive Program</span>
          </div>
          <a href="#" class="btn btn-cyber-purple btn-sm py-1 px-3">Enroll</a>
        </div>
      </div>
    `).join('');
  }

  const ctx = document.getElementById('salaryChart');
  if (ctx) {
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';

    const chartData = {
      labels: resultData.matches.map(c => c.name),
      datasets: [
        {
          label: 'Median Annual Salary ($)',
          data: resultData.matches.map(c => c.medianSalary),
          backgroundColor: '#4f46e5',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Market Growth Projections (%)',
          data: resultData.matches.map(c => c.growthRate * 2000), 
          backgroundColor: '#0ea5e9',
          borderColor: '#38bdf8',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    };

    const config = {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: textColor, font: { family: 'Inter', weight: 500 } }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (context.datasetIndex === 0) {
                  label += `: $${context.raw.toLocaleString()}`;
                } else {
                  label = `Market Growth Projections: ${context.raw / 2000}%`;
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: 'Inter' } },
            grid: { color: gridColor }
          },
          y: {
            ticks: { color: textColor, font: { family: 'Inter' } },
            grid: { color: gridColor }
          }
        }
      }
    };

    let salaryChartInstance = new Chart(ctx, config);

    window.addEventListener('themeChanged', (e) => {
      const isNewDark = e.detail.theme !== 'light';
      const updatedColor = isNewDark ? '#f8fafc' : '#0f172a';
      const updatedGrid = isNewDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
      
      salaryChartInstance.options.plugins.legend.labels.color = updatedColor;
      salaryChartInstance.options.scales.x.ticks.color = updatedColor;
      salaryChartInstance.options.scales.x.grid.color = updatedGrid;
      salaryChartInstance.options.scales.y.ticks.color = updatedColor;
      salaryChartInstance.options.scales.y.grid.color = updatedGrid;
      salaryChartInstance.update();
    });
  }
}

async function saveCareerRoute(careerName) {
  const saved = JSON.parse(localStorage.getItem('savedCareers')) || [];
  if (!saved.includes(careerName)) {
    saved.push(careerName);
    localStorage.setItem('savedCareers', JSON.stringify(saved));
  }

  const email = userSession?.email;
  if (email && serverOnline) {
    try {
      await fetch(`${API_BASE_URL}/saved-careers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, career_name: careerName })
      });
    } catch (e) {}
  }
}

/* ==========================================================================
   6. Resume ATS Analyzer Controller
   ========================================================================== */
function initResumeAnalyzer() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('resume-file');
  const laser = document.getElementById('scan-laser');
  
  const promptBox = document.getElementById('drop-prompt');
  const uploadInfo = document.getElementById('upload-info');
  const fileNameDisplay = document.getElementById('upload-filename');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarWrapper = document.getElementById('progress-bar-wrapper');
  const resultsPanel = document.getElementById('resume-analysis-results');
  
  if (!dropzone) return;

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleResumeScan(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleResumeScan(e.target.files[0]);
    }
  });

  function handleResumeScan(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(extension)) {
      alert('Unsupported file format. Please upload PDF, DOCX, or TXT formats.');
      return;
    }

    promptBox.style.display = 'none';
    uploadInfo.style.display = 'block';
    fileNameDisplay.textContent = file.name;
    laser.style.display = 'block';
    progressBarWrapper.style.display = 'block';
    resultsPanel.classList.add('d-none');
    const placeholder = document.getElementById('resume-scan-placeholder');
    if (placeholder) {
      placeholder.classList.remove('d-none');
      placeholder.classList.add('d-flex');
    }

    // Progress Bar Animation
    let progress = 0;
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += 10;
        progressFill.style.width = `${progress}%`;
        progressPercent.textContent = `${progress}%`;
      }
    }, 150);

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${API_BASE_URL}/resume/scan`, {
      method: 'POST',
      body: formData
    })
    .then(async (res) => {
      clearInterval(progressInterval);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Scan failed');
      }
      return res.json();
    })
    .then(async (data) => {
      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
      
      setTimeout(() => {
        laser.style.display = 'none';
        progressBarWrapper.style.display = 'none';
        if (placeholder) {
          placeholder.classList.add('d-none');
          placeholder.classList.remove('d-flex');
        }
        
        // Show ATS analysis details dynamically
        document.getElementById('ats-rating-score').textContent = `${data.score}%`;
        
        const parsedSkills = document.getElementById('parsed-skills-list');
        parsedSkills.innerHTML = data.skills.map(s => `<span class="badge bg-success-subtle text-success border border-success-subtle me-2 mb-2 px-3 py-2"><i class="bi bi-check-circle me-1"></i>${s}</span>`).join('');
        
        const missingSkills = document.getElementById('missing-skills-list');
        missingSkills.innerHTML = data.missing.map(m => `<span class="badge bg-danger-subtle text-danger border border-danger-subtle me-2 mb-2 px-3 py-2"><i class="bi bi-x-circle me-1"></i>${m}</span>`).join('');
        
        const improvementBullets = document.getElementById('improvement-bullets');
        improvementBullets.innerHTML = data.improvements.map(i => `<li class="mb-2 text-muted small">${i}</li>`).join('');
        
        resultsPanel.classList.remove('d-none');
        resultsPanel.scrollIntoView({ behavior: 'smooth' });

        // Save locally and sync to database history
        const lastScanData = {
          filename: file.name,
          score: data.score,
          timestamp: new Date().toLocaleDateString()
        };
        localStorage.setItem('lastATSScan', JSON.stringify(lastScanData));

        const email = userSession?.email;
        if (email && serverOnline) {
          fetch(`${API_BASE_URL}/resume-scans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              filename: file.name,
              score: data.score,
              parsed_skills: data.skills,
              missing_skills: data.missing,
              improvements: data.improvements
            })
          }).catch(err => console.error("Database save failed:", err));
        }
      }, 500);
    })
    .catch((err) => {
      clearInterval(progressInterval);
      laser.style.display = 'none';
      progressBarWrapper.style.display = 'none';
      if (placeholder) {
        placeholder.classList.add('d-none');
        placeholder.classList.remove('d-flex');
      }
      
      // Reset dropzone UI
      promptBox.style.display = 'block';
      uploadInfo.style.display = 'none';
      
      alert(err.message || 'Error occurred during scan. Please try again.');
    });
  }
}

/* ==========================================================================
   7. Student Dashboard Panel
   ========================================================================== */
function initDashboard() {
  const resultDataStr = localStorage.getItem('lastAssessment');
  const savedCareers = JSON.parse(localStorage.getItem('savedCareers')) || [];
  const lastScan = JSON.parse(localStorage.getItem('lastATSScan'));
  const userProfileStr = localStorage.getItem('userProfile');

  const profileName = document.getElementById('dash-profile-name');
  const profileEmail = document.getElementById('dash-profile-email');
  const profileDegree = document.getElementById('dash-profile-degree');

  let profileData = null;
  if (userProfileStr) {
    profileData = JSON.parse(userProfileStr);
  } else if (resultDataStr) {
    profileData = JSON.parse(resultDataStr).user;
  } else if (userSession) {
    profileData = {
      name: userSession.name,
      email: userSession.email,
      degree: userSession.role === 'admin' ? 'Administrator' : 'Student'
    };
  }

  if (profileData) {
    if (profileName) profileName.textContent = profileData.name;
    if (profileEmail) profileEmail.textContent = profileData.email;
    if (profileDegree) {
      if (profileData.degree) {
        profileDegree.textContent = profileData.degree.includes('Student') || profileData.degree === 'Administrator' 
          ? profileData.degree 
          : `${profileData.degree} Student`;
      } else {
        profileDegree.textContent = 'Student';
      }
    }
  }

  if (resultDataStr) {
    const resultData = JSON.parse(resultDataStr);

    // Render cognitive scorecard section in sidebar
    const cognitiveSection = document.getElementById('dash-cognitive-section');
    if (cognitiveSection) {
      cognitiveSection.style.display = 'block';
      const scoreComm = document.getElementById('dash-score-comm');
      const scoreApt = document.getElementById('dash-score-apt');
      const scoreIq = document.getElementById('dash-score-iq');
      
      if (scoreComm) scoreComm.textContent = `${resultData.userScores.communication || 3}/5`;
      if (scoreApt) scoreApt.textContent = `${resultData.userScores.aptitude || 3}/5`;
      if (scoreIq) scoreIq.textContent = `${resultData.userScores.iq || 3}/5`;
    }

    const historyList = document.getElementById('dash-assessments-history');
    if (historyList) {
      const history = JSON.parse(localStorage.getItem('assessmentsHistory')) || [resultData];
      historyList.innerHTML = history.map((item, idx) => `
        <div class="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-10 py-3">
          <div>
            <h6 class="mb-0 fw-bold small">Evaluation #${idx + 1}</h6>
            <span class="small text-muted" style="font-size: 0.75rem;">${item.timestamp}</span>
          </div>
          <span class="badge bg-gradient-custom text-white" style="font-weight: 500;">${item.matches[0].name} (${item.matches[0].matchPercentage}%)</span>
        </div>
      `).join('');
    }

    const radarCtx = document.getElementById('radarSkillChart');
    if (radarCtx) {
      const isDark = document.body.getAttribute('data-theme') !== 'light';
      const textValColor = isDark ? '#f8fafc' : '#0f172a';
      const gridLineColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';

      const dataset = {
        labels: ['Coding / Logic', 'UI Design', 'Technical Writing', 'Analytical Math', 'Public Speaking', 'Communication', 'Aptitude', 'IQ'],
        datasets: [{
          label: 'User Competency Matrix',
          data: [
            resultData.userScores.coding || 3,
            resultData.userScores.design || 3,
            resultData.userScores.writing || 3,
            resultData.userScores.analysis || 3,
            resultData.userScores.speaking || 3,
            resultData.userScores.communication || 3,
            resultData.userScores.aptitude || 3,
            resultData.userScores.iq || 3
          ],
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          borderColor: '#6366f1',
          pointBackgroundColor: '#0ea5e9',
          borderWidth: 2
        }]
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          r: {
            angleLines: { color: gridLineColor },
            grid: { color: gridLineColor },
            pointLabels: {
              color: textValColor,
              font: { size: 11, family: 'Inter', weight: 500 }
            },
            ticks: {
              backdropColor: 'transparent',
              color: textValColor,
              stepSize: 1
            },
            min: 0,
            max: 5
          }
        }
      };

      let radarChartInstance = new Chart(radarCtx, {
        type: 'radar',
        data: dataset,
        options: options
      });

      window.addEventListener('themeChanged', (e) => {
        const isNewDark = e.detail.theme !== 'light';
        const updatedColor = isNewDark ? '#f8fafc' : '#0f172a';
        const updatedGrid = isNewDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
        
        radarChartInstance.options.scales.r.pointLabels.color = updatedColor;
        radarChartInstance.options.scales.r.ticks.color = updatedColor;
        radarChartInstance.options.scales.r.angleLines.color = updatedGrid;
        radarChartInstance.options.scales.r.grid.color = updatedGrid;
        radarChartInstance.update();
      });
    }
  } else {
    // Show placeholder for empty states of radar chart and history logs
    const radarCtx = document.getElementById('radarSkillChart');
    if (radarCtx) {
      const parent = radarCtx.parentElement;
      parent.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center text-center h-100 py-4">
        <i class="bi bi-bar-chart-steps text-gradient mb-3" style="font-size: 2.5rem;"></i>
        <p class="small text-muted mb-0">No competencies logged yet. Take the Career Test to generate your radar matrix!</p>
      </div>`;
    }
    const historyList = document.getElementById('dash-assessments-history');
    if (historyList) {
      historyList.innerHTML = `<p class="small text-muted text-center py-3">No evaluation logs found.</p>`;
    }
  }

  const savedList = document.getElementById('dash-saved-careers');
  if (savedList) {
    if (savedCareers.length === 0) {
      savedList.innerHTML = `<p class="small text-muted text-center py-3">No saved career paths yet. Explore matches to bookmark pathways.</p>`;
    } else {
      savedList.innerHTML = savedCareers.map(name => `
        <div class="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-10 py-3">
          <span class="fw-bold small"><i class="bi bi-bookmark-star-fill text-gradient me-2"></i>${name}</span>
          <button class="btn btn-sm btn-outline-danger border-0 remove-career-btn" data-career="${name}"><i class="bi bi-trash"></i></button>
        </div>
      `).join('');

      const deleteBtns = savedList.querySelectorAll('.remove-career-btn');
      deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const target = e.currentTarget.dataset.career;
          const index = savedCareers.indexOf(target);
          if (index > -1) {
            savedCareers.splice(index, 1);
            localStorage.setItem('savedCareers', JSON.stringify(savedCareers));
            
            const email = userSession?.email;
            if (email && serverOnline) {
              try {
                await fetch(`${API_BASE_URL}/saved-careers?email=${encodeURIComponent(email)}&career_name=${encodeURIComponent(target)}`, {
                  method: 'DELETE'
                });
              } catch (e) {}
            }
            initDashboard();
          }
        });
      });
    }
  }

  const atsScore = document.getElementById('dash-ats-score');
  const atsFilename = document.getElementById('dash-ats-filename');
  if (lastScan) {
    if (atsScore) atsScore.textContent = `${lastScan.score}%`;
    if (atsFilename) atsFilename.textContent = lastScan.filename;
  } else {
    if (atsScore) atsScore.textContent = 'N/A';
    if (atsFilename) atsFilename.textContent = 'No file scanned yet';
  }

  // Sidebar Log out handler
  const dashLogoutBtn = document.getElementById('dash-logout-btn');
  if (dashLogoutBtn) {
    dashLogoutBtn.addEventListener('click', () => {
      localStorage.removeItem('userSession');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('lastAssessment');
      localStorage.removeItem('assessmentsHistory');
      localStorage.removeItem('savedCareers');
      localStorage.removeItem('lastATSScan');
      window.location.href = 'index.html';
    });
  }
}

/* ==========================================================================
   8. Administrator Portal Controls
   ========================================================================== */
async function initAdminPanel() {
  if (!userSession || userSession.role !== 'admin') return;

  const authHeader = `Bearer ${userSession.email}`;

  // Fetch stats and lists
  try {
    // 1. Fetch Stats
    const statsRes = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: { 'Authorization': authHeader }
    });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      document.getElementById('stat-users').textContent = stats.users;
      document.getElementById('stat-assessments').textContent = stats.assessments;
      document.getElementById('stat-resumes').textContent = stats.resumes;
      document.getElementById('stat-chats').textContent = stats.chats;
    }

    // 2. Fetch Users List
    const usersRes = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: { 'Authorization': authHeader }
    });
    if (usersRes.ok) {
      const uData = await usersRes.json();
      renderAdminUsers(uData.users, authHeader);
    }

    // 3. Fetch Assessments List
    const assessRes = await fetch(`${API_BASE_URL}/admin/assessments`, {
      headers: { 'Authorization': authHeader }
    });
    if (assessRes.ok) {
      const aData = await assessRes.json();
      renderAdminAssessments(aData.assessments);
    }

    // 4. Fetch Scans
    const scansRes = await fetch(`${API_BASE_URL}/admin/resume-scans`, {
      headers: { 'Authorization': authHeader }
    });
    if (scansRes.ok) {
      const rData = await scansRes.json();
      renderAdminScans(rData.scans);
    }

    // 5. Fetch Chat History Logs
    const chatsRes = await fetch(`${API_BASE_URL}/admin/chat-history`, {
      headers: { 'Authorization': authHeader }
    });
    if (chatsRes.ok) {
      const cData = await chatsRes.json();
      renderAdminChats(cData.chats);
    }

  } catch (e) {
    console.error("Admin load error:", e);
  }
}

function renderAdminUsers(users, authHeader) {
  const container = document.getElementById('admin-users-table');
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No users registered yet.</td></tr>`;
    return;
  }

  container.innerHTML = users.map(user => `
    <tr>
      <td class="fw-bold text-white py-3">${user.name}</td>
      <td class="text-muted small">${user.email}</td>
      <td class="small">${user.age}</td>
      <td class="small text-muted">${user.degree} (${user.gpa})</td>
      <td>
        <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.role}</span>
      </td>
      <td class="text-muted small">${new Date(user.created_at).toLocaleDateString()}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info me-2 role-btn" data-id="${user.id}" data-role="${user.role}" ${user.email === userSession.email ? 'disabled' : ''}>
          Toggle Role
        </button>
        <button class="btn btn-sm btn-outline-danger delete-user-btn" data-id="${user.id}" ${user.email === userSession.email ? 'disabled' : ''}>
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Attach Deletion handlers
  container.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = e.currentTarget.dataset.id;
      if (confirm("Are you sure you want to permanently delete this user and all their records?")) {
        try {
          const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': authHeader }
          });
          if (res.ok) {
            window.location.reload();
          } else {
            const data = await res.json();
            alert(data.error || "Failed to delete user");
          }
        } catch (e) {}
      }
    });
  });

  // Attach Role Toggle handlers
  container.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = e.currentTarget.dataset.id;
      const currentRole = e.currentTarget.dataset.role;
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      
      try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': authHeader 
          },
          body: JSON.stringify({ role: newRole })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          const data = await res.json();
          alert(data.error || "Failed to update role");
        }
      } catch (e) {}
    });
  });
}

function renderAdminAssessments(assessments) {
  const container = document.getElementById('admin-assessments-table');
  if (!container) return;

  if (assessments.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No assessments completed.</td></tr>`;
    return;
  }

  container.innerHTML = assessments.map(a => `
    <tr>
      <td class="text-white py-3 small">${a.user_email}</td>
      <td class="text-muted small">${a.timestamp}</td>
      <td class="small">
        <strong>Skills:</strong> C:${a.coding} | D:${a.design} | W:${a.writing} | A:${a.analysis} | S:${a.speaking}
        <br/>
        <strong>Quiz:</strong> Comm:${a.communication || 3} | Apt:${a.aptitude || 3} | IQ:${a.iq || 3}
      </td>
      <td class="small text-truncate" style="max-width: 150px;">
        ${a.interests.join(', ')}
      </td>
      <td class="small">
        <span class="badge bg-secondary-subtle text-white">${a.matches[0]?.career_name || 'N/A'} (${a.matches[0]?.match_percentage || 0}%)</span>
      </td>
    </tr>
  `).join('');
}

function renderAdminScans(scans) {
  const container = document.getElementById('admin-resumes-table');
  if (!container) return;

  if (scans.length === 0) {
    container.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No resumes scanned yet.</td></tr>`;
    return;
  }

  container.innerHTML = scans.map(s => `
    <tr>
      <td class="text-white py-3 small">${s.user_email}</td>
      <td class="text-muted small text-truncate" style="max-width: 200px;" title="${s.filename}">${s.filename}</td>
      <td class="fw-bold text-gradient">${s.score}%</td>
      <td class="text-muted small">${new Date(s.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

function renderAdminChats(chats) {
  const container = document.getElementById('admin-chats-table');
  if (!container) return;

  if (chats.length === 0) {
    container.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No chat counsel logs found.</td></tr>`;
    return;
  }

  container.innerHTML = chats.map(c => `
    <tr>
      <td class="text-white py-3 small">${c.user_email}</td>
      <td class="small">
        <span class="badge ${c.sender === 'user' ? 'bg-info text-dark' : 'bg-secondary'}">${c.sender}</span>
      </td>
      <td class="text-muted small text-wrap" style="max-width: 350px;">${c.message}</td>
      <td class="text-muted small">${new Date(c.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}
