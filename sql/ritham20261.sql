-- ============================================================================
-- Rithamic Family Tree - Database Migration Script (Version: ritham20261)
-- Scope: rithamic-familytree dedicated database
-- Description: Idempotent migration script for Family Branches, Individuals (60 members),
--              and Family Relationships (Parent-Child, Spouses, Marriages).
-- Rule: This script is 100% IDEMPOTENT and can be safely executed repeatedly.
-- ============================================================================

-- ============================================================================
-- 1. MIGRATION TRACKING REGISTRY
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(100) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. BASE TABLES (CREATE IF NOT EXISTS)
-- ============================================================================

-- Table: Family Branches
CREATE TABLE IF NOT EXISTS family_branches (
    id SERIAL PRIMARY KEY,
    branch_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    ancestor_root TEXT,
    key_members JSONB DEFAULT '[]',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Family Individuals / Members
CREATE TABLE IF NOT EXISTS family_members (
    id INTEGER PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    tamil_name VARCHAR(150),
    gender VARCHAR(20) NOT NULL,
    generation INT NOT NULL DEFAULT 1,
    is_living BOOLEAN NOT NULL DEFAULT TRUE,
    birth_year INT,
    passing_year INT,
    dob VARCHAR(50),
    dod VARCHAR(50),
    caste VARCHAR(100) DEFAULT 'Kongu Vellar Kounder',
    sub_caste VARCHAR(100) DEFAULT 'Venduvan kulam',
    native_place VARCHAR(150) DEFAULT 'Kangayam, Tamil Nadu',
    occupation VARCHAR(150),
    branch_id VARCHAR(50),
    branch_name VARCHAR(150),
    contacts JSONB DEFAULT '[]',
    addresses JSONB DEFAULT '[]',
    photos JSONB DEFAULT '[]',
    identity_clues JSONB DEFAULT '{}',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Family Relationships (Parent-Child, Spouse, Adoptive)
CREATE TABLE IF NOT EXISTS family_relationships (
    id BIGSERIAL PRIMARY KEY,
    relationship_type VARCHAR(50) NOT NULL,
    nature VARCHAR(50) DEFAULT 'biological',
    person_a_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    person_b_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    marriage_order INT DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (relationship_type, person_a_id, person_b_id)
);

-- ============================================================================
-- 3. COLUMN ALTERATIONS (ADD COLUMN IF NOT EXISTS)
-- ============================================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_members') THEN
        ALTER TABLE family_members ADD COLUMN IF NOT EXISTS tamil_name VARCHAR(150);
        ALTER TABLE family_members ADD COLUMN IF NOT EXISTS caste VARCHAR(100) DEFAULT 'Kongu Vellar Kounder';
        ALTER TABLE family_members ADD COLUMN IF NOT EXISTS sub_caste VARCHAR(100) DEFAULT 'Venduvan kulam';
        ALTER TABLE family_members ADD COLUMN IF NOT EXISTS native_place VARCHAR(150) DEFAULT 'Kangayam, Tamil Nadu';
        ALTER TABLE family_members ADD COLUMN IF NOT EXISTS identity_clues JSONB DEFAULT '{}';
        ALTER TABLE family_members ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- ============================================================================
-- 4. INDEXES (CREATE INDEX IF NOT EXISTS)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_members_gen ON family_members(generation);
CREATE INDEX IF NOT EXISTS idx_members_branch ON family_members(branch_id);
CREATE INDEX IF NOT EXISTS idx_rel_person_a ON family_relationships(person_a_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_rel_person_b ON family_relationships(person_b_id, relationship_type);

-- ============================================================================
-- 5. DYNAMIC SEED & CONFIGURATION UPSERTS
-- ============================================================================

INSERT INTO family_branches (branch_id, name, ancestor_root, key_members)
VALUES ('BRANCH_VELUSAMY', 'Velusamy Kounder & Chellamal Lineage', 'Periya Pannai (#19) -> Thangamani Thata (#27) -> Velusamy Kounder (#6)', '["Gowtham Thangamani (#1)","Thangamani V (#2)","Selva Rani (#3)","Kanimozhi (#4)","Mallika (#7)"]'::jsonb)
ON CONFLICT (branch_id) DO UPDATE
SET name = EXCLUDED.name,
    ancestor_root = EXCLUDED.ancestor_root,
    key_members = EXCLUDED.key_members;

INSERT INTO family_branches (branch_id, name, ancestor_root, key_members)
VALUES ('BRANCH_ANNA_ANBAN', 'Anna Anban Appa & Annan Anban Lineage', 'Periya Pannai (#19) -> Anna Anpan Thata (#20) -> Anna Anban Appa (#21)', '["Annan Anban (#22)","Athithanambi (#42)","A P Velusamy (#45)","Saritha V (#48)","Athvikh (#49)"]'::jsonb)
ON CONFLICT (branch_id) DO UPDATE
SET name = EXCLUDED.name,
    ancestor_root = EXCLUDED.ancestor_root,
    key_members = EXCLUDED.key_members;

INSERT INTO family_branches (branch_id, name, ancestor_root, key_members)
VALUES ('BRANCH_KANDASAMY', 'Kandasamy Gounder & Duraisamy Lineage', 'Periya Pannai (#19) -> Anna Anpan Thata (#20) -> Kandasamy Gounder (#53)', '["Duraisamy K (#56)","Suthir D (#58)","Kathiresan D (#61)","Kayal S P (#60)"]'::jsonb)
ON CONFLICT (branch_id) DO UPDATE
SET name = EXCLUDED.name,
    ancestor_root = EXCLUDED.ancestor_root,
    key_members = EXCLUDED.key_members;

INSERT INTO family_branches (branch_id, name, ancestor_root, key_members)
VALUES ('BRANCH_PALANIVEL', 'Palani Vel Appa & Kumaran Lineage', 'Periya Pannai (#19) -> Thangamani Thata (#27) -> Palani Vel Appa (#23)', '["Palanivel (#24)","Kumaran (#26)","Madhu (#25)","Kumaran Daughter (#38)"]'::jsonb)
ON CONFLICT (branch_id) DO UPDATE
SET name = EXCLUDED.name,
    ancestor_root = EXCLUDED.ancestor_root,
    key_members = EXCLUDED.key_members;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    19, 'periya pannai.', 'பெரிய பண்ணை', 'male', 1, false,
    '1900-01-01', NULL, 1900, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    'Patriarch & Landowner', 'Main Lineage', 'Main Lineage', '[]'::jsonb, '[{"type":"native","value":"Kangayam, Tamil Nadu"}]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"periya pannai (Patriarch Forefather • b. 1900)","parentSpouseSummary":"H/o periya panniwife","lifespanText":"b. 1900","branchName":"Main Lineage","generationLevel":1}'::jsonb, 'periya pannai (Patriarch Forefather • b. 1900)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    35, 'periya panniwife', 'பெரிய பண்ணை மனைவி', 'female', 1, false,
    '1905-01-01', NULL, 1905, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    'Matriarch', 'Main Lineage', 'Main Lineage', '[]'::jsonb, '[{"type":"native","value":"Kangayam, Tamil Nadu"}]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"periya panniwife (Matriarch Forefather • b. 1905)","parentSpouseSummary":"W/o periya pannai","lifespanText":"b. 1905","branchName":"Main Lineage","generationLevel":1}'::jsonb, 'periya panniwife (Matriarch Forefather • b. 1905)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    27, 'thangamani thata', 'தங்கமணி தாத்தா', 'male', 2, false,
    '1901-01-01', NULL, 1901, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"thangamani thata (S/o periya pannai • b. 1901)","parentSpouseSummary":"S/o periya pannai | H/o thata partner","lifespanText":"b. 1901","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":2}'::jsonb, 'thangamani thata (S/o periya pannai • b. 1901)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    37, 'thata partner', 'தாத்தா மனைவி', 'female', 2, false,
    '1906-01-01', NULL, 1906, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"thata partner (W/o thangamani thata)","parentSpouseSummary":"W/o thangamani thata","lifespanText":"Deceased","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":2}'::jsonb, 'thata partner (W/o thangamani thata)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    20, 'anna anpan thata', 'அண்ணா அன்பன் தாத்தா', 'male', 2, false,
    '1910-01-01', NULL, 1910, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"anna anpan thata (S/o periya pannai • b. 1910)","parentSpouseSummary":"S/o periya pannai","lifespanText":"b. 1910","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":2}'::jsonb, 'anna anpan thata (S/o periya pannai • b. 1910)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    6, 'Velusamy Kounder', 'வேலுசாமி கவுண்டர்', 'male', 3, false,
    '1927-01-01', '2010-01-01', 1927, 2010, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    'Farmer & Patriarch', 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Velusamy Kounder (S/o Thangamani Thata | H/o Chellamal • 1927–2010)","parentSpouseSummary":"S/o Thangamani Thata | H/o Chellamal","lifespanText":"1927 – 2010","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":3}'::jsonb, 'Velusamy Kounder (S/o Thangamani Thata | H/o Chellamal • 1927–2010)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    5, 'Chellamal', 'செல்லம்மாள்', 'female', 3, true,
    '1937-01-01', NULL, 1937, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[{"type":"phone","value":"+91 9443202648","privacy":"confidential_living"}]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Chellamal (W/o Velusamy Kounder • b. 1937)","parentSpouseSummary":"W/o Velusamy Kounder","lifespanText":"b. 1937 (~89 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":3}'::jsonb, 'Chellamal (W/o Velusamy Kounder • b. 1937)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    23, 'palani vel appa', 'பழனிவேல் அப்பா', 'male', 3, false,
    '1930-01-01', NULL, 1930, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Palani Vel Appa & Kumaran Lineage', 'Palani Vel Appa & Kumaran Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"palani vel appa (S/o Thangamani Thata)","parentSpouseSummary":"S/o Thangamani Thata","lifespanText":"Deceased","branchName":"Palani Vel Appa & Kumaran Lineage","generationLevel":3}'::jsonb, 'palani vel appa (S/o Thangamani Thata)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    36, 'that''s child', 'தாத்தா குழந்தை', 'female', 3, false,
    '1935-01-01', NULL, 1935, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"that''s child (D/o Thangamani Thata)","parentSpouseSummary":"D/o Thangamani Thata","lifespanText":"Deceased","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":3}'::jsonb, 'that''s child (D/o Thangamani Thata)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    21, 'anna anban appa', 'அண்ணா அன்பன் அப்பா', 'male', 3, false,
    '1920-01-01', NULL, 1920, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"anna anban appa (S/o Anna Anpan Thata • b. 1920)","parentSpouseSummary":"S/o Anna Anpan Thata","lifespanText":"b. 1920","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":3}'::jsonb, 'anna anban appa (S/o Anna Anpan Thata • b. 1920)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    53, 'kandasamy gounder', 'கந்தசாமி கவுண்டர்', 'male', 3, false,
    '1925-01-01', NULL, 1925, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"kandasamy gounder (S/o Anna Anpan Thata | H/o Chinnathal K)","parentSpouseSummary":"S/o Anna Anpan Thata","lifespanText":"Deceased","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":3}'::jsonb, 'kandasamy gounder (S/o Anna Anpan Thata | H/o Chinnathal K)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    55, 'chinnathal k', 'சின்னத்தாள்', 'female', 3, false,
    '1930-01-01', NULL, 1930, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"chinnathal k (W/o kandasamy gounder)","parentSpouseSummary":"W/o kandasamy gounder","lifespanText":"Deceased","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":3}'::jsonb, 'chinnathal k (W/o kandasamy gounder)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    54, 'sadayappa gounder', 'சடையப்ப கவுண்டர்', 'male', 3, false,
    '1928-01-01', NULL, 1928, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"sadayappa gounder (S/o Anna Anpan Thata)","parentSpouseSummary":"S/o Anna Anpan Thata","lifespanText":"Deceased","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":3}'::jsonb, 'sadayappa gounder (S/o Anna Anpan Thata)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    2, 'Thangamani V', 'தங்கமணி வி', 'male', 4, true,
    '1964-05-10', NULL, 1964, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    'Business & Agriculture', 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[{"type":"phone","value":"+91 9443202648","privacy":"confidential_living"}]'::jsonb, '[{"type":"home","value":"23/2, Sakthi Nagar, Kangayam - 638701","privacy":"confidential_living"}]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Thangamani V (S/o Velusamy Kounder & Chellamal | H/o Selva Rani • b. 1964)","parentSpouseSummary":"S/o Velusamy Kounder & Chellamal | H/o Selva Rani","lifespanText":"b. 1964 (~62 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":4}'::jsonb, 'Thangamani V (S/o Velusamy Kounder & Chellamal | H/o Selva Rani • b. 1964)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    3, 'Selva Rani', 'செல்வராணி', 'female', 4, true,
    '1964-05-10', NULL, 1964, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    'Homemaker', 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[{"type":"phone","value":"+91 9445502648","privacy":"confidential_living"}]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Selva Rani (W/o Thangamani V • b. 1964)","parentSpouseSummary":"W/o Thangamani V","lifespanText":"b. 1964 (~62 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":4}'::jsonb, 'Selva Rani (W/o Thangamani V • b. 1964)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    7, 'Mallika', 'மல்லிகா', 'female', 4, true,
    '1962-01-01', NULL, 1962, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Mallika (D/o Velusamy & Chellamal | W/o Nataraj • b. 1962)","parentSpouseSummary":"D/o Velusamy & Chellamal | W/o Nataraj","lifespanText":"b. 1962 (~64 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":4}'::jsonb, 'Mallika (D/o Velusamy & Chellamal | W/o Nataraj • b. 1962)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    8, 'Nataraj', 'நடராஜ்', 'male', 4, true,
    '1957-01-01', NULL, 1957, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Nataraj (H/o Mallika • b. 1957)","parentSpouseSummary":"H/o Mallika","lifespanText":"b. 1957 (~69 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":4}'::jsonb, 'Nataraj (H/o Mallika • b. 1957)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    22, 'annan anban', 'அண்ணன் அன்பன்', 'male', 4, false,
    '1955-01-01', NULL, 1955, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"annan anban (S/o Anna Anban Appa | H/o Visalatchi)","parentSpouseSummary":"S/o Anna Anban Appa","lifespanText":"Deceased","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":4}'::jsonb, 'annan anban (S/o Anna Anban Appa | H/o Visalatchi)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    41, 'Visalatchi', 'விசாலாட்சி', 'female', 4, true,
    '1962-01-01', NULL, 1962, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Visalatchi (W/o annan anban • b. 1962)","parentSpouseSummary":"W/o annan anban","lifespanText":"b. 1962 (~64 yrs)","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":4}'::jsonb, 'Visalatchi (W/o annan anban • b. 1962)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    45, 'A P Velusamy', 'ஏ பி வேலுசாமி', 'male', 4, true,
    '1960-01-01', NULL, 1960, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"A P Velusamy (S/o Anna Anban Appa | H/o Chinnathal V)","parentSpouseSummary":"S/o Anna Anban Appa","lifespanText":"b. 1960","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":4}'::jsonb, 'A P Velusamy (S/o Anna Anban Appa | H/o Chinnathal V)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    46, 'Chinnathal V', 'சின்னத்தாள் வி', 'female', 4, true,
    '1965-01-01', NULL, 1965, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Chinnathal V (W/o A P Velusamy)","parentSpouseSummary":"W/o A P Velusamy","lifespanText":"Living","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":4}'::jsonb, 'Chinnathal V (W/o A P Velusamy)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    56, 'duraisamy k', 'துரைசாமி கே', 'male', 4, true,
    '1962-01-01', NULL, 1962, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"duraisamy k (S/o kandasamy gounder | H/o eswari d • b. 1962)","parentSpouseSummary":"S/o kandasamy gounder","lifespanText":"b. 1962 (~64 yrs)","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":4}'::jsonb, 'duraisamy k (S/o kandasamy gounder | H/o eswari d • b. 1962)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    57, 'eswari d', 'ஈஸ்வரி டி', 'female', 4, true,
    '1970-01-01', NULL, 1970, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"eswari d (W/o duraisamy k • b. 1970)","parentSpouseSummary":"W/o duraisamy k","lifespanText":"b. 1970 (~56 yrs)","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":4}'::jsonb, 'eswari d (W/o duraisamy k • b. 1970)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    24, 'palanivel', 'பழனிவேல்', 'male', 4, true,
    '1965-01-01', NULL, 1965, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Palani Vel Appa & Kumaran Lineage', 'Palani Vel Appa & Kumaran Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"palanivel (S/o palani vel appa)","parentSpouseSummary":"S/o palani vel appa","lifespanText":"b. 1965","branchName":"Palani Vel Appa & Kumaran Lineage","generationLevel":4}'::jsonb, 'palanivel (S/o palani vel appa)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    1, 'Gowtham Thangamani', 'கௌதம் தங்கமணி', 'male', 5, true,
    '1993-05-03', NULL, 1993, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    'Software Architect', 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[{"type":"phone","value":"+91 9488202649","privacy":"confidential_living"}]'::jsonb, '[{"type":"home","value":"23/2, Sakthi Nagar, Dharapuram Road, Kangayam - 638701","privacy":"confidential_living"}]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Gowtham Thangamani (S/o Thangamani V & Selva Rani • b. 1993 (~33 yrs))","parentSpouseSummary":"S/o Thangamani V & Selva Rani","lifespanText":"b. 1993 (~33 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, 'Gowtham Thangamani (S/o Thangamani V & Selva Rani • b. 1993 (~33 yrs))', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    4, 'Kanimozhi', 'கனிமொழி', 'female', 5, true,
    '1996-09-09', NULL, 1996, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[{"type":"phone","value":"+91 9488202648","privacy":"confidential_living"}]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Kanimozhi (D/o Thangamani V & Selva Rani | W/o Santhos aka sampath • b. 1996)","parentSpouseSummary":"D/o Thangamani V & Selva Rani | W/o Santhos aka sampath","lifespanText":"b. 1996 (~30 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, 'Kanimozhi (D/o Thangamani V & Selva Rani | W/o Santhos aka sampath • b. 1996)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    16, 'Santhos aka sampath', 'சந்தோஷ் என்கிற சம்பத்', 'male', 5, true,
    '1993-01-01', NULL, 1993, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Santhos aka sampath (Partner of Kanimozhi • b. 1993)","parentSpouseSummary":"Partner of Kanimozhi","lifespanText":"b. 1993 (~33 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, 'Santhos aka sampath (Partner of Kanimozhi • b. 1993)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    9, 'Sudha', 'சுதா', 'female', 5, true,
    '1985-01-01', NULL, 1985, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Sudha (D/o Mallika & Nataraj | W/o Venkadesh • b. 1985)","parentSpouseSummary":"D/o Mallika & Nataraj","lifespanText":"b. 1985 (~41 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, 'Sudha (D/o Mallika & Nataraj | W/o Venkadesh • b. 1985)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    10, 'Venkadesh', 'வெங்கடேஷ்', 'male', 5, true,
    '1981-01-01', NULL, 1981, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Venkadesh (H/o Sudha • b. 1981)","parentSpouseSummary":"H/o Sudha","lifespanText":"b. 1981 (~45 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, 'Venkadesh (H/o Sudha • b. 1981)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    12, 'Subha', 'சுபா', 'female', 5, true,
    '1988-01-01', NULL, 1988, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Subha (D/o Mallika & Nataraj | W/o Selva • b. 1988)","parentSpouseSummary":"D/o Mallika & Nataraj","lifespanText":"b. 1988 (~38 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, 'Subha (D/o Mallika & Nataraj | W/o Selva • b. 1988)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    13, 'Selva', 'செல்வா', 'male', 5, true,
    '1987-01-01', NULL, 1987, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Selva (H/o Subha • b. 1987)","parentSpouseSummary":"H/o Subha","lifespanText":"b. 1987 (~39 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, 'Selva (H/o Subha • b. 1987)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    42, 'ATHITHANAMBI', 'ஆதித்தநம்பி', 'male', 5, true,
    '1988-01-01', NULL, 1988, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"ATHITHANAMBI (S/o annan anban & Visalatchi • b. 1988)","parentSpouseSummary":"S/o annan anban","lifespanText":"b. 1988 (~38 yrs)","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":5}'::jsonb, 'ATHITHANAMBI (S/o annan anban & Visalatchi • b. 1988)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    43, 'Divya Darshini', 'திவ்ய தர்ஷினி', 'female', 5, true,
    '1991-01-01', NULL, 1991, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Divya Darshini (W/o ATHITHANAMBI • b. 1991)","parentSpouseSummary":"W/o ATHITHANAMBI","lifespanText":"b. 1991 (~35 yrs)","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":5}'::jsonb, 'Divya Darshini (W/o ATHITHANAMBI • b. 1991)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    47, 'Satheesh', 'சதீஷ்', 'male', 5, true,
    '1995-01-01', NULL, 1995, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Satheesh (S/o A P Velusamy • b. 1995)","parentSpouseSummary":"S/o A P Velusamy","lifespanText":"b. 1995 (~31 yrs)","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":5}'::jsonb, 'Satheesh (S/o A P Velusamy • b. 1995)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    48, 'Saritha V', 'சரிதா வி', 'female', 5, true,
    '1990-01-01', NULL, 1990, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Saritha V (D/o A P Velusamy • b. 1990)","parentSpouseSummary":"D/o A P Velusamy","lifespanText":"b. 1990 (~36 yrs)","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":5}'::jsonb, 'Saritha V (D/o A P Velusamy • b. 1990)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    58, 'suthir d', 'சுதிர் டி', 'male', 5, true,
    '1991-01-01', NULL, 1991, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"suthir d (S/o duraisamy k | H/o priyanka s • b. 1991)","parentSpouseSummary":"S/o duraisamy k","lifespanText":"b. 1991 (~35 yrs)","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":5}'::jsonb, 'suthir d (S/o duraisamy k | H/o priyanka s • b. 1991)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    59, 'priyanka s', 'பிரியங்கா எஸ்', 'female', 5, true,
    '1995-01-01', NULL, 1995, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"priyanka s (W/o suthir d • b. 1995)","parentSpouseSummary":"W/o suthir d","lifespanText":"b. 1995 (~31 yrs)","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":5}'::jsonb, 'priyanka s (W/o suthir d • b. 1995)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    61, 'kathiresan d', 'கதிரேசன் டி', 'male', 5, true,
    '1996-01-01', NULL, 1996, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"kathiresan d (S/o duraisamy k | H/o kavi nivedha k • b. 1996)","parentSpouseSummary":"S/o duraisamy k","lifespanText":"b. 1996 (~30 yrs)","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":5}'::jsonb, 'kathiresan d (S/o duraisamy k | H/o kavi nivedha k • b. 1996)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    62, 'kavi nivedha k', 'கவி நிவேதா கே', 'female', 5, true,
    '1997-01-01', NULL, 1997, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"kavi nivedha k (W/o kathiresan d • b. 1997)","parentSpouseSummary":"W/o kathiresan d","lifespanText":"b. 1997 (~29 yrs)","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":5}'::jsonb, 'kavi nivedha k (W/o kathiresan d • b. 1997)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    25, 'madhu', 'மது', 'female', 5, true,
    '1990-01-01', NULL, 1990, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Palani Vel Appa & Kumaran Lineage', 'Palani Vel Appa & Kumaran Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"madhu (D/o palanivel • b. 1990)","parentSpouseSummary":"D/o palanivel","lifespanText":"b. 1990 (~36 yrs)","branchName":"Palani Vel Appa & Kumaran Lineage","generationLevel":5}'::jsonb, 'madhu (D/o palanivel • b. 1990)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    26, 'kumaran', 'குமரன்', 'male', 5, true,
    '1990-01-01', NULL, 1990, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Palani Vel Appa & Kumaran Lineage', 'Palani Vel Appa & Kumaran Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"kumaran (S/o palanivel | H/o kumaran wife • b. 1990)","parentSpouseSummary":"S/o palanivel","lifespanText":"b. 1990 (~36 yrs)","branchName":"Palani Vel Appa & Kumaran Lineage","generationLevel":5}'::jsonb, 'kumaran (S/o palanivel | H/o kumaran wife • b. 1990)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    39, 'kumaran wife', 'குமரன் மனைவி', 'female', 5, true,
    '1992-01-01', NULL, 1992, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Palani Vel Appa & Kumaran Lineage', 'Palani Vel Appa & Kumaran Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"kumaran wife (W/o kumaran)","parentSpouseSummary":"W/o kumaran","lifespanText":"Living","branchName":"Palani Vel Appa & Kumaran Lineage","generationLevel":5}'::jsonb, 'kumaran wife (W/o kumaran)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    52, 'kani baby', 'கனி பாப்பா', 'female', 6, true,
    '2022-01-01', NULL, 2022, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Kangayam, Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"kani baby (Child of Kanimozhi & Santhos)","parentSpouseSummary":"D/o Kanimozhi & Santhos","lifespanText":"b. 2022 (~4 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":6}'::jsonb, 'kani baby (Child of Kanimozhi & Santhos)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    11, 'Vaishnu', 'வைஷ்ணு', 'male', 6, true,
    '2000-01-01', NULL, 2000, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Vaishnu (S/o Venkadesh & Sudha • b. 2000)","parentSpouseSummary":"S/o Venkadesh & Sudha","lifespanText":"b. 2000 (~26 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":6}'::jsonb, 'Vaishnu (S/o Venkadesh & Sudha • b. 2000)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    14, 'Pranavu', 'பிரணவ்', 'male', 6, true,
    '2001-01-01', NULL, 2001, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Pranavu (S/o Selva & Subha • b. 2001)","parentSpouseSummary":"S/o Selva & Subha","lifespanText":"b. 2001 (~25 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":6}'::jsonb, 'Pranavu (S/o Selva & Subha • b. 2001)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    15, 'Subha papa', 'சுபா பாப்பா', 'female', 6, true,
    '2002-01-01', NULL, 2002, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Velusamy Kounder & Chellamal Lineage', 'Velusamy Kounder & Chellamal Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Subha papa (D/o Selva & Subha • b. 2002)","parentSpouseSummary":"D/o Selva & Subha","lifespanText":"b. 2002 (~24 yrs)","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":6}'::jsonb, 'Subha papa (D/o Selva & Subha • b. 2002)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    44, 'C A Venba', 'சி ஏ வெண்பா', 'female', 6, true,
    '2018-01-01', NULL, 2018, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"C A Venba (D/o Athithanambi & Divya Darshini • b. 2018)","parentSpouseSummary":"D/o Athithanambi & Divya Darshini","lifespanText":"b. 2018 (~8 yrs)","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":6}'::jsonb, 'C A Venba (D/o Athithanambi & Divya Darshini • b. 2018)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    49, 'Athvikh N S', 'அத்விக் என் எஸ்', 'male', 6, true,
    '2015-01-01', NULL, 2015, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Athvikh N S (S/o Saritha V • b. 2015)","parentSpouseSummary":"S/o Saritha V","lifespanText":"b. 2015 (~11 yrs)","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":6}'::jsonb, 'Athvikh N S (S/o Saritha V • b. 2015)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    51, 'Aarunya', 'ஆருண்யா', 'female', 6, true,
    '2017-01-01', NULL, 2017, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Anna Anban Appa & Annan Anban Lineage', 'Anna Anban Appa & Annan Anban Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"Aarunya (D/o Saritha V • b. 2017)","parentSpouseSummary":"D/o Saritha V","lifespanText":"b. 2017 (~9 yrs)","branchName":"Anna Anban Appa & Annan Anban Lineage","generationLevel":6}'::jsonb, 'Aarunya (D/o Saritha V • b. 2017)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    60, 'kayal s p', 'கயல் எஸ் பி', 'female', 6, true,
    '2020-01-01', NULL, 2020, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Kandasamy Gounder & Duraisamy Lineage', 'Kandasamy Gounder & Duraisamy Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"kayal s p (D/o suthir d & priyanka s • b. 2020)","parentSpouseSummary":"D/o suthir d & priyanka s","lifespanText":"b. 2020 (~6 yrs)","branchName":"Kandasamy Gounder & Duraisamy Lineage","generationLevel":6}'::jsonb, 'kayal s p (D/o suthir d & priyanka s • b. 2020)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_members (
    id, full_name, tamil_name, gender, generation, is_living,
    dob, dod, birth_year, passing_year, caste, sub_caste, native_place,
    occupation, branch_id, branch_name, contacts, addresses, photos,
    identity_clues, notes, metadata, updated_at
) VALUES (
    38, 'kumaran daughter', 'குமரன் மகள்', 'female', 6, true,
    '2020-01-01', NULL, 2020, NULL, 'Kongu Vellar Kounder', 'Venduvan kulam', 'Tamil Nadu',
    NULL, 'Palani Vel Appa & Kumaran Lineage', 'Palani Vel Appa & Kumaran Lineage', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"searchDescriptor":"kumaran daughter (D/o kumaran & kumaran wife)","parentSpouseSummary":"D/o kumaran","lifespanText":"Living","branchName":"Palani Vel Appa & Kumaran Lineage","generationLevel":6}'::jsonb, 'kumaran daughter (D/o kumaran & kumaran wife)', '{}'::jsonb, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    tamil_name = EXCLUDED.tamil_name,
    gender = EXCLUDED.gender,
    generation = EXCLUDED.generation,
    is_living = EXCLUDED.is_living,
    dob = EXCLUDED.dob,
    dod = EXCLUDED.dod,
    birth_year = EXCLUDED.birth_year,
    passing_year = EXCLUDED.passing_year,
    caste = EXCLUDED.caste,
    sub_caste = EXCLUDED.sub_caste,
    native_place = EXCLUDED.native_place,
    occupation = EXCLUDED.occupation,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    contacts = EXCLUDED.contacts,
    addresses = EXCLUDED.addresses,
    photos = EXCLUDED.photos,
    identity_clues = EXCLUDED.identity_clues,
    notes = EXCLUDED.notes,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 19, 35
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 19, 27
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 19, 20
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 27, 37
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 27, 6
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 27, 23
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 27, 36
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 20, 21
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 20, 53
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 20, 54
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 6, 5
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 6, 2
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 6, 7
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 23, 24
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 21, 22
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 21, 45
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 53, 55
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 53, 56
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 2, 3
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 2, 1
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 2, 4
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 7, 8
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 7, 9
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 7, 12
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 22, 41
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 22, 42
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 45, 46
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 45, 47
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 45, 48
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 56, 57
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 56, 58
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 56, 61
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 24, 25
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 24, 26
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 4, 16
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 4, 52
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 9, 10
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 9, 11
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 12, 13
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 12, 14
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 12, 15
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 42, 43
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 42, 44
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 48, 49
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 48, 51
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 58, 59
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 58, 60
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 61, 62
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'spouse', 'legal_marriage', 26, 39
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;

INSERT INTO family_relationships (
    relationship_type, nature, person_a_id, person_b_id
) VALUES (
    'parent_child', 'biological', 26, 38
)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE
SET nature = EXCLUDED.nature;


INSERT INTO schema_migrations (migration_name) 
VALUES ('ritham20261')
ON CONFLICT (migration_name) DO UPDATE 
SET applied_at = CURRENT_TIMESTAMP;

-- Additional Family Members (Eshwari R Family Lineage)
INSERT INTO family_members (id, full_name, tamil_name, gender, generation, is_living, birth_year, native_place, branch_id, branch_name, identity_clues, updated_at)
VALUES (63, 'Eshwari R', 'ஈஸ்வரி ஆர்', 'female', 5, true, 1995, 'Tamil Nadu', 'BRANCH_VELUSAMY', 'Velusamy Kounder & Chellamal Lineage', '{"searchDescriptor":"Eshwari R (W/o Gowtham Thangamani • D/o Rajendran & Lakshmi)","parentSpouseSummary":"W/o Gowtham Thangamani • D/o Rajendran & Lakshmi","lifespanText":"b. 1995","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, tamil_name = EXCLUDED.tamil_name, gender = EXCLUDED.gender, generation = EXCLUDED.generation, is_living = EXCLUDED.is_living, birth_year = EXCLUDED.birth_year, native_place = EXCLUDED.native_place, branch_id = EXCLUDED.branch_id, branch_name = EXCLUDED.branch_name, identity_clues = EXCLUDED.identity_clues, updated_at = CURRENT_TIMESTAMP;
INSERT INTO family_members (id, full_name, tamil_name, gender, generation, is_living, birth_year, native_place, branch_id, branch_name, identity_clues, updated_at)
VALUES (64, 'Rajendran', 'ராஜேந்திரன்', 'male', 4, true, 1965, 'Tamil Nadu', 'BRANCH_VELUSAMY', 'Velusamy Kounder & Chellamal Lineage', '{"searchDescriptor":"Rajendran (H/o Lakshmi • Father of Eshwari R & Priya R)","parentSpouseSummary":"H/o Lakshmi • Father of Eshwari R & Priya R","lifespanText":"Living","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":4}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, tamil_name = EXCLUDED.tamil_name, gender = EXCLUDED.gender, generation = EXCLUDED.generation, is_living = EXCLUDED.is_living, birth_year = EXCLUDED.birth_year, native_place = EXCLUDED.native_place, branch_id = EXCLUDED.branch_id, branch_name = EXCLUDED.branch_name, identity_clues = EXCLUDED.identity_clues, updated_at = CURRENT_TIMESTAMP;
INSERT INTO family_members (id, full_name, tamil_name, gender, generation, is_living, birth_year, native_place, branch_id, branch_name, identity_clues, updated_at)
VALUES (65, 'Lakshmi', 'லட்சுமி', 'female', 4, true, 1970, 'Tamil Nadu', 'BRANCH_VELUSAMY', 'Velusamy Kounder & Chellamal Lineage', '{"searchDescriptor":"Lakshmi (W/o Rajendran • Mother of Eshwari R & Priya R)","parentSpouseSummary":"W/o Rajendran • Mother of Eshwari R & Priya R","lifespanText":"Living","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":4}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, tamil_name = EXCLUDED.tamil_name, gender = EXCLUDED.gender, generation = EXCLUDED.generation, is_living = EXCLUDED.is_living, birth_year = EXCLUDED.birth_year, native_place = EXCLUDED.native_place, branch_id = EXCLUDED.branch_id, branch_name = EXCLUDED.branch_name, identity_clues = EXCLUDED.identity_clues, updated_at = CURRENT_TIMESTAMP;
INSERT INTO family_members (id, full_name, tamil_name, gender, generation, is_living, birth_year, native_place, branch_id, branch_name, identity_clues, updated_at)
VALUES (66, 'Priya R', 'பிரியா ஆர்', 'female', 5, true, 1998, 'Tamil Nadu', 'BRANCH_VELUSAMY', 'Velusamy Kounder & Chellamal Lineage', '{"searchDescriptor":"Priya R (D/o Rajendran & Lakshmi • W/o Selladurai • Sister of Eshwari R)","parentSpouseSummary":"D/o Rajendran & Lakshmi • W/o Selladurai","lifespanText":"Living","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, tamil_name = EXCLUDED.tamil_name, gender = EXCLUDED.gender, generation = EXCLUDED.generation, is_living = EXCLUDED.is_living, birth_year = EXCLUDED.birth_year, native_place = EXCLUDED.native_place, branch_id = EXCLUDED.branch_id, branch_name = EXCLUDED.branch_name, identity_clues = EXCLUDED.identity_clues, updated_at = CURRENT_TIMESTAMP;
INSERT INTO family_members (id, full_name, tamil_name, gender, generation, is_living, birth_year, native_place, branch_id, branch_name, identity_clues, updated_at)
VALUES (67, 'Selladurai', 'செல்லதுரை', 'male', 5, true, 1994, 'Tamil Nadu', 'BRANCH_VELUSAMY', 'Velusamy Kounder & Chellamal Lineage', '{"searchDescriptor":"Selladurai (H/o Priya R)","parentSpouseSummary":"H/o Priya R","lifespanText":"Living","branchName":"Velusamy Kounder & Chellamal Lineage","generationLevel":5}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, tamil_name = EXCLUDED.tamil_name, gender = EXCLUDED.gender, generation = EXCLUDED.generation, is_living = EXCLUDED.is_living, birth_year = EXCLUDED.birth_year, native_place = EXCLUDED.native_place, branch_id = EXCLUDED.branch_id, branch_name = EXCLUDED.branch_name, identity_clues = EXCLUDED.identity_clues, updated_at = CURRENT_TIMESTAMP;

-- Additional Family Relationships (Eshwari R Family Lineage)
INSERT INTO family_relationships (relationship_type, nature, person_a_id, person_b_id)
VALUES ('spouse', 'legal_marriage', 1, 63)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE SET nature = EXCLUDED.nature;
INSERT INTO family_relationships (relationship_type, nature, person_a_id, person_b_id)
VALUES ('spouse', 'legal_marriage', 64, 65)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE SET nature = EXCLUDED.nature;
INSERT INTO family_relationships (relationship_type, nature, person_a_id, person_b_id)
VALUES ('parent_child', 'biological', 64, 63)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE SET nature = EXCLUDED.nature;
INSERT INTO family_relationships (relationship_type, nature, person_a_id, person_b_id)
VALUES ('parent_child', 'biological', 65, 63)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE SET nature = EXCLUDED.nature;
INSERT INTO family_relationships (relationship_type, nature, person_a_id, person_b_id)
VALUES ('parent_child', 'biological', 64, 66)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE SET nature = EXCLUDED.nature;
INSERT INTO family_relationships (relationship_type, nature, person_a_id, person_b_id)
VALUES ('parent_child', 'biological', 65, 66)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE SET nature = EXCLUDED.nature;
INSERT INTO family_relationships (relationship_type, nature, person_a_id, person_b_id)
VALUES ('spouse', 'legal_marriage', 66, 67)
ON CONFLICT (relationship_type, person_a_id, person_b_id) DO UPDATE SET nature = EXCLUDED.nature;
