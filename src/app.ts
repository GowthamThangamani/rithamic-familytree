import { Individual, SearchMatch } from './types/index.ts';
import { dataService } from './services/dataService.ts';
import { kinshipService } from './services/kinshipService.ts';
import { auth } from './services/authService.ts';
import { TreeRenderer } from './services/treeRenderer.ts';
import { trackEvent } from './services/telemetryService.ts';

let treeRenderer: TreeRenderer | null = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Fetch live PostgreSQL dataset
  await dataService.load();
  updateDbStatusUI();

  // 2. Initialize Tree Renderer
  const treeContainer = document.getElementById('treeContainer') as HTMLElement;
  treeRenderer = new TreeRenderer(treeContainer, handleNodeSelection);
  treeRenderer.render();
  treeRenderer.fitToScreen();

  // 3. Central SSO & Auth
  await auth.handleUrlTicketExchange();
  updateAuthUI();

  // 4. Bind controls
  setupViewModeTabs();
  setupSearch();
  setupFiltersAndControls();
  setupAuthModal();
  setupDrawer();

  trackEvent('page_view', 'familytree_loaded', {
    totalMembers: dataService.getAllIndividuals().length,
    dataSource: dataService.dataSource
  });
});

function updateDbStatusUI(): void {
  const badgeText = document.getElementById('dbStatusText');
  const badge = document.getElementById('dbStatusBadge');
  if (!badgeText || !badge) return;

  if (dataService.dataSource === 'postgresql_database') {
    badgeText.textContent = '🐘 PostgreSQL Live';
    badge.title = 'Connected live to PostgreSQL database (rithamic_familytree)';
    badge.style.background = 'rgba(16, 185, 129, 0.12)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
  } else {
    badgeText.textContent = '📦 Local Dataset';
    badge.title = 'Loaded from local dataset snapshot';
    badge.style.background = 'rgba(245, 158, 11, 0.12)';
    badge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
  }
}

function setupViewModeTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.view-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.dataset.view as 'TREE' | 'PEDIGREE' | 'MATRIX';
      if (treeRenderer) {
        treeRenderer.viewMode = mode;
        if (mode === 'PEDIGREE' && !treeRenderer.focalMemberId) {
          // Default focal to Gowtham (#1) or Periya Pannai (#19)
          treeRenderer.focalMemberId = 1;
        }
        treeRenderer.render();
        treeRenderer.resetView();
        trackEvent('interaction', 'view_mode_changed', { mode });
      }
    });
  });
}

function updateAuthUI(): void {
  const guestView = document.getElementById('guestAuthView') as HTMLElement;
  const userView = document.getElementById('userAuthView') as HTMLElement;
  const userDisplayName = document.getElementById('userDisplayName') as HTMLElement;
  const userRoleBadge = document.getElementById('userRoleBadge') as HTMLElement;

  if (auth.isAuthenticated()) {
    const user = auth.getUser();
    guestView.classList.add('hidden');
    userView.classList.remove('hidden');
    if (user) {
      userDisplayName.textContent = user.fullName || user.email.split('@')[0];
      userRoleBadge.textContent = (user.role || 'viewer').toUpperCase();
    }
  } else {
    guestView.classList.remove('hidden');
    userView.classList.add('hidden');
  }
}

function setupSearch(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const searchDropdown = document.getElementById('searchDropdown') as HTMLElement;

  let debounceTimeout: number | null = null;

  searchInput.addEventListener('input', (e) => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    const query = (e.target as HTMLInputElement).value.trim();

    if (query.length === 0) {
      searchDropdown.classList.add('hidden');
      return;
    }

    debounceTimeout = window.setTimeout(() => {
      const results = dataService.search(query);
      renderSearchResults(results);
      trackEvent('search_query', 'member_search', { query, matchCount: results.length });
    }, 200);
  });

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.search-container')) {
      searchDropdown.classList.add('hidden');
    }
  });
}

function renderSearchResults(results: SearchMatch[]): void {
  const searchDropdown = document.getElementById('searchDropdown') as HTMLElement;
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
      (document.getElementById('searchInput') as HTMLInputElement).value = ind.fullName;
      if (treeRenderer) {
        treeRenderer.selectNode(ind.id);
        treeRenderer.centerOnNode(ind.id);
      }
    });

    searchDropdown.appendChild(item);
  });

  searchDropdown.classList.remove('hidden');
}

function handleNodeSelection(rawPerson: Individual): void {
  const person = auth.maskSensitiveData(rawPerson);
  const drawer = document.getElementById('profileDrawer') as HTMLElement;
  const drawerBody = document.getElementById('drawerBody') as HTMLElement;

  const parents = dataService.getParents(person.id);
  const spouses = dataService.getSpouses(person.id);
  const siblings = dataService.getSiblings(person.id);
  const children = dataService.getChildren(person.id);

  const activeFocalId = (treeRenderer && treeRenderer.focusedPersonId) || 1;
  const kinship = kinshipService.calculateRelationship(activeFocalId, person.id);
  const initials = person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  drawerBody.innerHTML = `
    <div class="drawer-avatar-section">
      <div class="drawer-avatar ${person.gender}" style="background: ${person.gender === 'male' ? '#2563eb' : '#ec4899'};">
        ${initials}
      </div>
      <div class="drawer-name">${person.fullName}</div>
      ${person.tamilName ? `<div class="drawer-tamil">${person.tamilName}</div>` : ''}
      <div style="margin-top: 8px; display: flex; flex-direction: column; align-items: center; gap: 6px;">
        <div style="display: flex; gap: 6px;">
          <span class="badge-tag" style="background: #f59e0b; color: #0f172a; font-weight: bold;">Gen ${person.generation}</span>
          <span class="badge-tag">${person.isLiving ? '🟢 Living' : '⚪ Deceased'}</span>
        </div>
        ${kinship ? `
          <div class="node-kinship-pill ${kinship.relationType}" style="font-size: 11px; padding: 4px 10px;">
            ${kinship.english} &bull; ${kinship.tamil}
          </div>
        ` : ''}
      </div>
      <button class="btn-auth" id="btnFocusPedigree" style="margin-top: 14px; width: 100%; justify-content: center;">
        🌳 Focus Tree
      </button>
    </div>

    <!-- Relationships -->
    <div class="drawer-section">
      <div class="drawer-section-title">Parents</div>
      <div class="relation-chips" id="parentsChips">
        ${parents.length > 0 ? parents.map(p => `<button class="rel-chip" data-id="${p.id}">${p.fullName}</button>`).join('') : '<span style="font-size: 13px; color: #64748b;">Ancestral roots</span>'}
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
          <span class="info-value">${person.nativePlace || 'Kangayam, Tamil Nadu'}</span>
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
        <div class="drawer-section-title">Family History & Identity Clues</div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          ${person.notes}
        </div>
      </div>
    ` : ''}
  `;

  drawerBody.querySelector('#btnFocusPedigree')?.addEventListener('click', () => {
    if (treeRenderer) {
      treeRenderer.focusPedigree(person.id);
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tabPedigree')?.classList.add('active');
    }
    drawer.classList.remove('open');
  });

  drawerBody.querySelectorAll<HTMLButtonElement>('.rel-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetId = chip.dataset.id;
      if (targetId && treeRenderer) {
        treeRenderer.selectNode(targetId);
        treeRenderer.centerOnNode(Number(targetId));
      }
    });
  });

  const btnUnlock = drawerBody.querySelector('#btnUnlockPrivacy');
  if (btnUnlock) {
    btnUnlock.addEventListener('click', () => {
      openLoginModal();
    });
  }

  drawer.classList.add('open');
}

function setupFiltersAndControls(): void {
  const branchFilter = document.getElementById('branchFilter') as HTMLSelectElement;
  const generationFilter = document.getElementById('generationFilter') as HTMLSelectElement;

  branchFilter.addEventListener('change', () => {
    if (treeRenderer) treeRenderer.render(branchFilter.value, generationFilter.value);
    trackEvent('filter_change', 'branch_filtered', { branch: branchFilter.value });
  });

  generationFilter.addEventListener('change', () => {
    if (treeRenderer) treeRenderer.render(branchFilter.value, generationFilter.value);
    trackEvent('filter_change', 'generation_filtered', { generation: generationFilter.value });
  });

  document.getElementById('btnExpandAll')?.addEventListener('click', () => treeRenderer?.expandAll());
  document.getElementById('btnCollapseAll')?.addEventListener('click', () => treeRenderer?.collapseAll());

  document.getElementById('btnZoomIn')?.addEventListener('click', () => treeRenderer?.zoomIn());
  document.getElementById('btnZoomOut')?.addEventListener('click', () => treeRenderer?.zoomOut());
  document.getElementById('btnResetView')?.addEventListener('click', () => treeRenderer?.resetView());
  document.getElementById('btnFitScreen')?.addEventListener('click', () => treeRenderer?.fitToScreen());
}

function setupDrawer(): void {
  document.getElementById('btnCloseDrawer')?.addEventListener('click', () => {
    (document.getElementById('profileDrawer') as HTMLElement).classList.remove('open');
  });
}

function setupAuthModal(): void {
  const btnOpenLogin = document.getElementById('btnOpenLogin') as HTMLButtonElement;
  const btnCloseModal = document.getElementById('btnCloseModal') as HTMLButtonElement;
  const btnLogout = document.getElementById('btnLogout') as HTMLButtonElement;
  const btnSsoRedirect = document.getElementById('btnSsoRedirect') as HTMLButtonElement;
  const quickOtpForm = document.getElementById('quickOtpForm') as HTMLFormElement;
  const quickOtpEmail = document.getElementById('quickOtpEmail') as HTMLInputElement;
  const btnSendQuickOtp = document.getElementById('btnSendQuickOtp') as HTMLButtonElement;
  const quickOtpVerifyStep = document.getElementById('quickOtpVerifyStep') as HTMLElement;
  const quickOtpCode = document.getElementById('quickOtpCode') as HTMLInputElement;
  const btnVerifyQuickOtp = document.getElementById('btnVerifyQuickOtp') as HTMLButtonElement;

  btnOpenLogin?.addEventListener('click', openLoginModal);
  btnCloseModal?.addEventListener('click', closeLoginModal);

  btnLogout?.addEventListener('click', () => {
    auth.logout();
    updateAuthUI();
    if (treeRenderer && treeRenderer.selectedId) {
      const person = dataService.getIndividual(treeRenderer.selectedId);
      if (person) handleNodeSelection(person);
    }
  });

  btnSsoRedirect?.addEventListener('click', () => {
    auth.redirectToCentralLogin();
  });

  let currentOtpEmail = '';

  quickOtpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = quickOtpEmail.value.trim().toLowerCase();
    if (!email) return;

    btnSendQuickOtp.textContent = 'Sending code...';
    btnSendQuickOtp.disabled = true;

    try {
      const otpRes = await auth.requestDirectOtp(email);
      if (otpRes && otpRes.devOtp) {
        quickOtpCode.value = otpRes.devOtp;
      }
      currentOtpEmail = email;
      quickOtpForm.classList.add('hidden');
      quickOtpVerifyStep.classList.remove('hidden');
      quickOtpCode.focus();
    } catch (err: any) {
      alert(err.message || "Failed to send OTP code.");
    } finally {
      btnSendQuickOtp.textContent = 'Send 6-Digit Code';
      btnSendQuickOtp.disabled = false;
    }
  });

  btnVerifyQuickOtp?.addEventListener('click', async () => {
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
      if (treeRenderer && treeRenderer.selectedId) {
        const person = dataService.getIndividual(treeRenderer.selectedId);
        if (person) handleNodeSelection(person);
      }
    } catch (err: any) {
      alert(err.message || "Invalid code.");
    } finally {
      btnVerifyQuickOtp.textContent = 'Verify & Sign In';
      btnVerifyQuickOtp.disabled = false;
    }
  });

  auth.onAuthChange(() => updateAuthUI());
}

function openLoginModal(): void {
  document.getElementById('loginModal')?.classList.remove('hidden');
}

function closeLoginModal(): void {
  document.getElementById('loginModal')?.classList.add('hidden');
}
