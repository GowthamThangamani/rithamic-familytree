import { Individual } from '../types/index.ts';
import { dataService } from './dataService.ts';
import { trackEvent } from './telemetryService.ts';

export class TreeRenderer {
  private container: HTMLElement;
  private viewport!: HTMLElement;
  private canvas!: HTMLElement;
  private onNodeSelect: (person: Individual) => void;

  public zoom = 0.95;
  public panX = 40;
  public panY = 40;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  public selectedId: number | null = null;
  public filterBranch = 'ALL';
  public filterGeneration = 'ALL';
  public viewMode: 'FULL' | 'LINEAGE_TRACE' = 'FULL';
  public focalMemberId: number | null = null;

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
      if ((e.target as HTMLElement).closest('.node-card') || (e.target as HTMLElement).closest('button')) return;
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
      const zoomFactor = 1.08;
      if (e.deltaY < 0) {
        this.zoomIn(zoomFactor);
      } else {
        this.zoomOut(zoomFactor);
      }
    }, { passive: false });
  }

  zoomIn(factor = 1.15): void {
    this.zoom = Math.min(this.zoom * factor, 2.5);
    this.updateTransform();
  }

  zoomOut(factor = 1.15): void {
    this.zoom = Math.max(this.zoom / factor, 0.35);
    this.updateTransform();
  }

  resetView(): void {
    this.zoom = 1;
    this.panX = 40;
    this.panY = 40;
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

    if (this.viewMode === 'LINEAGE_TRACE' && this.focalMemberId) {
      this.renderFullLineageTraceView(this.focalMemberId);
    } else {
      this.renderFullHierarchy();
    }
  }

  private renderFullHierarchy(): void {
    const genMap = dataService.getGenerationsMap();
    const treeWrapper = document.createElement('div');
    treeWrapper.className = 'hierarchy-container';

    let renderedRowsCount = 0;

    for (let gen = 1; gen <= 6; gen++) {
      if (this.filterGeneration !== 'ALL' && Number(this.filterGeneration) !== gen) continue;

      const members = genMap.get(gen) || [];
      const filteredMembers = members.filter(m => {
        if (this.filterBranch === 'ALL') return true;
        const b = (m.branch || '').toLowerCase();
        return b.includes(this.filterBranch.toLowerCase());
      });

      if (filteredMembers.length === 0) continue;
      renderedRowsCount++;

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
      
      // Group couples side by side
      const renderedInGen = new Set<number>();

      filteredMembers.forEach(person => {
        if (renderedInGen.has(person.id)) return;

        const spouses = dataService.getSpouses(person.id);
        const spouseInSameGen = spouses.find(s => s.generation === person.generation && filteredMembers.some(fm => fm.id === s.id));

        if (spouseInSameGen) {
          const coupleUnit = document.createElement('div');
          coupleUnit.className = 'couple-unit';
          
          const primaryCard = this.createNodeCard(person);
          const heartBadge = document.createElement('div');
          heartBadge.className = 'marriage-ring-badge';
          heartBadge.innerHTML = '💍';
          heartBadge.title = `Married: ${person.fullName} & ${spouseInSameGen.fullName}`;

          const spouseCard = this.createNodeCard(spouseInSameGen);

          coupleUnit.appendChild(primaryCard);
          coupleUnit.appendChild(heartBadge);
          coupleUnit.appendChild(spouseCard);

          track.appendChild(coupleUnit);

          renderedInGen.add(person.id);
          renderedInGen.add(spouseInSameGen.id);
        } else {
          const node = this.createNodeCard(person);
          track.appendChild(node);
          renderedInGen.add(person.id);
        }
      });

      treeWrapper.appendChild(row);
    }

    if (renderedRowsCount === 0) {
      treeWrapper.innerHTML = `
        <div style="padding: 40px; color: #94a3b8; font-size: 15px; text-align: center;">
          No family members found for the selected branch/generation filter.
        </div>
      `;
    }

    this.canvas.appendChild(treeWrapper);
  }

  /**
   * Renders the complete ancestral tree from the root ancestors down to focal person + all branch points of conflict
   */
  private renderFullLineageTraceView(focalId: number): void {
    const focal = dataService.getIndividual(focalId);
    if (!focal) return;

    const { directPath, allRelatedInPath } = dataService.getEntireAncestryPath(focalId);
    const directPathIds = new Set(directPath.map(p => p.id));

    const traceContainer = document.createElement('div');
    traceContainer.className = 'trace-lineage-container';

    traceContainer.innerHTML = `
      <div class="trace-header-banner">
        <div class="trace-info">
          <span class="trace-badge">COMPLETE ANCESTRY TRACE</span>
          <h2 class="trace-title">Ancestral Lineage of <strong>${focal.fullName}</strong></h2>
          <p class="trace-subtitle">Tracing direct roots up to <strong>Periya Pannai</strong>, showing parental marriages and divergence points.</p>
        </div>
        <button class="btn-exit-focus" id="btnExitTrace">← View Full Family Tree</button>
      </div>

      <div class="conflict-legend-bar">
        <div class="legend-item"><span class="legend-dot gold"></span> <strong>Direct Path to ${focal.fullName}</strong></div>
        <div class="legend-item"><span class="legend-dot blue"></span> Velusamy Branch</div>
        <div class="legend-item"><span class="legend-dot green"></span> Anna Anban Branch (Divergence)</div>
        <div class="legend-item"><span class="legend-dot purple"></span> Palanivel Branch (Divergence)</div>
      </div>

      <div class="trace-tree-body" id="traceTreeBody"></div>
    `;

    const body = traceContainer.querySelector('#traceTreeBody') as HTMLElement;

    // Group related members into generations
    const genGroups = new Map<number, Individual[]>();
    for (let g = 1; g <= 6; g++) genGroups.set(g, []);

    allRelatedInPath.forEach(ind => {
      const g = ind.generation || 1;
      if (!genGroups.has(g)) genGroups.set(g, []);
      genGroups.get(g)!.push(ind);
    });

    for (let g = 1; g <= 6; g++) {
      const membersInGen = genGroups.get(g) || [];
      if (membersInGen.length === 0) continue;

      const row = document.createElement('div');
      row.className = 'trace-gen-row';
      row.innerHTML = `
        <div class="trace-gen-sidebar">
          <span class="gen-tag">Tier ${g}</span>
          <span class="gen-title">${this.getGenerationTitle(g)}</span>
        </div>
        <div class="trace-track" id="traceTrack_${g}"></div>
      `;

      const track = row.querySelector(`#traceTrack_${g}`) as HTMLElement;
      const rendered = new Set<number>();

      membersInGen.forEach(person => {
        if (rendered.has(person.id)) return;

        const isDirect = directPathIds.has(person.id);
        const spouses = dataService.getSpouses(person.id);
        const spouseInGen = spouses.find(s => membersInGen.some(m => m.id === s.id));

        if (spouseInGen) {
          const couple = document.createElement('div');
          couple.className = `couple-unit ${isDirect ? 'direct-path-couple' : ''}`;
          
          const c1 = this.createNodeCard(person, person.id === focalId, isDirect);
          const ring = document.createElement('div');
          ring.className = 'marriage-ring-badge';
          ring.innerHTML = '💍';
          const c2 = this.createNodeCard(spouseInGen, spouseInGen.id === focalId, directPathIds.has(spouseInGen.id));

          couple.appendChild(c1);
          couple.appendChild(ring);
          couple.appendChild(c2);

          track.appendChild(couple);
          rendered.add(person.id);
          rendered.add(spouseInGen.id);
        } else {
          const card = this.createNodeCard(person, person.id === focalId, isDirect);
          track.appendChild(card);
          rendered.add(person.id);
        }
      });

      body.appendChild(row);
    }

    traceContainer.querySelector('#btnExitTrace')?.addEventListener('click', () => {
      this.viewMode = 'FULL';
      this.focalMemberId = null;
      this.render();
      this.fitToScreen();
    });

    this.canvas.appendChild(traceContainer);
  }

  createNodeCard(person: Individual, isFocal = false, isDirectPath = false): HTMLElement {
    const card = document.createElement('div');
    card.className = `node-card ${person.gender} ${isFocal ? 'focal-node' : ''} ${isDirectPath ? 'direct-path-node' : ''} ${this.selectedId === person.id ? 'selected' : ''}`;
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
            <span class="node-lifespan">${person.birthYear ? `b. ${person.birthYear}` : (person.isLiving ? 'Living' : 'Deceased')}</span>
            ${person.nativePlace ? `<span class="node-place">📍 ${person.nativePlace.split(',')[0]}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="node-actions-bar">
        <button class="node-btn btn-profile" data-action="profile" title="View Full Profile">
          👤 Profile
        </button>
        <button class="node-btn btn-lineage" data-action="lineage" title="Trace Complete Lineage & Tree">
          🌳 Lineage Tree
        </button>
      </div>
    `;

    // Click on Card Body: Focus / Select
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.node-btn')) return; // handled separately
      e.stopPropagation();
      this.selectNode(person.id);
    });

    // Button 1: Profile Drawer
    card.querySelector('.btn-profile')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(person.id);
    });

    // Button 2: Full Lineage Trace
    card.querySelector('.btn-lineage')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.traceFullLineage(person.id);
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

  traceFullLineage(id: number | string): void {
    this.viewMode = 'LINEAGE_TRACE';
    this.focalMemberId = Number(id);
    this.render();
    this.resetView();
    trackEvent('interaction', 'lineage_trace', { id: Number(id) });
  }

  private getGenerationTitle(gen: number): string {
    const titles: Record<number, string> = {
      1: "1st Generation – Forefathers & Ancestral Roots",
      2: "2nd Generation – Lineage Elders & Patriarchs",
      3: "3rd Generation – Branch Patriarchs & Matriarchs",
      4: "4th Generation – Senior Family Lineage",
      5: "5th Generation – Contemporary Family Members",
      6: "6th Generation – Children & Next Generation"
    };
    return titles[gen] || `Generation ${gen}`;
  }

  private getBranchClass(branchName: string): string {
    if (!branchName) return 'branch-default';
    if (branchName.includes('Velusamy')) return 'branch-velusamy';
    if (branchName.includes('Anna Anban') || branchName.includes('Anna Anpan')) return 'branch-annan';
    if (branchName.includes('Kandasamy')) return 'branch-kandasamy';
    if (branchName.includes('Palani Vel') || branchName.includes('Palanivel')) return 'branch-palanivel';
    return 'branch-default';
  }
}
