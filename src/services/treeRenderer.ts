import { Individual } from '../types/index.ts';
import { dataService } from './dataService.ts';
import { trackEvent } from './telemetryService.ts';

interface TreeNodeUnit {
  id: number;
  person: Individual;
  spouse: Individual | null;
  children: TreeNodeUnit[];
  isCollapsed: boolean;
  x: number;
  y: number;
  width: number;
  subtreeWidth: number;
  generation: number;
}

export class TreeRenderer {
  private container: HTMLElement;
  private viewport!: HTMLElement;
  private canvas!: HTMLElement;
  private svgLayer!: SVGSVGElement;
  private htmlLayer!: HTMLElement;
  private onNodeSelect: (person: Individual) => void;

  public zoom = 0.85;
  public panX = 60;
  public panY = 60;
  private isDragging = false;
  private startX = 0;
  private startY = 0;

  public selectedId: number | null = null;
  public hoveredId: number | null = null;
  public filterBranch = 'ALL';
  public filterGeneration = 'ALL';
  public viewMode: 'TREE' | 'PEDIGREE' | 'MATRIX' = 'TREE';
  public focalMemberId: number | null = null;
  private collapsedNodes = new Set<number>();

  private readonly CARD_WIDTH = 230;
  private readonly COUPLE_WIDTH = 500;
  private readonly CARD_HEIGHT = 125;
  private readonly H_GAP = 36;
  private readonly V_GAP = 140;

  constructor(containerElement: HTMLElement, onNodeSelect: (person: Individual) => void) {
    this.container = containerElement;
    this.onNodeSelect = onNodeSelect;
    this.initCanvas();
  }

  private initCanvas(): void {
    this.container.innerHTML = `
      <div class="tree-viewport" id="treeViewport">
        <div class="tree-canvas" id="treeCanvas">
          <svg class="tree-svg-layer" id="treeSvgLayer"></svg>
          <div class="tree-html-layer" id="treeHtmlLayer"></div>
        </div>
      </div>
    `;

    this.viewport = this.container.querySelector('#treeViewport') as HTMLElement;
    this.canvas = this.container.querySelector('#treeCanvas') as HTMLElement;
    this.svgLayer = this.container.querySelector('#treeSvgLayer') as SVGSVGElement;
    this.htmlLayer = this.container.querySelector('#treeHtmlLayer') as HTMLElement;

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
    this.zoom = Math.max(this.zoom / factor, 0.25);
    this.updateTransform();
  }

  resetView(): void {
    this.zoom = 0.85;
    this.panX = 60;
    this.panY = 60;
    this.updateTransform();
  }

  fitToScreen(): void {
    this.zoom = 0.75;
    this.panX = 80;
    this.panY = 40;
    this.updateTransform();
  }

  centerOnNode(id: number): void {
    const card = document.getElementById(`node_${id}`);
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const viewportRect = this.viewport.getBoundingClientRect();

    // Compute center relative to current scale
    const targetX = (viewportRect.width / 2) - ((rect.left - this.panX) * this.zoom) - (rect.width * this.zoom / 2);
    const targetY = (viewportRect.height / 2) - ((rect.top - this.panY) * this.zoom) - (rect.height * this.zoom / 2);

    this.panX = targetX;
    this.panY = targetY;
    this.zoom = 0.95;
    this.updateTransform();
  }

  private updateTransform(): void {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  render(branchFilter = 'ALL', generationFilter = 'ALL'): void {
    this.filterBranch = branchFilter;
    this.filterGeneration = generationFilter;

    this.htmlLayer.innerHTML = '';
    this.svgLayer.innerHTML = '';

    if (this.viewMode === 'PEDIGREE' && this.focalMemberId) {
      this.renderPedigreeView(this.focalMemberId);
    } else if (this.viewMode === 'MATRIX') {
      this.renderGenerationalMatrix();
    } else {
      this.renderHierarchicalTree();
    }
  }

  expandAll(): void {
    this.collapsedNodes.clear();
    this.render(this.filterBranch, this.filterGeneration);
  }

  collapseAll(): void {
    const roots = this.findRootIndividuals();
    roots.forEach(r => this.collapsedNodes.add(r.id));
    this.render(this.filterBranch, this.filterGeneration);
  }

  toggleNodeCollapse(id: number): void {
    if (this.collapsedNodes.has(id)) {
      this.collapsedNodes.delete(id);
    } else {
      this.collapsedNodes.add(id);
    }
    this.render(this.filterBranch, this.filterGeneration);
    trackEvent('interaction', 'toggle_subtree', { nodeId: id, isCollapsed: this.collapsedNodes.has(id) });
  }

  // ==========================================================================
  // VIEW MODE 1: HIERARCHICAL TREE GRAPH (WITH SVG BRANCHES & MARITAL HUBS)
  // ==========================================================================

  private renderHierarchicalTree(): void {
    const rootIndividuals = this.findRootIndividuals();
    if (rootIndividuals.length === 0) {
      this.htmlLayer.innerHTML = `<div class="empty-state">No roots found in dataset.</div>`;
      return;
    }

    const processedPersons = new Set<number>();
    const treeRoots: TreeNodeUnit[] = [];

    rootIndividuals.forEach(person => {
      if (processedPersons.has(person.id)) return;
      const unit = this.buildSubtreeUnit(person, processedPersons);
      if (unit) treeRoots.push(unit);
    });

    // 1. Calculate Layout Coordinates
    let currentX = 60;
    const startY = 60;

    treeRoots.forEach(root => {
      this.calculateSubtreeWidths(root);
      this.assignCoordinates(root, currentX, startY);
      currentX += root.subtreeWidth + 80;
    });

    // Canvas boundary sizing
    let maxX = currentX + 300;
    let maxY = 1800;

    this.svgLayer.setAttribute('width', String(maxX));
    this.svgLayer.setAttribute('height', String(maxY));
    this.htmlLayer.style.width = `${maxX}px`;
    this.htmlLayer.style.height = `${maxY}px`;

    // 2. Render SVG Connector Layer (Marriages, Parent drops, Child buses & forks)
    const svgDefs = `
      <defs>
        <linearGradient id="lineGradGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
        <linearGradient id="lineGradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
        <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    `;
    this.svgLayer.innerHTML = svgDefs;

    treeRoots.forEach(root => {
      this.renderSubtreeConnectors(root);
    });

    // 3. Render HTML Cards Layer
    treeRoots.forEach(root => {
      this.renderSubtreeCards(root);
    });
  }

  private findRootIndividuals(): Individual[] {
    const all = dataService.getAllIndividuals();
    // Primary root: Periya Pannai (#19) or anyone with no parents in Gen 1
    const roots = all.filter(p => {
      const parents = dataService.getParents(p.id);
      return parents.length === 0 && (p.generation === 1 || p.id === 19) && p.gender === 'male';
    });

    if (roots.length > 0) return roots;

    // Fallback: search for top-most generation males
    const minGen = Math.min(...all.map(p => p.generation || 1));
    return all.filter(p => p.generation === minGen && p.gender === 'male');
  }

  private buildSubtreeUnit(person: Individual, processed: Set<number>): TreeNodeUnit | null {
    if (processed.has(person.id)) return null;
    processed.add(person.id);

    const spouses = dataService.getSpouses(person.id);
    const spouse = spouses.length > 0 ? spouses[0] : null;
    if (spouse) processed.add(spouse.id);

    // Get children of either parent
    const childrenSet = new Set<number>();
    dataService.getChildren(person.id).forEach(c => childrenSet.add(c.id));
    if (spouse) {
      dataService.getChildren(spouse.id).forEach(c => childrenSet.add(c.id));
    }

    const childUnits: TreeNodeUnit[] = [];
    const sortedChildren = Array.from(childrenSet)
      .map(id => dataService.getIndividual(id)!)
      .filter(Boolean)
      .sort((a, b) => (Number(a.birthYear || 9999) - Number(b.birthYear || 9999)));

    sortedChildren.forEach(child => {
      if (!processed.has(child.id)) {
        const childUnit = this.buildSubtreeUnit(child, processed);
        if (childUnit) childUnits.push(childUnit);
      }
    });

    const isCouple = Boolean(spouse);
    const unitWidth = isCouple ? this.COUPLE_WIDTH : this.CARD_WIDTH;

    return {
      id: person.id,
      person,
      spouse,
      children: childUnits,
      isCollapsed: this.collapsedNodes.has(person.id),
      x: 0,
      y: 0,
      width: unitWidth,
      subtreeWidth: unitWidth,
      generation: person.generation
    };
  }

  private calculateSubtreeWidths(unit: TreeNodeUnit): number {
    if (unit.children.length === 0 || unit.isCollapsed) {
      unit.subtreeWidth = unit.width + this.H_GAP;
      return unit.subtreeWidth;
    }

    let childrenWidthSum = 0;
    unit.children.forEach(child => {
      childrenWidthSum += this.calculateSubtreeWidths(child);
    });

    unit.subtreeWidth = Math.max(unit.width + this.H_GAP, childrenWidthSum);
    return unit.subtreeWidth;
  }

  private assignCoordinates(unit: TreeNodeUnit, leftX: number, currentY: number): void {
    unit.y = currentY;

    if (unit.children.length === 0 || unit.isCollapsed) {
      unit.x = leftX + (unit.subtreeWidth - unit.width) / 2;
      return;
    }

    let childLeftX = leftX;
    unit.children.forEach(child => {
      this.assignCoordinates(child, childLeftX, currentY + this.CARD_HEIGHT + this.V_GAP);
      childLeftX += child.subtreeWidth;
    });

    // Center parent over all children
    const firstChild = unit.children[0];
    const lastChild = unit.children[unit.children.length - 1];
    const firstCenter = firstChild.x + (firstChild.width / 2);
    const lastCenter = lastChild.x + (lastChild.width / 2);

    unit.x = ((firstCenter + lastCenter) / 2) - (unit.width / 2);

    // Prevent parent shifting left of allocated bounding box
    if (unit.x < leftX) {
      unit.x = leftX;
    }
  }

  private renderSubtreeConnectors(unit: TreeNodeUnit): void {
    const parentBottomY = unit.y + this.CARD_HEIGHT;
    const parentCenterX = unit.x + (unit.width / 2);

    // 1. Marriage connector if couple
    if (unit.spouse) {
      const c1CenterX = unit.x + (this.CARD_WIDTH / 2);
      const c2CenterX = unit.x + this.CARD_WIDTH + 40 + (this.CARD_WIDTH / 2);
      const coupleCenterY = unit.y + (this.CARD_HEIGHT / 2);

      const marriageLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      marriageLine.setAttribute('d', `M ${c1CenterX} ${coupleCenterY} L ${c2CenterX} ${coupleCenterY}`);
      marriageLine.setAttribute('class', 'svg-marriage-line');
      this.svgLayer.appendChild(marriageLine);
    }

    // 2. Parent-to-Children connections
    if (unit.children.length > 0 && !unit.isCollapsed) {
      const busY = parentBottomY + 45;

      // Drop line from parent center to horizontal bus
      const parentDrop = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      parentDrop.setAttribute('d', `M ${parentCenterX} ${parentBottomY} L ${parentCenterX} ${busY}`);
      parentDrop.setAttribute('class', `svg-branch-line line-from-${unit.id}`);
      this.svgLayer.appendChild(parentDrop);

      if (unit.children.length === 1) {
        // Single child: straight drop line
        const child = unit.children[0];
        const childCenterX = child.x + (child.width / 2);
        const childTopY = child.y;

        const singleChildLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        singleChildLine.setAttribute('d', `M ${parentCenterX} ${busY} L ${childCenterX} ${busY} L ${childCenterX} ${childTopY}`);
        singleChildLine.setAttribute('class', `svg-branch-line line-to-${child.id}`);
        this.svgLayer.appendChild(singleChildLine);
      } else {
        // Multiple children: Horizontal bus rail spanning first to last child
        const firstChildCenterX = unit.children[0].x + (unit.children[0].width / 2);
        const lastChildCenterX = unit.children[unit.children.length - 1].x + (unit.children[unit.children.length - 1].width / 2);

        const busLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        busLine.setAttribute('d', `M ${firstChildCenterX} ${busY} L ${lastChildCenterX} ${busY}`);
        busLine.setAttribute('class', `svg-branch-bus line-bus-${unit.id}`);
        this.svgLayer.appendChild(busLine);

        // Fork down into each child
        unit.children.forEach(child => {
          const childCenterX = child.x + (child.width / 2);
          const childTopY = child.y;

          const forkLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          forkLine.setAttribute('d', `M ${childCenterX} ${busY} L ${childCenterX} ${childTopY}`);
          forkLine.setAttribute('class', `svg-branch-fork line-to-${child.id}`);
          this.svgLayer.appendChild(forkLine);
        });
      }

      // Recursively render children connectors
      unit.children.forEach(child => {
        this.renderSubtreeConnectors(child);
      });
    }
  }

  private renderSubtreeCards(unit: TreeNodeUnit): void {
    const cardGroup = document.createElement('div');
    cardGroup.className = 'tree-node-group';
    cardGroup.style.position = 'absolute';
    cardGroup.style.left = `${unit.x}px`;
    cardGroup.style.top = `${unit.y}px`;

    if (unit.spouse) {
      // Render married couple side by side
      const coupleWrapper = document.createElement('div');
      coupleWrapper.className = 'couple-unit-container';

      const p1Card = this.createNodeCard(unit.person);
      const ringBadge = document.createElement('div');
      ringBadge.className = 'marriage-ring-badge';
      ringBadge.innerHTML = '💍';
      ringBadge.title = `Married: ${unit.person.fullName} & ${unit.spouse.fullName}`;

      const p2Card = this.createNodeCard(unit.spouse);

      coupleWrapper.appendChild(p1Card);
      coupleWrapper.appendChild(ringBadge);
      coupleWrapper.appendChild(p2Card);

      // Subtree toggle button on couple
      if (unit.children.length > 0) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = `btn-subtree-toggle ${unit.isCollapsed ? 'collapsed' : 'expanded'}`;
        toggleBtn.innerHTML = unit.isCollapsed ? `+ ${unit.children.length} Children` : `−`;
        toggleBtn.title = unit.isCollapsed ? `Expand ${unit.children.length} descendants` : `Collapse branch`;
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleNodeCollapse(unit.person.id);
        });
        coupleWrapper.appendChild(toggleBtn);
      }

      cardGroup.appendChild(coupleWrapper);
    } else {
      // Single person node
      const singleCard = this.createNodeCard(unit.person);

      if (unit.children.length > 0) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = `btn-subtree-toggle ${unit.isCollapsed ? 'collapsed' : 'expanded'}`;
        toggleBtn.innerHTML = unit.isCollapsed ? `+ ${unit.children.length}` : `−`;
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleNodeCollapse(unit.person.id);
        });
        singleCard.appendChild(toggleBtn);
      }

      cardGroup.appendChild(singleCard);
    }

    this.htmlLayer.appendChild(cardGroup);

    // Recursively render children if not collapsed
    if (!unit.isCollapsed) {
      unit.children.forEach(child => {
        this.renderSubtreeCards(child);
      });
    }
  }

  // ==========================================================================
  // VIEW MODE 2: PEDIGREE & DIRECT ANCESTRY FOCUS
  // ==========================================================================

  private renderPedigreeView(focalId: number): void {
    const focal = dataService.getIndividual(focalId);
    if (!focal) return;

    const { directPath, allRelatedInPath } = dataService.getEntireAncestryPath(focalId);
    const directPathIds = new Set(directPath.map(p => p.id));

    const pedigreeWrapper = document.createElement('div');
    pedigreeWrapper.className = 'pedigree-focus-wrapper';

    pedigreeWrapper.innerHTML = `
      <div class="pedigree-banner">
        <div class="pedigree-info">
          <span class="gen-tag">PEDIGREE FOCUS VIEW</span>
          <h2 class="pedigree-title">Ancestral Lineage of <strong>${focal.fullName}</strong></h2>
          <p class="pedigree-subtitle">Tracing ancestral path upwards to <strong>Periya Pannai</strong> and immediate descendants downwards.</p>
        </div>
        <button class="btn-auth" id="btnExitPedigree" style="padding: 8px 16px; font-size: 12px;">
          🌳 Return to Full Tree
        </button>
      </div>

      <div class="pedigree-body" id="pedigreeBody"></div>
    `;

    const body = pedigreeWrapper.querySelector('#pedigreeBody') as HTMLElement;

    // Group by generations
    const genGroups = new Map<number, Individual[]>();
    for (let g = 1; g <= 6; g++) genGroups.set(g, []);

    allRelatedInPath.forEach(ind => {
      const g = ind.generation || 1;
      if (!genGroups.has(g)) genGroups.set(g, []);
      genGroups.get(g)!.push(ind);
    });

    for (let g = 1; g <= 6; g++) {
      const members = genGroups.get(g) || [];
      if (members.length === 0) continue;

      const row = document.createElement('div');
      row.className = 'pedigree-tier-row';
      row.innerHTML = `
        <div class="pedigree-tier-label">
          <span class="gen-tag">Tier ${g}</span>
          <span class="gen-title">${this.getGenerationTitle(g)}</span>
        </div>
        <div class="pedigree-track" id="pedigreeTrack_${g}"></div>
      `;

      const track = row.querySelector(`#pedigreeTrack_${g}`) as HTMLElement;
      const rendered = new Set<number>();

      members.forEach(person => {
        if (rendered.has(person.id)) return;
        const isDirect = directPathIds.has(person.id);
        const isFocal = person.id === focalId;

        const spouses = dataService.getSpouses(person.id);
        const spouseInGen = spouses.find(s => members.some(m => m.id === s.id));

        if (spouseInGen) {
          const couple = document.createElement('div');
          couple.className = `couple-unit ${isDirect ? 'direct-path-couple' : ''}`;
          
          const c1 = this.createNodeCard(person, isFocal, isDirect);
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
          const card = this.createNodeCard(person, isFocal, isDirect);
          track.appendChild(card);
          rendered.add(person.id);
        }
      });

      body.appendChild(row);
    }

    pedigreeWrapper.querySelector('#btnExitPedigree')?.addEventListener('click', () => {
      this.viewMode = 'TREE';
      this.focalMemberId = null;
      this.render();
      this.resetView();
    });

    this.htmlLayer.appendChild(pedigreeWrapper);
  }

  // ==========================================================================
  // VIEW MODE 3: GENERATIONAL MATRIX (TIER OVERVIEW)
  // ==========================================================================

  private renderGenerationalMatrix(): void {
    const genMap = dataService.getGenerationsMap();
    const matrixWrapper = document.createElement('div');
    matrixWrapper.className = 'matrix-container';

    for (let gen = 1; gen <= 6; gen++) {
      if (this.filterGeneration !== 'ALL' && Number(this.filterGeneration) !== gen) continue;

      const members = genMap.get(gen) || [];
      const filtered = members.filter(m => {
        if (this.filterBranch === 'ALL') return true;
        const b = (m.branch || '').toLowerCase();
        return b.includes(this.filterBranch.toLowerCase());
      });

      if (filtered.length === 0) continue;

      const row = document.createElement('div');
      row.className = 'generation-row';
      row.innerHTML = `
        <div class="generation-label">
          <span class="gen-tag">Gen ${gen}</span>
          <span class="gen-title">${this.getGenerationTitle(gen)} (${filtered.length} members)</span>
        </div>
        <div class="nodes-track" id="matrixTrack_${gen}"></div>
      `;

      const track = row.querySelector(`#matrixTrack_${gen}`) as HTMLElement;
      const rendered = new Set<number>();

      filtered.forEach(person => {
        if (rendered.has(person.id)) return;

        const spouses = dataService.getSpouses(person.id);
        const spouseInSameGen = spouses.find(s => s.generation === person.generation && filtered.some(fm => fm.id === s.id));

        if (spouseInSameGen) {
          const coupleUnit = document.createElement('div');
          coupleUnit.className = 'couple-unit';
          
          const primaryCard = this.createNodeCard(person);
          const heartBadge = document.createElement('div');
          heartBadge.className = 'marriage-ring-badge';
          heartBadge.innerHTML = '💍';

          const spouseCard = this.createNodeCard(spouseInSameGen);

          coupleUnit.appendChild(primaryCard);
          coupleUnit.appendChild(heartBadge);
          coupleUnit.appendChild(spouseCard);
          track.appendChild(coupleUnit);

          rendered.add(person.id);
          rendered.add(spouseInSameGen.id);
        } else {
          const node = this.createNodeCard(person);
          track.appendChild(node);
          rendered.add(person.id);
        }
      });

      matrixWrapper.appendChild(row);
    }

    this.htmlLayer.appendChild(matrixWrapper);
  }

  // ==========================================================================
  // SHARED NODE CARD BUILDER
  // ==========================================================================

  createNodeCard(person: Individual, isFocal = false, isDirectPath = false): HTMLElement {
    const card = document.createElement('div');
    card.className = `node-card ${person.gender} ${isFocal ? 'focal-node' : ''} ${isDirectPath ? 'direct-path-node' : ''} ${this.selectedId === person.id ? 'selected' : ''}`;
    card.id = `node_${person.id}`;
    card.dataset.id = String(person.id);

    const initials = person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const branchColorClass = this.getBranchClass(person.branch || '');

    const lifespan = person.birthYear
      ? `b. ${person.birthYear}${person.passingYear ? ` – ${person.passingYear}` : ''}`
      : (person.isLiving ? '🟢 Living' : '⚪ Deceased');

    card.innerHTML = `
      <div class="node-branch-stripe ${branchColorClass}"></div>
      <div class="node-content">
        <div class="node-avatar ${person.gender}">${initials}</div>
        <div class="node-details">
          <div class="node-name" title="${person.fullName}">${person.fullName}</div>
          ${person.tamilName ? `<div class="node-tamil">${person.tamilName}</div>` : ''}
          <div class="node-meta">
            <span class="node-lifespan">${lifespan}</span>
            ${person.nativePlace ? `<span class="node-place">📍 ${person.nativePlace.split(',')[0]}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="node-actions-bar">
        <button class="node-btn btn-profile" data-action="profile" title="View Full Profile">
          👤 Profile
        </button>
        <button class="node-btn btn-lineage" data-action="lineage" title="Focus Ancestral Tree">
          🌳 Tree
        </button>
      </div>
    `;

    // Click on Card Body: Focus / Select
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.node-btn')) return;
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
      this.focusPedigree(person.id);
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

  focusPedigree(id: number | string): void {
    this.viewMode = 'PEDIGREE';
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
