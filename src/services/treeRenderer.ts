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
  public focalTreeRootId: number | null = null;
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

  public zoomIn(factor = 1.15): void {
    this.zoom = Math.min(this.zoom * factor, 2.2);
    this.updateTransform();
  }

  public zoomOut(factor = 1.15): void {
    this.zoom = Math.max(this.zoom / factor, 0.25);
    this.updateTransform();
  }

  public resetView(): void {
    this.zoom = 0.85;
    this.panX = 60;
    this.panY = 60;
    this.updateTransform();
  }

  public fitToScreen(): void {
    const vWidth = this.viewport.clientWidth;
    const contentWidth = this.htmlLayer.scrollWidth || 2000;
    if (contentWidth > 0 && vWidth > 0) {
      this.zoom = Math.min(Math.max((vWidth - 80) / contentWidth, 0.35), 1.0);
      this.panX = 40;
      this.panY = 40;
      this.updateTransform();
    }
  }

  public centerOnNode(nodeId: number): void {
    // Un-collapse all ancestors so node is visible
    this.uncollapseAncestors(nodeId);
    this.render();

    setTimeout(() => {
      const el = document.getElementById(`node_${nodeId}`);
      if (el && this.viewport) {
        const vRect = this.viewport.getBoundingClientRect();
        const cRect = el.getBoundingClientRect();
        const elCenterX = (cRect.left - this.canvas.getBoundingClientRect().left) / this.zoom + el.offsetWidth / 2;
        const elCenterY = (cRect.top - this.canvas.getBoundingClientRect().top) / this.zoom + el.offsetHeight / 2;

        this.panX = vWidthHalf(vRect.width) - elCenterX * this.zoom;
        this.panY = vRect.height / 3 - elCenterY * this.zoom;
        this.updateTransform();

        // Pulsing glow animation
        el.classList.add('focal-node');
        setTimeout(() => el.classList.remove('focal-node'), 3000);
      }
    }, 50);

    function vWidthHalf(w: number) {
      return w / 2;
    }
  }

  private uncollapseAncestors(nodeId: number): void {
    const ancestors = dataService.getAncestors(nodeId);
    ancestors.forEach(a => this.collapsedNodes.delete(a.id));
  }

  private updateTransform(): void {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  // ==========================================================================
  // PUBLIC RENDER DISPATCHER
  // ==========================================================================

  public render(branchFilter = 'ALL', genFilter = 'ALL'): void {
    this.filterBranch = branchFilter;
    this.filterGeneration = genFilter;

    this.svgLayer.innerHTML = '';
    this.htmlLayer.innerHTML = '';

    if (this.viewMode === 'TREE') {
      this.renderHierarchicalTree();
    } else if (this.viewMode === 'PEDIGREE') {
      this.renderPedigreeView();
    } else if (this.viewMode === 'MATRIX') {
      this.renderMatrixView();
    }

    this.updateTransform();
  }

  public expandAll(): void {
    this.collapsedNodes.clear();
    this.render(this.filterBranch, this.filterGeneration);
    trackEvent('interaction', 'expand_all');
  }

  public collapseAll(): void {
    dataService.getAllIndividuals().forEach(ind => {
      const children = dataService.getChildren(ind.id);
      if (children.length > 0) {
        this.collapsedNodes.add(ind.id);
      }
    });
    this.render(this.filterBranch, this.filterGeneration);
    trackEvent('interaction', 'collapse_all');
  }

  public toggleNodeCollapse(id: number): void {
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

  public getTopAncestor(personId: number): Individual {
    let current = dataService.getIndividual(personId);
    if (!current) return current as any;
    const visited = new Set<number>([personId]);
    while (current) {
      const parents = dataService.getParents(current.id);
      if (!parents || parents.length === 0) break;
      const maleParent = parents.find(p => p.gender === 'male');
      const nextParent = maleParent || parents[0];
      if (!nextParent || visited.has(nextParent.id)) break;
      visited.add(nextParent.id);
      current = nextParent;
    }
    return current;
  }

  public showFamilyTree(personId: number): void {
    this.viewMode = 'TREE';
    this.focalTreeRootId = personId;
    this.render();
    this.centerOnNode(personId);
    trackEvent('interaction', 'view_family_tree', { id: personId });
  }

  public resetTreeFocus(): void {
    this.focalTreeRootId = null;
    this.render();
    this.fitToScreen();
    trackEvent('interaction', 'reset_tree_focus');
  }

  private renderHierarchicalTree(): void {
    const rootIndividuals = this.findRootIndividuals();
    if (rootIndividuals.length === 0) {
      this.htmlLayer.innerHTML = `<div style="padding: 40px; color: #94a3b8;">No root ancestors found in dataset.</div>`;
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
    const startY = this.focalTreeRootId ? 110 : 60;

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

    // 4. Render Focus Banner if viewing single tree
    if (this.focalTreeRootId !== null) {
      const focalPerson = dataService.getIndividual(this.focalTreeRootId);
      if (focalPerson) {
        const banner = document.createElement('div');
        banner.className = 'tree-focus-banner';
        const parents = dataService.getParents(focalPerson.id);
        const parentText = parents.length > 0 ? `Parents: ${parents.map(p => p.fullName).join(' & ')}` : 'Ancestral Root';
        banner.innerHTML = `
          <div class="tree-focus-info">
            <span class="focus-title">🌳 Viewing Tree: <strong>${focalPerson.fullName}</strong> ${focalPerson.tamilName ? `(${focalPerson.tamilName})` : ''}</span>
            <span class="focus-parents">${parentText} &bull; Generation ${focalPerson.generation}</span>
          </div>
          <button class="btn-reset-focus" id="btnResetTreeFocus">↺ View All Lineages</button>
        `;
        banner.querySelector('#btnResetTreeFocus')?.addEventListener('click', () => {
          this.resetTreeFocus();
        });
        this.htmlLayer.appendChild(banner);
      }
    }
  }

  private findRootIndividuals(): Individual[] {
    // If a focal tree root is active, show only that root!
    if (this.focalTreeRootId !== null) {
      const topRoot = this.getTopAncestor(this.focalTreeRootId);
      if (topRoot) return [topRoot];
    }

    const all = dataService.getAllIndividuals();
    // Return all root ancestors who have no parents recorded in the database and have children or are Gen 1
    const roots = all.filter(p => {
      const parents = dataService.getParents(p.id);
      const children = dataService.getChildren(p.id);
      return parents.length === 0 && p.gender === 'male' && (p.generation === 1 || children.length > 0);
    });

    if (roots.length > 0) {
      return roots.sort((a, b) => (a.generation || 1) - (b.generation || 1));
    }

    const minGen = Math.min(...all.map(p => p.generation || 1));
    return all.filter(p => p.generation === minGen && p.gender === 'male');
  }

  private buildSubtreeUnit(person: Individual, processed: Set<number>): TreeNodeUnit | null {
    if (processed.has(person.id)) return null;
    processed.add(person.id);

    const spouses = dataService.getSpouses(person.id);
    const spouse = spouses.length > 0 ? spouses[0] : null;

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

    let totalChildrenWidth = 0;
    unit.children.forEach(child => {
      totalChildrenWidth += this.calculateSubtreeWidths(child);
    });

    unit.subtreeWidth = Math.max(unit.width + this.H_GAP, totalChildrenWidth);
    return unit.subtreeWidth;
  }

  private assignCoordinates(unit: TreeNodeUnit, leftX: number, currentY: number): void {
    unit.y = currentY;

    if (unit.children.length === 0 || unit.isCollapsed) {
      unit.x = leftX + (unit.subtreeWidth - unit.width) / 2;
      return;
    }

    let childLeft = leftX;
    unit.children.forEach(child => {
      this.assignCoordinates(child, childLeft, currentY + this.CARD_HEIGHT + this.V_GAP);
      childLeft += child.subtreeWidth;
    });

    const firstChild = unit.children[0];
    const lastChild = unit.children[unit.children.length - 1];
    const childrenMidX = (firstChild.x + firstChild.width / 2 + lastChild.x + lastChild.width / 2) / 2;

    unit.x = childrenMidX - unit.width / 2;
  }

  private renderSubtreeConnectors(unit: TreeNodeUnit): void {
    const parentBottomX = unit.x + unit.width / 2;
    const parentBottomY = unit.y + this.CARD_HEIGHT;

    // 1. Spousal Connector if couple
    if (unit.spouse) {
      const c1CenterX = unit.x + this.CARD_WIDTH / 2;
      const c2CenterX = unit.x + this.CARD_WIDTH + 40 + this.CARD_WIDTH / 2;
      const lineY = unit.y + this.CARD_HEIGHT / 2;

      const spLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      spLine.setAttribute('x1', String(c1CenterX));
      spLine.setAttribute('y1', String(lineY));
      spLine.setAttribute('x2', String(c2CenterX));
      spLine.setAttribute('y2', String(lineY));
      spLine.setAttribute('class', 'svg-marriage-line');
      this.svgLayer.appendChild(spLine);
    }

    // 2. Parent-to-Children Drop Lines & Bus Rails
    if (unit.children.length > 0 && !unit.isCollapsed) {
      const busY = parentBottomY + 45;

      // Vertical trunk drop from parent center down to bus rail
      const trunkLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      trunkLine.setAttribute('x1', String(parentBottomX));
      trunkLine.setAttribute('y1', String(parentBottomY));
      trunkLine.setAttribute('x2', String(parentBottomX));
      trunkLine.setAttribute('y2', String(busY));
      trunkLine.setAttribute('class', 'svg-branch-line');
      this.svgLayer.appendChild(trunkLine);

      // Horizontal bus rail spanning across all children
      const firstChild = unit.children[0];
      const lastChild = unit.children[unit.children.length - 1];
      const busStartX = firstChild.x + firstChild.width / 2;
      const busEndX = lastChild.x + lastChild.width / 2;

      const busLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      busLine.setAttribute('x1', String(busStartX));
      busLine.setAttribute('y1', String(busY));
      busLine.setAttribute('x2', String(busEndX));
      busLine.setAttribute('y2', String(busY));
      busLine.setAttribute('class', 'svg-branch-bus');
      this.svgLayer.appendChild(busLine);

      // Vertical fork drops from bus down into top center of each child unit
      unit.children.forEach(child => {
        const childTopX = child.x + child.width / 2;
        const childTopY = child.y;

        const forkLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        forkLine.setAttribute('x1', String(childTopX));
        forkLine.setAttribute('y1', String(busY));
        forkLine.setAttribute('x2', String(childTopX));
        forkLine.setAttribute('y2', String(childTopY));
        forkLine.setAttribute('class', 'svg-branch-fork');
        this.svgLayer.appendChild(forkLine);

        // Recursively render child connectors
        this.renderSubtreeConnectors(child);
      });
    }
  }

  private renderSubtreeCards(unit: TreeNodeUnit): void {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = `${unit.x}px`;
    container.style.top = `${unit.y}px`;
    container.style.width = `${unit.width}px`;

    if (unit.spouse) {
      // Couple Unit Box
      const coupleBox = document.createElement('div');
      coupleBox.className = 'couple-unit-container';
      
      const card1 = this.createNodeCard(unit.person);
      const ring = document.createElement('div');
      ring.className = 'marriage-ring-badge';
      ring.innerHTML = '💍';
      ring.title = 'Married Couple';
      const card2 = this.createNodeCard(unit.spouse);

      coupleBox.appendChild(card1);
      coupleBox.appendChild(ring);
      coupleBox.appendChild(card2);

      // Subtree Toggle Pill on bottom center
      if (unit.children.length > 0) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn-subtree-toggle';
        toggleBtn.innerHTML = unit.isCollapsed ? `+ ${unit.children.length} Children` : '−';
        toggleBtn.title = unit.isCollapsed ? 'Expand descendants' : 'Collapse descendants';
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleNodeCollapse(unit.person.id);
        });
        coupleBox.appendChild(toggleBtn);
      }

      container.appendChild(coupleBox);
    } else {
      // Single Individual Box
      const card = this.createNodeCard(unit.person);
      container.appendChild(card);

      if (unit.children.length > 0) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn-subtree-toggle';
        toggleBtn.innerHTML = unit.isCollapsed ? `+ ${unit.children.length} Children` : '−';
        toggleBtn.title = unit.isCollapsed ? 'Expand descendants' : 'Collapse descendants';
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleNodeCollapse(unit.person.id);
        });
        container.appendChild(toggleBtn);
      }
    }

    this.htmlLayer.appendChild(container);

    if (!unit.isCollapsed) {
      unit.children.forEach(child => this.renderSubtreeCards(child));
    }
  }

  // ==========================================================================
  // VIEW MODE 2: PEDIGREE FOCUS VIEW
  // ==========================================================================

  private renderPedigreeView(): void {
    const focalId = this.focalMemberId || 1;
    const focalPerson = dataService.getIndividual(focalId);
    if (!focalPerson) return;

    const { directPath, allRelatedInPath } = dataService.getEntireAncestryPath(focalId);
    const directPathIds = new Set(directPath.map(p => p.id));

    const pedigreeWrapper = document.createElement('div');
    pedigreeWrapper.className = 'pedigree-focus-wrapper';

    pedigreeWrapper.innerHTML = `
      <div class="pedigree-banner">
        <div>
          <span class="gen-tag">Ancestral Pedigree Focus</span>
          <div class="pedigree-title">${focalPerson.fullName} ${focalPerson.tamilName ? `(${focalPerson.tamilName})` : ''}</div>
          <div class="pedigree-subtitle">Direct ancestral bloodline traced back to lineage roots.</div>
        </div>
        <button class="btn-auth" id="btnExitPedigree" style="padding: 6px 14px; font-size: 12px;">
          ← Back to Tree Chart
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
      this.render();
      this.resetView();
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tabTree')?.classList.add('active');
    });

    this.htmlLayer.appendChild(pedigreeWrapper);
  }

  // ==========================================================================
  // VIEW MODE 3: GENERATION MATRIX OVERVIEW
  // ==========================================================================

  private renderMatrixView(): void {
    const matrixWrapper = document.createElement('div');
    matrixWrapper.className = 'matrix-container';

    const genMap = dataService.getGenerationsMap();

    for (let gen = 1; gen <= 6; gen++) {
      if (this.filterGeneration !== 'ALL' && Number(this.filterGeneration) !== gen) continue;

      let members = genMap.get(gen) || [];
      if (this.filterBranch !== 'ALL') {
        members = members.filter(m => m.branch === this.filterBranch);
      }

      if (members.length === 0) continue;

      const row = document.createElement('div');
      row.className = 'generation-row';
      row.innerHTML = `
        <div class="generation-label">
          <span class="gen-tag">Tier ${gen}</span>
          <span class="gen-title">${this.getGenerationTitle(gen)}</span>
          <span class="badge-tag">${members.length} members</span>
        </div>
        <div class="nodes-track" id="track_gen_${gen}"></div>
      `;

      const track = row.querySelector(`#track_gen_${gen}`) as HTMLElement;
      const rendered = new Set<number>();

      members.forEach(person => {
        if (rendered.has(person.id)) return;

        const spouses = dataService.getSpouses(person.id);
        const spouseInSameGen = spouses.find(s => members.some(m => m.id === s.id));

        if (spouseInSameGen && !rendered.has(spouseInSameGen.id)) {
          const couple = document.createElement('div');
          couple.className = 'couple-unit';
          
          const c1 = this.createNodeCard(person);
          const ring = document.createElement('div');
          ring.className = 'marriage-ring-badge';
          ring.innerHTML = '💍';
          const c2 = this.createNodeCard(spouseInSameGen);

          couple.appendChild(c1);
          couple.appendChild(ring);
          couple.appendChild(c2);
          track.appendChild(couple);

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
        <button class="node-btn btn-lineage" data-action="lineage" title="View Family Tree">
          🌳 Tree
        </button>
      </div>
    `;

    // Click on Card Body: Highlight node (DO NOT OPEN DRAWER)
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.node-btn')) return;
      e.stopPropagation();
      this.selectNode(person.id, false);
    });

    // Button 1: Profile Drawer (EXPLICITLY OPENS DRAWER)
    card.querySelector('.btn-profile')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(person.id, true);
    });

    // Button 2: Tree Focus (SHOWS HER/HIS SPECIFIC TREE, DOES NOT OPEN DRAWER)
    card.querySelector('.btn-lineage')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showFamilyTree(person.id);
    });

    return card;
  }

  selectNode(id: number | string, openDrawer = true): void {
    this.selectedId = Number(id);

    document.querySelectorAll('.node-card').forEach(n => n.classList.remove('selected'));
    const active = document.getElementById(`node_${id}`);
    if (active) active.classList.add('selected');

    const person = dataService.getIndividual(id);
    if (person) {
      if (openDrawer && this.onNodeSelect) {
        this.onNodeSelect(person);
      }
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
