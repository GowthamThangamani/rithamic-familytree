// Main Application Controller - Rithamic Family Tree
import { dataService } from './dataService.js';
import { auth } from './authService.js';
import { TreeRenderer } from './treeRenderer.js';
import { trackEvent } from './telemetryService.js';

let treeRenderer = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load Dataset
  await dataService.load();

  // 2. Setup Tree Renderer
  const treeContainer = document.getElementById('treeContainer');
  treeRenderer = new TreeRenderer(treeContainer, handleNodeSelection);
  treeRenderer.render();
  treeRenderer.fitToScreen();

  // 3. Handle SSO Ticket or Session
  await auth.handleUrlTicketExchange();
  updateAuthUI();

  // 4. Setup Event Listeners
  setupSearch();
  setupFiltersAndControls();
  setupAuthModal();
  setupDrawer();

  // 5. Track initial page view telemetry
  trackEvent('page_view', 'familytree_loaded', {
    totalMembers: dataService.getAllIndividuals().length
  });
});

// Update UI based on Auth State
function updateAuthUI() {
  const guestView = document.getElementById('guestAuthView');
  const userView = document.getElementById('userAuthView');
  const userDisplayName = document.getElementById('userDisplayName');
  const userRoleBadge = document.getElementById('userRoleBadge');

  if (auth.isAuthenticated()) {
    const user = auth.getUser();
    guestView.classList.add('hidden');
    userView.classList.remove('hidden');
    userDisplayName.textContent = user.fullName || user.email.split('@')[0];
    userRoleBadge.textContent = (user.role || 'viewer').toUpperCase();
  } else {
    guestView.classList.remove('hidden');
    userView.classList.add('hidden');
  }
}

// Search Functionality
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchDropdown = document.getElementById('searchDropdown');

  let debounceTimeout = null;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();

    if (query.length === 0) {
      searchDropdown.classList.add('hidden');
      return;
    }

    debounceTimeout = setTimeout(() => {
      const results = dataService.search(query);
      renderSearchResults(results);
      trackEvent('search_query', 'member_search', { query, matchCount: results.length });
    }, 200);
  });

  // Hide dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchDropdown.classList.add('hidden');
    }
  });
}

function renderSearchResults(results) {
  const searchDropdown = document.getElementById('searchDropdown');
  searchDropdown.innerHTML = '';

  if (results.length === 0) {
    searchDropdown.innerHTML = '<div style="padding: 16px; color: #94a3b8; font-size: 13px;">No family members found matching that name.</div>';
    searchDropdown.classList.remove('hidden');
    return;
  }

  results.forEach(res => {
    const ind = res.individual;
    const item = document.createElement('div');
    item.className = 'search-item';
    item.innerHTML = `
      <div class="search-item-name">${ind.fullName} ${ind.tamilName ? `<span style="color: #f59e0b; font-weight: normal;">(${ind.tamilName})</span>` : ''}</div>
      <div class="search-item-clue">${res.parentClue || ''} ${res.spouseClue ? `&bull; ${res.spouseClue}` : ''}</div>
      <div class="search-item-meta">
        <span class="badge-tag">Gen ${res.generation}</span>
        <span class="badge-tag">${res.lifespan}</span>
        <span class="badge-tag">${res.branch}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      searchDropdown.classList.add('hidden');
      document.getElementById('searchInput').value = ind.fullName;
      treeRenderer.selectNode(ind.id);
    });

    searchDropdown.appendChild(item);
  });

  searchDropdown.classList.remove('hidden');
}

// Handle Node Selection & Profile Drawer
function handleNodeSelection(rawPerson) {
  const person = auth.maskSensitiveData(rawPerson);
  const drawer = document.getElementById('profileDrawer');
  const drawerBody = document.getElementById('drawerBody');

  const parents = dataService.getParents(person.id);
  const spouses = dataService.getSpouses(person.id);
  const siblings = dataService.getSiblings(person.id);
  const children = dataService.getChildren(person.id);

  const initials = person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  drawerBody.innerHTML = `
    <div class="drawer-avatar-section">
      <div class="drawer-avatar ${person.gender}" style="background: ${person.gender === 'male' ? '#2563eb' : '#ec4899'};">
        ${initials}
      </div>
      <div class="drawer-name">${person.fullName}</div>
      ${person.tamilName ? `<div class="drawer-tamil">${person.tamilName}</div>` : ''}
      <div style="margin-top: 8px;">
        <span class="badge-tag" style="background: #f59e0b; color: #0f172a; font-weight: bold;">Gen ${person.generation}</span>
        <span class="badge-tag">${person.isLiving ? '🟢 Living' : '⚪ Deceased'}</span>
      </div>
      <button class="btn-auth" id="btnFocusPedigree" style="margin-top: 14px; width: 100%; justify-content: center;">
        🔍 Focus Lineage & Ancestry
      </button>
    </div>

    <!-- Relationships -->
    <div class="drawer-section">
      <div class="drawer-section-title">Parents</div>
      <div class="relation-chips" id="parentsChips">
        ${parents.length > 0 ? parents.map(p => `<button class="rel-chip" data-id="${p.id}">${p.fullName}</button>`).join('') : '<span style="font-size: 13px; color: #64748b;">Not recorded</span>'}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Spouse(s)</div>
      <div class="relation-chips" id="spousesChips">
        ${spouses.length > 0 ? spouses.map(s => `<button class="rel-chip" data-id="${s.id}">💍 ${s.fullName}</button>`).join('') : '<span style="font-size: 13px; color: #64748b;">Not recorded</span>'}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Siblings</div>
      <div class="relation-chips" id="siblingsChips">
        ${siblings.length > 0 ? siblings.map(s => `<button class="rel-chip" data-id="${s.id}">${s.fullName}</button>`).join('') : '<span style="font-size: 13px; color: #64748b;">None recorded</span>'}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Children</div>
      <div class="relation-chips" id="childrenChips">
        ${children.length > 0 ? children.map(c => `<button class="rel-chip" data-id="${c.id}">${c.fullName}</button>`).join('') : '<span style="font-size: 13px; color: #64748b;">No descendants recorded</span>'}
      </div>
    </div>

    <!-- Personal & Contact Info -->
    <div class="drawer-section">
      <div class="drawer-section-title">Life & Contact Details</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Birth / Passing:</span>
          <span class="info-value">${person.birthYear || '?'} ${person.passingYear ? `– ${person.passingYear}` : ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Native Place:</span>
          <span class="info-value">${person.nativePlace || 'Kangayam'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Branch:</span>
          <span class="info-value">${person.branch || 'Main Lineage'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Contact:</span>
          <span class="info-value">${person.contact || 'Not available'}</span>
        </div>
      </div>

      ${!auth.isAuthenticated() ? `
        <div class="privacy-lock-notice">
          <span>🔒 Contact details are masked for privacy.</span>
          <button class="btn-auth" id="btnUnlockPrivacy" style="padding: 4px 10px; font-size: 11px;">Sign in</button>
        </div>
      ` : ''}
    </div>

    <!-- Biographical Notes -->
    ${person.notes ? `
      <div class="drawer-section">
        <div class="drawer-section-title">Family History & Notes</div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          ${person.notes}
        </div>
      </div>
    ` : ''}
  `;

  // Focus Pedigree button
  drawerBody.querySelector('#btnFocusPedigree').addEventListener('click', () => {
    treeRenderer.setFocusView(person.id);
    drawer.classList.remove('open');
  });

  // Relation chips navigation
  drawerBody.querySelectorAll('.rel-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetId = chip.dataset.id;
      treeRenderer.selectNode(targetId);
    });
  });

  // Privacy unlock button inside drawer
  const btnUnlock = drawerBody.querySelector('#btnUnlockPrivacy');
  if (btnUnlock) {
    btnUnlock.addEventListener('click', () => {
      openLoginModal();
    });
  }

  drawer.classList.add('open');
}

// Filters & Controls Setup
function setupFiltersAndControls() {
  const branchFilter = document.getElementById('branchFilter');
  const generationFilter = document.getElementById('generationFilter');

  branchFilter.addEventListener('change', () => {
    treeRenderer.render(branchFilter.value, generationFilter.value);
    trackEvent('filter_change', 'branch_filtered', { branch: branchFilter.value });
  });

  generationFilter.addEventListener('change', () => {
    treeRenderer.render(branchFilter.value, generationFilter.value);
    trackEvent('filter_change', 'generation_filtered', { generation: generationFilter.value });
  });

  // Pan / Zoom Controls
  document.getElementById('btnZoomIn').addEventListener('click', () => treeRenderer.zoomIn());
  document.getElementById('btnZoomOut').addEventListener('click', () => treeRenderer.zoomOut());
  document.getElementById('btnResetView').addEventListener('click', () => treeRenderer.resetView());
  document.getElementById('btnFitScreen').addEventListener('click', () => treeRenderer.fitToScreen());
}

// Slide-out Drawer close button
function setupDrawer() {
  document.getElementById('btnCloseDrawer').addEventListener('click', () => {
    document.getElementById('profileDrawer').classList.remove('open');
  });
}

// Auth & Modal Setup
function setupAuthModal() {
  const loginModal = document.getElementById('loginModal');
  const btnOpenLogin = document.getElementById('btnOpenLogin');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnLogout = document.getElementById('btnLogout');
  const btnSsoRedirect = document.getElementById('btnSsoRedirect');
  const quickOtpForm = document.getElementById('quickOtpForm');
  const quickOtpEmail = document.getElementById('quickOtpEmail');
  const btnSendQuickOtp = document.getElementById('btnSendQuickOtp');
  const quickOtpVerifyStep = document.getElementById('quickOtpVerifyStep');
  const quickOtpCode = document.getElementById('quickOtpCode');
  const btnVerifyQuickOtp = document.getElementById('btnVerifyQuickOtp');

  btnOpenLogin.addEventListener('click', openLoginModal);
  btnCloseModal.addEventListener('click', closeLoginModal);

  // Logout
  btnLogout.addEventListener('click', () => {
    auth.logout();
    updateAuthUI();
    if (treeRenderer.selectedId) {
      const person = dataService.getIndividual(treeRenderer.selectedId);
      if (person) handleNodeSelection(person);
    }
  });

  // SSO Redirect
  btnSsoRedirect.addEventListener('click', () => {
    auth.redirectToCentralLogin();
  });

  // Quick OTP Flow inside modal
  let currentOtpEmail = '';

  quickOtpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = quickOtpEmail.value.trim().toLowerCase();
    if (!email) return;

    btnSendQuickOtp.textContent = 'Sending code...';
    btnSendQuickOtp.disabled = true;

    try {
      await auth.requestDirectOtp(email);
      currentOtpEmail = email;
      quickOtpForm.classList.add('hidden');
      quickOtpVerifyStep.classList.remove('hidden');
      quickOtpCode.focus();
    } catch (err) {
      alert(err.message || "Failed to send OTP code.");
    } finally {
      btnSendQuickOtp.textContent = 'Send 6-Digit Code';
      btnSendQuickOtp.disabled = false;
    }
  });

  btnVerifyQuickOtp.addEventListener('click', async () => {
    const code = quickOtpCode.value.trim();
    if (code.length !== 6) {
      alert("Please enter the 6-digit verification code.");
      return;
    }

    btnVerifyQuickOtp.textContent = 'Verifying...';
    btnVerifyQuickOtp.disabled = true;

    try {
      await auth.verifyDirectOtp(currentOtpEmail, code);
      closeLoginModal();
      updateAuthUI();
      if (treeRenderer.selectedId) {
        const person = dataService.getIndividual(treeRenderer.selectedId);
        if (person) handleNodeSelection(person);
      }
    } catch (err) {
      alert(err.message || "Invalid code.");
    } finally {
      btnVerifyQuickOtp.textContent = 'Verify & Sign In';
      btnVerifyQuickOtp.disabled = false;
    }
  });

  auth.onAuthChange(() => updateAuthUI());
}

function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}
