import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const familyTreeRouter = Router();

// ============================================================================
// 1. GET /data - Complete Aggregated Tree Dataset from PostgreSQL
// ============================================================================
familyTreeRouter.get('/data', async (req: Request, res: Response) => {
  try {
    const branchesRes = await pool.query(
      'SELECT id, branch_id as "branchId", name, ancestor_root as "ancestorRoot", key_members as "keyMembers", description FROM family_branches ORDER BY id ASC'
    );

    const membersRes = await pool.query(
      `SELECT 
        id, 
        full_name as "fullName", 
        tamil_name as "tamilName", 
        gender, 
        generation, 
        is_living as "isLiving",
        birth_year as "birthYear", 
        passing_year as "passingYear", 
        dob, 
        dod, 
        caste, 
        sub_caste as "subCaste", 
        native_place as "nativePlace", 
        occupation, 
        branch_id as "branchId", 
        branch_name as "branch", 
        contacts, 
        addresses, 
        photos, 
        identity_clues as "identityClues", 
        notes, 
        metadata
      FROM family_members 
      ORDER BY generation ASC, id ASC`
    );

    const relRes = await pool.query(
      `SELECT 
        id, 
        relationship_type as "type", 
        nature, 
        person_a_id as "personAId", 
        person_b_id as "personBId", 
        marriage_order as "marriageOrder" 
      FROM family_relationships 
      WHERE is_active = TRUE 
      ORDER BY id ASC`
    );

    // Build parent/child/spouse lookup maps from DB relationships
    const parentsMap = new Map<number, number[]>();
    const childrenMap = new Map<number, number[]>();
    const spousesMap = new Map<number, { spouseId: number; spouseName: string; order: number }[]>();
    const memberNameMap = new Map<number, string>();

    membersRes.rows.forEach(m => {
      memberNameMap.set(m.id, m.fullName);
      parentsMap.set(m.id, []);
      childrenMap.set(m.id, []);
      spousesMap.set(m.id, []);
    });

    relRes.rows.forEach(r => {
      if (r.type === 'parent_child') {
        const parentId = r.personAId;
        const childId = r.personBId;
        if (!parentsMap.has(childId)) parentsMap.set(childId, []);
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        parentsMap.get(childId)!.push(parentId);
        childrenMap.get(parentId)!.push(childId);
      } else if (r.type === 'spouse') {
        const a = r.personAId;
        const b = r.personBId;
        if (!spousesMap.has(a)) spousesMap.set(a, []);
        if (!spousesMap.has(b)) spousesMap.set(b, []);
        spousesMap.get(a)!.push({ spouseId: b, spouseName: memberNameMap.get(b) || '', order: r.marriageOrder || 1 });
        spousesMap.get(b)!.push({ spouseId: a, spouseName: memberNameMap.get(a) || '', order: r.marriageOrder || 1 });
      }
    });

    const persons = membersRes.rows.map(m => {
      const myParents = parentsMap.get(m.id) || [];
      const siblingsSet = new Set<number>();
      myParents.forEach(pId => {
        const pChildren = childrenMap.get(pId) || [];
        pChildren.forEach(cId => {
          if (cId !== m.id) siblingsSet.add(cId);
        });
      });

      return {
        ...m,
        parents: myParents,
        spouses: spousesMap.get(m.id) || [],
        children: childrenMap.get(m.id) || [],
        siblings: Array.from(siblingsSet)
      };
    });

    res.json({
      success: true,
      source: 'postgresql_database',
      database: 'rithamic_familytree',
      summary: {
        totalIndividuals: membersRes.rows.length,
        totalRelationships: relRes.rows.length,
        generationsSpan: 6,
        caste: 'Kongu Vellar Kounder',
        subCaste: 'Venduvan kulam'
      },
      branches: branchesRes.rows,
      persons,
      relationships: relRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching family tree data from PostgreSQL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 2. GET /members - Search & Filter Members directly from DB
// ============================================================================
familyTreeRouter.get('/members', async (req: Request, res: Response) => {
  try {
    const { query, branch, generation, is_living } = req.query;
    let sql = `SELECT id, full_name, tamil_name, gender, generation, is_living, birth_year, passing_year, native_place, branch_name, identity_clues FROM family_members WHERE 1=1`;
    const params: any[] = [];

    if (query) {
      params.push(`%${query}%`);
      sql += ` AND (full_name ILIKE $${params.length} OR tamil_name ILIKE $${params.length} OR native_place ILIKE $${params.length})`;
    }

    if (branch && branch !== 'ALL') {
      params.push(branch);
      sql += ` AND (branch_id = $${params.length} OR branch_name = $${params.length})`;
    }

    if (generation && generation !== 'ALL') {
      params.push(parseInt(generation as string, 10));
      sql += ` AND generation = $${params.length}`;
    }

    if (is_living !== undefined) {
      params.push(is_living === 'true');
      sql += ` AND is_living = $${params.length}`;
    }

    sql += ` ORDER BY generation ASC, id ASC`;
    const result = await pool.query(sql, params);
    res.json({ success: true, count: result.rows.length, members: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 3. GET /members/:id - Single Member Detail with Relations from DB
// ============================================================================
familyTreeRouter.get('/members/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const memberRes = await pool.query('SELECT * FROM family_members WHERE id = $1', [id]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const member = memberRes.rows[0];

    // Fetch parent-child and spouse relationships
    const relsRes = await pool.query(
      `SELECT r.id, r.relationship_type, r.person_a_id, r.person_b_id,
              m1.full_name as person_a_name, m2.full_name as person_b_name
       FROM family_relationships r
       LEFT JOIN family_members m1 ON r.person_a_id = m1.id
       LEFT JOIN family_members m2 ON r.person_b_id = m2.id
       WHERE (r.person_a_id = $1 OR r.person_b_id = $1) AND r.is_active = TRUE`,
      [id]
    );

    res.json({ success: true, member, relationships: relsRes.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 4. POST /members - Add Member to Database
// ============================================================================
familyTreeRouter.post('/members', async (req: Request, res: Response) => {
  try {
    const {
      id,
      fullName,
      tamilName,
      gender,
      generation,
      isLiving,
      birthYear,
      passingYear,
      dob,
      dod,
      caste,
      subCaste,
      nativePlace,
      occupation,
      branchId,
      branchName,
      contacts,
      addresses,
      notes
    } = req.body;

    const nextId = id || (await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM family_members')).rows[0].next_id;

    const result = await pool.query(
      `INSERT INTO family_members (
        id, full_name, tamil_name, gender, generation, is_living,
        birth_year, passing_year, dob, dod, caste, sub_caste,
        native_place, occupation, branch_id, branch_name, contacts,
        addresses, notes, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb, $19, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [
        nextId,
        fullName,
        tamilName || null,
        gender,
        generation || 1,
        isLiving ?? true,
        birthYear || null,
        passingYear || null,
        dob || null,
        dod || null,
        caste || 'Kongu Vellar Kounder',
        subCaste || 'Venduvan kulam',
        nativePlace || 'Kangayam, Tamil Nadu',
        occupation || null,
        branchId || null,
        branchName || null,
        JSON.stringify(contacts || []),
        JSON.stringify(addresses || []),
        notes || null
      ]
    );

    res.status(201).json({ success: true, member: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 5. PUT /members/:id - Update Member in Database
// ============================================================================
familyTreeRouter.put('/members/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      fullName,
      tamilName,
      gender,
      generation,
      isLiving,
      birthYear,
      passingYear,
      dob,
      dod,
      caste,
      subCaste,
      nativePlace,
      occupation,
      branchId,
      branchName,
      contacts,
      addresses,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE family_members SET
        full_name = COALESCE($1, full_name),
        tamil_name = COALESCE($2, tamil_name),
        gender = COALESCE($3, gender),
        generation = COALESCE($4, generation),
        is_living = COALESCE($5, is_living),
        birth_year = COALESCE($6, birth_year),
        passing_year = COALESCE($7, passing_year),
        dob = COALESCE($8, dob),
        dod = COALESCE($9, dod),
        caste = COALESCE($10, caste),
        sub_caste = COALESCE($11, sub_caste),
        native_place = COALESCE($12, native_place),
        occupation = COALESCE($13, occupation),
        branch_id = COALESCE($14, branch_id),
        branch_name = COALESCE($15, branch_name),
        contacts = COALESCE($16::jsonb, contacts),
        addresses = COALESCE($17::jsonb, addresses),
        notes = COALESCE($18, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19 RETURNING *`,
      [
        fullName,
        tamilName,
        gender,
        generation,
        isLiving,
        birthYear,
        passingYear,
        dob,
        dod,
        caste,
        subCaste,
        nativePlace,
        occupation,
        branchId,
        branchName,
        contacts ? JSON.stringify(contacts) : null,
        addresses ? JSON.stringify(addresses) : null,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    res.json({ success: true, member: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 6. DELETE /members/:id - Delete Member from Database
// ============================================================================
familyTreeRouter.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await pool.query('DELETE FROM family_members WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    res.json({ success: true, deletedId: id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 7. POST /relationships - Create Relationship in Database
// ============================================================================
familyTreeRouter.post('/relationships', async (req: Request, res: Response) => {
  try {
    const { relationshipType, nature, personAId, personBId, marriageOrder } = req.body;
    const result = await pool.query(
      `INSERT INTO family_relationships (
        relationship_type, nature, person_a_id, person_b_id, marriage_order
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
      SET nature = EXCLUDED.nature, marriage_order = EXCLUDED.marriage_order
      RETURNING *`,
      [relationshipType, nature || 'biological', personAId, personBId, marriageOrder || 1]
    );
    res.status(201).json({ success: true, relationship: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 8. DELETE /relationships/:id - Delete Relationship from Database
// ============================================================================
familyTreeRouter.delete('/relationships/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query('DELETE FROM family_relationships WHERE id = $1', [id]);
    res.json({ success: true, deletedId: id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 9. GET /branches - List All Branches from Database
// ============================================================================
familyTreeRouter.get('/branches', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM family_branches ORDER BY id ASC');
    res.json({ success: true, branches: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
