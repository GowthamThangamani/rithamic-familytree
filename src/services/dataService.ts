import { Branch, Individual, SearchMatch } from '../types/index.ts';
import datasetJson from '../family_tree_dataset.json';

class DataService {
  private individualsMap = new Map<number, Individual>();
  public branches: Branch[] = [];
  public isLoaded = false;

  load(): void {
    if (this.isLoaded) return;
    
    try {
      const rawData = datasetJson as any;
      this.branches = rawData.branches || [];

      const rawList: any[] = rawData.persons || rawData.individuals || [];

      rawList.forEach((p: any) => {
        const ind: Individual = {
          id: p.id,
          fullName: p.fullName,
          tamilName: p.tamilName || null,
          gender: p.gender && p.gender.toLowerCase() === 'female' ? 'female' : 'male',
          generation: p.identityClues?.generationLevel || p.generation || 1,
          isLiving: Boolean(p.isLiving),
          birthYear: p.dob ? p.dob.substring(0, 4) : (p.birthYear || null),
          passingYear: p.dod ? p.dod.substring(0, 4) : (p.passingYear || null),
          nativePlace: p.nativePlace || 'Kangayam, Tamil Nadu',
          branch: p.identityClues?.branchName || p.branch || 'Main Lineage',
          contact: p.contacts && p.contacts.length > 0 ? p.contacts[0].value : (p.contact || null),
          address: p.addresses && p.addresses.length > 0 ? p.addresses[0].value : (p.address || null),
          occupation: p.occupation || null,
          notes: p.identityClues?.searchDescriptor || p.notes || '',
          parents: p.parents || [],
          spouses: p.spouses || [],
          children: p.children || [],
          siblings: p.siblings || [],
          identityClues: p.identityClues
        };

        this.individualsMap.set(ind.id, ind);
      });

      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to load family dataset:", err);
    }
  }

  getAllIndividuals(): Individual[] {
    if (!this.isLoaded) this.load();
    return Array.from(this.individualsMap.values());
  }

  getIndividual(id: number | string): Individual | null {
    if (!this.isLoaded) this.load();
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
    if (!person) return [];

    if (person.siblings && person.siblings.length > 0) {
      return person.siblings.map(sid => this.getIndividual(sid)).filter((s): s is Individual => Boolean(s));
    }

    if (!person.parents || person.parents.length === 0) return [];
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
    if (!this.isLoaded) this.load();
    if (!query || query.trim().length === 0) return [];
    const q = query.trim().toLowerCase();

    const matches: SearchMatch[] = [];
    for (const ind of this.individualsMap.values()) {
      const nameMatch = ind.fullName.toLowerCase().includes(q);
      const tamilMatch = ind.tamilName && ind.tamilName.includes(q);
      const placeMatch = ind.nativePlace && ind.nativePlace.toLowerCase().includes(q);
      const notesMatch = ind.notes && ind.notes.toLowerCase().includes(q);
      const clueMatch = ind.identityClues?.searchDescriptor && ind.identityClues.searchDescriptor.toLowerCase().includes(q);

      if (nameMatch || tamilMatch || placeMatch || notesMatch || clueMatch) {
        const parents = this.getParents(ind.id);
        const spouses = this.getSpouses(ind.id);

        let parentClue = ind.identityClues?.parentSpouseSummary || '';
        if (!parentClue && parents.length > 0) {
          const prefix = ind.gender === 'male' ? 'S/o' : 'D/o';
          parentClue = `${prefix} ${parents.map(p => p.fullName.split(' ')[0]).join(' & ')}`;
        }

        let spouseClue = '';
        if (spouses.length > 0) {
          const prefix = ind.gender === 'male' ? 'H/o' : 'W/o';
          spouseClue = `${prefix} ${spouses.map(s => s.fullName.split(' ')[0]).join(', ')}`;
        }

        const lifespan = ind.identityClues?.lifespanText || (
          ind.isLiving
            ? (ind.birthYear ? `b. ${ind.birthYear}` : 'Living')
            : `${ind.birthYear || '?'} – ${ind.passingYear || 'Deceased'}`
        );

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
    if (!this.isLoaded) this.load();
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
