import { Individual } from '../types/index.ts';
import { dataService } from './dataService.ts';
import { trackEvent } from './telemetryService.ts';

export class TreeRenderer {
  private container: HTMLElement;
  private viewport!: HTMLElement;
  private canvas!: HTMLElement;
  private onNodeSelect: (person: Individual) => void;

  public zoom = 1;
  public panX = 0;
  public panY = 0;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  public selectedId: number | null = null;
  public filterBranch = 'ALL';
  public filterGeneration = 'ALL';
  public viewMode: 'FULL' | 'FOCUS' = 'FULL';
  public focusNodeId: number | null = null;

  constructor(containerElement: HTMLElement, onNodeSelect: (person: Individual) => void) {
    this.container = containerElement;
    this.onNodeSelect = onNodeSelect;
    this.initCanvas();
  }

  private initCanvas(): void {
    this.container.innerHTML = `
      <div class="tree-viewport" id="treeViewport">
        <div class="tree-canvas" id="treeCanvas"></div>
      </div>
    `;

    this.viewport = this.container.querySelector('#treeViewport') as HTMLElement;
    this.canvas = this.container.querySelector('#treeCanvas') as HTMLElement;

    this.setupPanAndZoom();
  }

  private setupPanAndZoom(): void {
    this.viewport.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.node-card')) return;
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

  zoomIn(factor = 1.2): void {
    this.zoom = Math.min(this.zoom * factor, 2.5);
    this.updateTransform();
  }

  zoomOut(factor = 1.2): void {
    this.zoom = Math.max(this.zoom / factor, 0.35);
    this.updateTransform();
  }

  resetView(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
  }

  fitToScreen(): void {
    this.zoom = 0.85;
    this.panX = 40;
    this.panY = 40;
    this.updateTransform();
  }

  private updateTransform(): void {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  render(branchFilter = 'ALL', generationFilter = 'ALL'): void {
    this.filterBranch = branchFilter;
    this.filterGeneration = generationFilter;
    this.canvas.innerHTML = '';

    if (this.viewMode === 'FOCUS' && this.focusNodeId) {
      this.renderFocusView(this.focusNodeId);
    } else {
      this.renderFullHierarchy();
    }
  }

  private renderFullHierarchy(): void {
    const genMap = dataService.getGenerationsMap();
    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'hierarchy-container';

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

      const track = row.querySelector(`#genTrack_${gen}`) as HTMLElement;
      filteredMembers.forEach(person => {
        const node = this.createNodeCard(person);
        track.appendChild(node);
      });

      treeWrapper.appendChild(row);
    }

    this.canvas.appendChild(treeWrapper);
  }

  private renderFocusView(centerId: number): void {
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

    const ancestorRow = focusContainer.querySelector('#ancestorRow') as HTMLElement;
    if (ancestors.length === 0) {
      ancestorRow.innerHTML = '<p class="text-muted" style="color: #64748b; font-size: 13px;">No earlier ancestors recorded</p>';
    } else {
      ancestors.forEach(a => ancestorRow.appendChild(this.createNodeCard(a)));
    }

    const focalRow = focusContainer.querySelector('#focalRow') as HTMLElement;
    focalRow.appendChild(this.createNodeCard(person, true));

    const descendantRow = focusContainer.querySelector('#descendantRow') as HTMLElement;
    if (descendants.length === 0) {
      descendantRow.innerHTML = '<p class="text-muted" style="color: #64748b; font-size: 13px;">No recorded descendants</p>';
    } else {
      descendants.forEach(d => descendantRow.appendChild(this.createNodeCard(d)));
    }

    focusContainer.querySelector('#btnExitFocus')?.addEventListener('click', () => {
      this.viewMode = 'FULL';
      this.focusNodeId = null;
      this.render();
      this.fitToScreen();
    });

    this.canvas.appendChild(focusContainer);
  }

  createNodeCard(person: Individual, isFocal = false): HTMLElement {
    const card = document.createElement('div');
    card.className = `node-card ${person.gender} ${isFocal ? 'focal-node' : ''} ${this.selectedId === person.id ? 'selected' : ''}`;
    card.id = `node_${person.id}`;
    card.dataset.id = String(person.id);

    const initials = person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const branchColorClass = this.getBranchClass(person.branch || '');

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

  selectNode(id: number | string): void {
    this.selectedId = Number(id);

    document.querySelectorAll('.node-card').forEach(n => n.classList.remove('selected'));
    const active = document.getElementById(`node_${id}`);
    if (active) active.classList.add('selected');

    const person = dataService.getIndividual(id);
    if (person && this.onNodeSelect) {
      this.onNodeSelect(person);
      trackEvent('interaction', 'node_focus', { id: person.id, name: person.fullName });
    }
  }

  setFocusView(id: number | string): void {
    this.viewMode = 'FOCUS';
    this.focusNodeId = Number(id);
    this.render();
    this.resetView();
  }

  private getGenerationTitle(gen: number): string {
    const titles: Record<number, string> = {
      1: "1st Generation – Forefathers & Roots",
      2: "2nd Generation – Lineage Elders",
      3: "3rd Generation – Patriarchs & Matriarchs",
      4: "4th Generation – Senior Family Members",
      5: "5th Generation – Contemporary Generation",
      6: "6th Generation – Children & Next Lineage"
    };
    return titles[gen] || `Generation ${gen}`;
  }

  private getBranchClass(branchName: string): string {
    if (!branchName) return 'branch-default';
    if (branchName.includes('Velusamy')) return 'branch-velusamy';
    if (branchName.includes('Anna Anban')) return 'branch-annan';
    if (branchName.includes('Kandasamy')) return 'branch-kandasamy';
    if (branchName.includes('Palani Vel')) return 'branch-palanivel';
    return 'branch-default';
  }
}
