import { Branch, DatasetSummary, FamilyDataset, Individual, SearchMatch } from '../types/index.ts';

class DataService {
  private dataset: FamilyDataset | null = null;
  private individualsMap = new Map<number, Individual>();
  public branches: Branch[] = [];
  public summary: DatasetSummary | null = null;
  public isLoaded = false;

  async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const response = await fetch('./family_tree_dataset.json');
      this.dataset = await response.json();
      this.summary = this.dataset?.summary || null;
      this.branches = this.dataset?.branches || [];

      if (this.dataset && Array.isArray(this.dataset.individuals)) {
        this.dataset.individuals.forEach(ind => {
          this.individualsMap.set(ind.id, ind);
        });
      }

      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to load family_tree_dataset.json:", err);
    }
  }

  getAllIndividuals(): Individual[] {
    return Array.from(this.individualsMap.values());
  }

  getIndividual(id: number | string): Individual | null {
    return this.individualsMap.get(Number(id)) || null;
  }

  getParents(id: number | string): Individual[] {
    const person = this.getIndividual(id);
    if (!person || !person.parents) return [];
    return person.parents.map(pid => this.getIndividual(pid)).filter((p): p is Individual => Boolean(p));
  }

  getChildren(id: number | string): Individual[] {
    const person = this.getIndividual(id);
    if (!person || !person.children) return [];
    return person.children.map(cid => this.getIndividual(cid)).filter((c): c is Individual => Boolean(c));
  }

  getSpouses(id: number | string): Individual[] {
    const person = this.getIndividual(id);
    if (!person || !person.spouses) return [];
    return person.spouses.map(sid => this.getIndividual(sid)).filter((s): s is Individual => Boolean(s));
  }

  getSiblings(id: number | string): Individual[] {
    const person = this.getIndividual(id);
    if (!person || !person.parents || person.parents.length === 0) return [];

    const siblingIds = new Set<number>();
    person.parents.forEach(pid => {
      const parent = this.getIndividual(pid);
      if (parent && parent.children) {
        parent.children.forEach(cid => {
          if (cid !== person.id) siblingIds.add(cid);
        });
      }
    });

    return Array.from(siblingIds).map(sid => this.getIndividual(sid)).filter((s): s is Individual => Boolean(s));
  }

  getAncestors(id: number | string, maxDepth = 6): Individual[] {
    const ancestors: Individual[] = [];
    const queue: { id: number; depth: number }[] = [{ id: Number(id), depth: 0 }];
    const visited = new Set<number>([Number(id)]);

    while (queue.length > 0) {
      const current = queue.shift()!;
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

  getDescendants(id: number | string, maxDepth = 6): Individual[] {
    const descendants: Individual[] = [];
    const queue: { id: number; depth: number }[] = [{ id: Number(id), depth: 0 }];
    const visited = new Set<number>([Number(id)]);

    while (queue.length > 0) {
      const current = queue.shift()!;
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

  search(query: string): SearchMatch[] {
    if (!query || query.trim().length === 0) return [];
    const q = query.trim().toLowerCase();

    const matches: SearchMatch[] = [];
    for (const ind of this.individualsMap.values()) {
      const nameMatch = ind.fullName.toLowerCase().includes(q);
      const tamilMatch = ind.tamilName && ind.tamilName.includes(q);
      const placeMatch = ind.nativePlace && ind.nativePlace.toLowerCase().includes(q);
      const notesMatch = ind.notes && ind.notes.toLowerCase().includes(q);

      if (nameMatch || tamilMatch || placeMatch || notesMatch) {
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

  getGenerationsMap(): Map<number, Individual[]> {
    const map = new Map<number, Individual[]>();
    for (let g = 1; g <= 6; g++) map.set(g, []);

    for (const ind of this.individualsMap.values()) {
      const gen = ind.generation || 1;
      if (!map.has(gen)) map.set(gen, []);
      map.get(gen)!.push(ind);
    }
    return map;
  }
}

export const dataService = new DataService();
