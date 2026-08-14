// Dataset & Genealogy Graph Traversal Service
class DataService {
  constructor() {
    this.dataset = null;
    this.individualsMap = new Map();
    this.branches = [];
    this.summary = {};
    this.isLoaded = false;
  }

  async load() {
    if (this.isLoaded) return;
    try {
      const response = await fetch('./family_tree_dataset.json');
      this.dataset = await response.json();
      this.summary = this.dataset.summary || {};
      this.branches = this.dataset.branches || [];

      // Map individuals by ID
      if (Array.isArray(this.dataset.individuals)) {
        this.dataset.individuals.forEach(ind => {
          this.individualsMap.set(ind.id, ind);
        });
      }

      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to load family_tree_dataset.json:", err);
    }
  }

  getAllIndividuals() {
    return Array.from(this.individualsMap.values());
  }

  getIndividual(id) {
    return this.individualsMap.get(Number(id)) || null;
  }

  getParents(id) {
    const person = this.getIndividual(id);
    if (!person || !person.parents) return [];
    return person.parents.map(pid => this.getIndividual(pid)).filter(Boolean);
  }

  getChildren(id) {
    const person = this.getIndividual(id);
    if (!person || !person.children) return [];
    return person.children.map(cid => this.getIndividual(cid)).filter(Boolean);
  }

  getSpouses(id) {
    const person = this.getIndividual(id);
    if (!person || !person.spouses) return [];
    return person.spouses.map(sid => this.getIndividual(sid)).filter(Boolean);
  }

  getSiblings(id) {
    const person = this.getIndividual(id);
    if (!person || !person.parents || person.parents.length === 0) return [];
    
    const siblingIds = new Set();
    person.parents.forEach(pid => {
      const parent = this.getIndividual(pid);
      if (parent && parent.children) {
        parent.children.forEach(cid => {
          if (cid !== person.id) siblingIds.add(cid);
        });
      }
    });

    return Array.from(siblingIds).map(sid => this.getIndividual(sid)).filter(Boolean);
  }

  getAncestors(id, maxDepth = 6) {
    const ancestors = [];
    const queue = [{ id, depth: 0 }];
    const visited = new Set([id]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.depth >= maxDepth) continue;

      const parents = this.getParents(current.id);
      for (const p of parents) {
        if (!visited.has(p.id)) {
          visited.add(p.id);
          ancestors.push({ ...p, relationDepth: current.depth + 1 });
          queue.push({ id: p.id, depth: current.depth + 1 });
        }
      }
    }
    return ancestors;
  }

  getDescendants(id, maxDepth = 6) {
    const descendants = [];
    const queue = [{ id, depth: 0 }];
    const visited = new Set([id]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.depth >= maxDepth) continue;

      const children = this.getChildren(current.id);
      for (const c of children) {
        if (!visited.has(c.id)) {
          visited.add(c.id);
          descendants.push({ ...c, relationDepth: current.depth + 1 });
          queue.push({ id: c.id, depth: current.depth + 1 });
        }
      }
    }
    return descendants;
  }

  // Smart Search with Disambiguation Clues
  search(query) {
    if (!query || query.trim().length === 0) return [];
    const q = query.trim().toLowerCase();

    const matches = [];
    for (const ind of this.individualsMap.values()) {
      const nameMatch = ind.fullName.toLowerCase().includes(q);
      const tamilMatch = ind.tamilName && ind.tamilName.includes(q);
      const placeMatch = ind.nativePlace && ind.nativePlace.toLowerCase().includes(q);
      const notesMatch = ind.notes && ind.notes.toLowerCase().includes(q);

      if (nameMatch || tamilMatch || placeMatch || notesMatch) {
        // Build identity clue
        const parents = this.getParents(ind.id);
        const spouses = this.getSpouses(ind.id);

        let parentClue = '';
        if (parents.length > 0) {
          const prefix = ind.gender === 'male' ? 'S/o' : 'D/o';
          parentClue = `${prefix} ${parents.map(p => p.fullName.split(' ')[0]).join(' & ')}`;
        }

        let spouseClue = '';
        if (spouses.length > 0) {
          const prefix = ind.gender === 'male' ? 'H/o' : 'W/o';
          spouseClue = `${prefix} ${spouses.map(s => s.fullName.split(' ')[0]).join(', ')}`;
        }

        const lifespan = ind.isLiving 
          ? (ind.birthYear ? `b. ${ind.birthYear}` : 'Living') 
          : `${ind.birthYear || '?'} – ${ind.passingYear || 'Deceased'}`;

        matches.push({
          individual: ind,
          parentClue,
          spouseClue,
          lifespan,
          generation: ind.generation,
          branch: ind.branch || 'Main Lineage'
        });
      }
    }

    return matches.slice(0, 15);
  }

  getGenerationsMap() {
    const map = new Map();
    for (let g = 1; g <= 6; g++) map.set(g, []);

    for (const ind of this.individualsMap.values()) {
      const gen = ind.generation || 1;
      if (!map.has(gen)) map.set(gen, []);
      map.get(gen).push(ind);
    }
    return map;
  }
}

export const dataService = new DataService();
