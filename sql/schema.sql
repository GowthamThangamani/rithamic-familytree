-- ============================================================================
-- Rithamic Family Tree - Base Schema Reference (PostgreSQL)
-- Scope: rithamic-familytree dedicated database
-- ============================================================================

-- Table: Migration Tracking Registry
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(100) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Table: Family Members / Individuals
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
    relationship_type VARCHAR(50) NOT NULL, -- 'spouse', 'parent_child', 'adoptive_parent_child'
    nature VARCHAR(50) DEFAULT 'biological', -- 'biological', 'legal_marriage', 'adopted'
    person_a_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    person_b_id INT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    marriage_order INT DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (relationship_type, person_a_id, person_b_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_gen ON family_members(generation);
CREATE INDEX IF NOT EXISTS idx_members_branch ON family_members(branch_id);
CREATE INDEX IF NOT EXISTS idx_rel_person_a ON family_relationships(person_a_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_rel_person_b ON family_relationships(person_b_id, relationship_type);
