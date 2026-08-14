import { Branch, Individual, SearchMatch } from '../types/index.ts';

class DataService {
  private individualsMap = new Map<number, Individual>();
  public branches: Branch[] = [];
  public isLoaded = false;
  public dataSource: 'postgresql_database' = 'postgresql_database';

  async load(): Promise<void> {
    try {
      const response = await fetch('/api/familytree/data');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const dbData = await response.json();
      if (!dbData.success || !dbData.persons) {
        throw new Error(dbData.error || 'Invalid API response from PostgreSQL server.');
      }

      this.ingest(dbData);
      console.log(`🐘 [DataService] Connected live to PostgreSQL Database (rithamic_familytree): Loaded ${this.individualsMap.size} family members.`);
    } catch (err: any) {
      console.error('❌ [DataService] Failed to load data from PostgreSQL Database:', err.message);
      throw err;
    }
  }

  private ingest(rawData: any): void {
    this.individualsMap.clear();
    this.branches = rawData.branches || [];

    const rawList: any[] = rawData.persons || [];

    // 1. Ingest all individuals
    rawList.forEach((p: any) => {
      const spouses = (p.spouses || []).map((s: any) => (typeof s === 'object' && s !== null ? s.spouseId : s)).filter(Boolean);
      const parents = (p.parents || []).map((s: any) => (typeof s === 'object' && s !== null ? s.id || s : s)).filter(Boolean);
      const children = (p.children || []).map((s: any) => (typeof s === 'object' && s !== null ? s.id || s : s)).filter(Boolean);
      const siblings = (p.siblings || []).map((s: any) => (typeof s === 'object' && s !== null ? s.id || s : s)).filter(Boolean);

      const ind: Individual = {
        id: p.id,
        fullName: p.fullName,
        tamilName: p.tamilName || null,
        gender: p.gender && p.gender.toLowerCase() === 'female' ? 'female' : 'male',
        generation: p.generation || 1,
        isLiving: Boolean(p.isLiving),
        birthYear: p.birthYear || (p.dob ? p.dob.substring(0, 4) : null),
        passingYear: p.passingYear || (p.dod ? p.dod.substring(0, 4) : null),
        nativePlace: p.nativePlace || 'Kangayam, Tamil Nadu',
        branch: p.branch || 'Main Lineage',
        contact: p.contacts && p.contacts.length > 0 ? (typeof p.contacts[0] === 'object' ? p.contacts[0].value : p.contacts[0]) : (p.contact || null),
        address: p.addresses && p.addresses.length > 0 ? (typeof p.addresses[0] === 'object' ? p.addresses[0].value : p.addresses[0]) : (p.address || null),
        occupation: p.occupation || null,
        notes: p.identityClues?.searchDescriptor || p.notes || '',
        parents,
        spouses,
        children,
        siblings,
        identityClues: p.identityClues
      };

      this.individualsMap.set(ind.id, ind);
    });

    // 2. Bidirectional Enrichment from relationships
    const rawRelationships: any[] = rawData.relationships || [];
    rawRelationships.forEach((r: any) => {
      if (r.type === 'spouse') {
        const a = this.individualsMap.get(r.personAId);
        const b = this.individualsMap.get(r.personBId);
        if (a && !a.spouses?.includes(r.personBId)) a.spouses?.push(r.personBId);
        if (b && !b.spouses?.includes(r.personAId)) b.spouses?.push(r.personAId);
      } else if (r.type === 'parent_child') {
        const parentId = r.personAId || r.parentPersonId;
        const childId = r.personBId || r.childPersonId;
        const p = this.individualsMap.get(parentId);
        const c = this.individualsMap.get(childId);
        if (p && !p.children?.includes(childId)) p.children?.push(childId);
        if (c && !c.parents?.includes(parentId)) c.parents?.push(parentId);
      }
    });

    // 3. Parental Marriage Linkage (Connect children to both married parents)
    this.individualsMap.forEach((ind) => {
      if (ind.parents && ind.parents.length > 0) {
        const currentParents = [...ind.parents];
        currentParents.forEach((pid) => {
          const parent = this.individualsMap.get(pid);
          if (parent && parent.spouses) {
            parent.spouses.forEach((sid) => {
              if (!ind.parents?.includes(sid)) ind.parents?.push(sid);
              const spouse = this.individualsMap.get(sid);
              if (spouse && !spouse.children?.includes(ind.id)) spouse.children?.push(ind.id);
            });
          }
        });
      }
    });

    // 4. Normalize Siblings across shared parents
    this.individualsMap.forEach((ind) => {
      if (ind.parents && ind.parents.length > 0) {
        ind.parents.forEach((pid) => {
          const parent = this.individualsMap.get(pid);
          if (parent && parent.children) {
            parent.children.forEach((cid) => {
              if (cid !== ind.id && !ind.siblings?.includes(cid)) {
                ind.siblings?.push(cid);
              }
            });
          }
        });
      }
    });

    this.isLoaded = true;
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
    return person.parents
      .map(pid => this.getIndividual(pid))
      .filter((p): p is Individual => Boolean(p));
  }

  getChildren(id: number | string): Individual[] {
    const person = this.getIndividual(id);
    if (!person || !person.children) return [];
    return person.children
      .map(cid => this.getIndividual(cid))
      .filter((c): c is Individual => Boolean(c));
  }

  getSpouses(id: number | string): Individual[] {
    const person = this.getIndividual(id);
    if (!person || !person.spouses) return [];
    return person.spouses
      .map(sid => this.getIndividual(sid))
      .filter((s): s is Individual => Boolean(s));
  }

  getSiblings(id: number | string): Individual[] {
    const person = this.getIndividual(id);
    if (!person) return [];

    if (person.siblings && person.siblings.length > 0) {
      return person.siblings
        .map(sid => this.getIndividual(sid))
        .filter((s): s is Individual => Boolean(s));
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

    return Array.from(siblingIds)
      .map(sid => this.getIndividual(sid))
      .filter((s): s is Individual => Boolean(s));
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

  getEntireAncestryPath(personId: number | string): { directPath: Individual[]; allRelatedInPath: Individual[] } {
    const focal = this.getIndividual(personId);
    if (!focal) return { directPath: [], allRelatedInPath: [] };

    const directPathSet = new Set<number>([focal.id]);
    const queue = [focal.id];

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const curr = this.getIndividual(currId);
      if (!curr) continue;

      (curr.parents || []).forEach(pid => {
        if (!directPathSet.has(pid)) {
          directPathSet.add(pid);
          queue.push(pid);
        }
      });
    }

    const allRelatedSet = new Set<number>(directPathSet);
    directPathSet.forEach(aid => {
      const a = this.getIndividual(aid);
      if (a) {
        (a.spouses || []).forEach(sid => allRelatedSet.add(sid));
        (a.children || []).forEach(cid => allRelatedSet.add(cid));
        (a.siblings || []).forEach(sibid => allRelatedSet.add(sibid));
      }
    });

    const directPath = Array.from(directPathSet).map(id => this.getIndividual(id)!).filter(Boolean);
    const allRelatedInPath = Array.from(allRelatedSet).map(id => this.getIndividual(id)!).filter(Boolean);

    return { directPath, allRelatedInPath };
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
    const map = new Map<number, Individual[]>();
    for (let g = 1; g <= 6; g++) map.set(g, []);

    for (const ind of this.individualsMap.values()) {
      const gen = ind.generation || 1;
      if (!map.has(gen)) map.set(gen, []);
      map.get(gen)!.push(ind);
    }
    return map;
  }

  // Direct database write methods
  async addMember(member: Partial<Individual>): Promise<Individual> {
    const res = await fetch('/api/familytree/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await this.load();
    return data.member;
  }

  async updateMember(id: number, member: Partial<Individual>): Promise<Individual> {
    const res = await fetch(`/api/familytree/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await this.load();
    return data.member;
  }

  async deleteMember(id: number): Promise<void> {
    const res = await fetch(`/api/familytree/members/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await this.load();
  }
}

export const dataService = new DataService();
