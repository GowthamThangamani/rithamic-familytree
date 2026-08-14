// Interactive Lineage & Family Tree Canvas Renderer
import { dataService } from './dataService.js';
import { trackEvent } from './telemetryService.js';

export class TreeRenderer {
  constructor(containerElement, onNodeSelect) {
    this.container = containerElement;
    this.onNodeSelect = onNodeSelect;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.selectedId = null;
    this.filterBranch = 'ALL';
    this.filterGeneration = 'ALL';
    this.viewMode = 'FULL'; // 'FULL' or 'FOCUS'
    this.focusNodeId = null;

    this.initCanvas();
  }

  initCanvas() {
    this.container.innerHTML = `
      <div class="tree-viewport" id="treeViewport">
        <div class="tree-canvas" id="treeCanvas"></div>
      </div>
    `;

    this.viewport = this.container.querySelector('#treeViewport');
    this.canvas = this.container.querySelector('#treeCanvas');

    this.setupPanAndZoom();
  }

  setupPanAndZoom() {
    // Mouse Drag
    this.viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.node-card')) return;
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      this.viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.viewport.style.cursor = 'grab';
    });

    // Mouse Wheel Zoom
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY < 0) {
        this.zoomIn(zoomFactor);
      } else {
        this.zoomOut(zoomFactor);
      }
    }, { passive: false });
  }

  zoomIn(factor = 1.2) {
    this.zoom = Math.min(this.zoom * factor, 2.5);
    this.updateTransform();
  }

  zoomOut(factor = 1.2) {
    this.zoom = Math.max(this.zoom / factor, 0.35);
    this.updateTransform();
  }

  resetView() {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
  }

  fitToScreen() {
    this.zoom = 0.85;
    this.panX = 40;
    this.panY = 40;
    this.updateTransform();
  }

  updateTransform() {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  render(branchFilter = 'ALL', generationFilter = 'ALL') {
    this.filterBranch = branchFilter;
    this.filterGeneration = generationFilter;
    this.canvas.innerHTML = '';

    if (this.viewMode === 'FOCUS' && this.focusNodeId) {
      this.renderFocusView(this.focusNodeId);
    } else {
      this.renderFullHierarchy();
    }
  }

  renderFullHierarchy() {
    const genMap = dataService.getGenerationsMap();
    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'hierarchy-container';

    // Render generation rows (Gen 1 to Gen 6)
    for (let gen = 1; gen <= 6; gen++) {
      if (this.filterGeneration !== 'ALL' && Number(this.filterGeneration) !== gen) continue;

      const members = genMap.get(gen) || [];
      const filteredMembers = members.filter(m => {
        if (this.filterBranch === 'ALL') return true;
        return m.branch && m.branch.includes(this.filterBranch);
      });

      if (filteredMembers.length === 0) continue;

      const row = document.createElement('div');
      row.className = 'generation-row';
      row.innerHTML = `
        <div class="generation-label">
          <span class="gen-tag">Gen ${gen}</span>
          <span class="gen-title">${this.getGenerationTitle(gen)}</span>
        </div>
        <div class="nodes-track" id="genTrack_${gen}"></div>
      `;

      const track = row.querySelector(`#genTrack_${gen}`);
      filteredMembers.forEach(person => {
        const node = this.createNodeCard(person);
        track.appendChild(node);
      });

      treeWrapper.appendChild(row);
    }

    this.canvas.appendChild(treeWrapper);
  }

  renderFocusView(centerId) {
    const person = dataService.getIndividual(centerId);
    if (!person) return;

    const ancestors = dataService.getAncestors(centerId);
    const descendants = dataService.getDescendants(centerId);

    const focusContainer = document.createElement('div');
    focusContainer.className = 'focus-pedigree-container';

    focusContainer.innerHTML = `
      <div class="focus-bar">
        <span class="focus-title">Focus Lineage: <strong>${person.fullName}</strong></span>
        <button class="btn-exit-focus" id="btnExitFocus">← View Full Family Tree</button>
      </div>
      <div class="pedigree-section" id="ancestorsSection">
        <h4 class="pedigree-heading">Ancestors & Parents</h4>
        <div class="pedigree-row" id="ancestorRow"></div>
      </div>
      <div class="pedigree-section focal-section">
        <h4 class="pedigree-heading">Selected Member</h4>
        <div class="pedigree-row" id="focalRow"></div>
      </div>
      <div class="pedigree-section" id="descendantsSection">
        <h4 class="pedigree-heading">Children & Descendants</h4>
        <div class="pedigree-row" id="descendantRow"></div>
      </div>
    `;

    // Ancestors
    const ancestorRow = focusContainer.querySelector('#ancestorRow');
    if (ancestors.length === 0) {
      ancestorRow.innerHTML = '<p class="text-muted">No earlier ancestors recorded</p>';
    } else {
      ancestors.forEach(a => ancestorRow.appendChild(this.createNodeCard(a)));
    }

    // Focal Person
    const focalRow = focusContainer.querySelector('#focalRow');
    focalRow.appendChild(this.createNodeCard(person, true));

    // Descendants
    const descendantRow = focusContainer.querySelector('#descendantRow');
    if (descendants.length === 0) {
      descendantRow.innerHTML = '<p class="text-muted">No recorded descendants</p>';
    } else {
      descendants.forEach(d => descendantRow.appendChild(this.createNodeCard(d)));
    }

    focusContainer.querySelector('#btnExitFocus').addEventListener('click', () => {
      this.viewMode = 'FULL';
      this.focusNodeId = null;
      this.render();
      this.fitToScreen();
    });

    this.canvas.appendChild(focusContainer);
  }

  createNodeCard(person, isFocal = false) {
    const card = document.createElement('div');
    card.className = `node-card ${person.gender} ${isFocal ? 'focal-node' : ''} ${this.selectedId === person.id ? 'selected' : ''}`;
    card.id = `node_${person.id}`;
    card.dataset.id = person.id;

    const initials = person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const branchColorClass = this.getBranchClass(person.branch);

    card.innerHTML = `
      <div class="node-branch-stripe ${branchColorClass}"></div>
      <div class="node-content">
        <div class="node-avatar ${person.gender}">${initials}</div>
        <div class="node-details">
          <div class="node-name">${person.fullName}</div>
          ${person.tamilName ? `<div class="node-tamil">${person.tamilName}</div>` : ''}
          <div class="node-meta">
            <span class="node-lifespan">${person.birthYear || (person.isLiving ? 'Living' : 'Deceased')}</span>
            ${person.nativePlace ? `<span class="node-place">📍 ${person.nativePlace.split(',')[0]}</span>` : ''}
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(person.id);
    });

    return card;
  }

  selectNode(id) {
    this.selectedId = Number(id);

    // Update active visual outline
    document.querySelectorAll('.node-card').forEach(n => n.classList.remove('selected'));
    const active = document.getElementById(`node_${id}`);
    if (active) active.classList.add('selected');

    const person = dataService.getIndividual(id);
    if (person && this.onNodeSelect) {
      this.onNodeSelect(person);
      trackEvent('interaction', 'node_focus', { id: person.id, name: person.fullName });
    }
  }

  setFocusView(id) {
    this.viewMode = 'FOCUS';
    this.focusNodeId = Number(id);
    this.render();
    this.resetView();
  }

  getGenerationTitle(gen) {
    const titles = {
      1: "1st Generation – Forefathers & Roots",
      2: "2nd Generation – Lineage Elders",
      3: "3rd Generation – Patriarchs & Matriarchs",
      4: "4th Generation – Senior Family Members",
      5: "5th Generation – Contemporary Generation",
      6: "6th Generation – Children & Next Lineage"
    };
    return titles[gen] || `Generation ${gen}`;
  }

  getBranchClass(branchName) {
    if (!branchName) return 'branch-default';
    if (branchName.includes('Velusamy')) return 'branch-velusamy';
    if (branchName.includes('Anna Anban')) return 'branch-annan';
    if (branchName.includes('Kandasamy')) return 'branch-kandasamy';
    if (branchName.includes('Palani Vel')) return 'branch-palanivel';
    return 'branch-default';
  }
}
