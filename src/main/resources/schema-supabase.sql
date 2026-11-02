-- =============================================================================
-- SGDTS: Government Subsidy & Grant Disbursement Tracking System
-- Supabase PostgreSQL Schema Initialization & Seed Script
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Schemes Table
CREATE TABLE IF NOT EXISTS schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    min_grant_amount NUMERIC(19, 2) NOT NULL,
    max_grant_amount NUMERIC(19, 2) NOT NULL,
    config_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Eligibility Criteria Table
CREATE TABLE IF NOT EXISTS eligibility_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    criterion_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    expected_value VARCHAR(255),
    weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT
);

-- 3. Routing Rules Table
CREATE TABLE IF NOT EXISTS routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    min_score NUMERIC(10, 2) NOT NULL,
    max_score NUMERIC(10, 2) NOT NULL,
    min_grant_amount NUMERIC(19, 2) NOT NULL,
    max_grant_amount NUMERIC(19, 2)
);

-- 3a. Routing Rule Stages (Collection Table)
CREATE TABLE IF NOT EXISTS routing_rule_stages (
    routing_rule_id UUID NOT NULL REFERENCES routing_rules(id) ON DELETE CASCADE,
    stage VARCHAR(255) NOT NULL
);

-- 4. Beneficiaries Table
CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    profile_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Grant Applications Table
CREATE TABLE IF NOT EXISTS grant_application (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version BIGINT DEFAULT 0,
    reference_number VARCHAR(255) NOT NULL UNIQUE,
    beneficiary_id UUID NOT NULL,
    scheme_id UUID NOT NULL,
    scheme_config_version INT NOT NULL DEFAULT 0,
    requested_amount NUMERIC(19, 2) NOT NULL,
    eligibility_data TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMP,
    eligibility_assessment_id UUID,
    current_verification_stage VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5a. Application Status History (Collection Table)
CREATE TABLE IF NOT EXISTS application_status_history (
    application_id UUID NOT NULL REFERENCES grant_application(id) ON DELETE CASCADE,
    history_entry VARCHAR(255) NOT NULL
);

-- 6. Eligibility Assessments Table
CREATE TABLE IF NOT EXISTS eligibility_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL,
    scheme_id UUID NOT NULL,
    scheme_config_version INT NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    total_score NUMERIC(19, 4) NOT NULL,
    max_possible_score NUMERIC(19, 4) NOT NULL,
    normalized_score NUMERIC(10, 2) NOT NULL,
    assessment_details TEXT,
    assessed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Verification Workflows Table
CREATE TABLE IF NOT EXISTS verification_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version BIGINT DEFAULT 0,
    application_id UUID NOT NULL,
    scheme_id UUID NOT NULL,
    current_stage_index INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    final_decision VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 7a. Workflow Stages (Collection Table)
CREATE TABLE IF NOT EXISTS workflow_stages (
    workflow_id UUID NOT NULL REFERENCES verification_workflows(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL
);

-- 8. Verification Tasks Table
CREATE TABLE IF NOT EXISTS verification_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version BIGINT DEFAULT 0,
    workflow_id UUID NOT NULL REFERENCES verification_workflows(id) ON DELETE CASCADE,
    application_id UUID NOT NULL,
    stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    assigned_officer_id VARCHAR(255),
    assigned_at TIMESTAMP,
    due_at TIMESTAMP,
    completed_at TIMESTAMP,
    decision VARCHAR(50),
    comments TEXT,
    escalation_level VARCHAR(50) NOT NULL DEFAULT 'NONE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8a. Task Escalation History (Collection Table)
CREATE TABLE IF NOT EXISTS task_escalation_history (
    task_id UUID NOT NULL REFERENCES verification_tasks(id) ON DELETE CASCADE,
    escalation_entry VARCHAR(255) NOT NULL
);

-- =============================================================================
-- Initial Seed Data: Schemes & Citizen Demographics
-- =============================================================================

INSERT INTO schemes (id, name, description, status, min_grant_amount, max_grant_amount, config_version, created_at, updated_at)
VALUES 
('e1a2b3c4-0001-4000-8000-000000000001', 'PM Kisan Samman Nidhi Subsidy', 'Direct income support for small and marginal landholding farmer families across all districts.', 'ACTIVE', 6000.00, 6000.00, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('e1a2b3c4-0002-4000-8000-000000000002', 'National Solar Rooftop Subsidy Grant', 'Financial assistance subsidy for domestic rooftop solar photovoltaic system installation.', 'ACTIVE', 30000.00, 78000.00, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('e1a2b3c4-0003-4000-8000-000000000003', 'Rural Youth Micro-Enterprise Seed Grant', 'Seed capital endowment to support unemployed rural youth starting village enterprises.', 'ACTIVE', 25000.00, 100000.00, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Criteria for PM Kisan
INSERT INTO eligibility_criteria (scheme_id, criterion_id, type, expected_value, weight, mandatory, description)
VALUES
('e1a2b3c4-0001-4000-8000-000000000001', 'LAND_HOLDING_HECTARES', 'NUMERIC_MAX', '2.0', 30.00, TRUE, 'Cultivable agricultural landholding must be 2.0 hectares or less'),
('e1a2b3c4-0001-4000-8000-000000000001', 'ANNUAL_INCOME', 'NUMERIC_MAX', '300000', 40.00, TRUE, 'Annual family gross income must not exceed ₹3,00,000'),
('e1a2b3c4-0001-4000-8000-000000000001', 'IS_INSTITUTIONAL_LANDHOLDER', 'BOOLEAN', 'false', 30.00, TRUE, 'Applicant must not belong to institutional landholder category');

-- Routing for PM Kisan
INSERT INTO routing_rules (id, scheme_id, min_score, max_score, min_grant_amount, max_grant_amount)
VALUES ('c1111111-0001-4000-8000-000000000001', 'e1a2b3c4-0001-4000-8000-000000000001', 60.00, 100.00, 1000.00, 6000.00);

INSERT INTO routing_rule_stages (routing_rule_id, stage)
VALUES 
('c1111111-0001-4000-8000-000000000001', 'INITIAL_REVIEW'),
('c1111111-0001-4000-8000-000000000001', 'FIELD_VERIFICATION'),
('c1111111-0001-4000-8000-000000000001', 'FINANCE_REVIEW');

-- Seed Citizen Beneficiaries
INSERT INTO beneficiaries (id, full_name, email, phone, address, district, state, date_of_birth, profile_status, created_at, updated_at)
VALUES 
('b1111111-0001-4000-8000-000000000001', 'Ramesh Kumar Verma', 'ramesh.verma@example.com', '+91 9876543210', 'Plot 42, Village Rampur, Tehsil Sadar', 'Varanasi', 'Uttar Pradesh', '1988-06-14', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('b1111111-0002-4000-8000-000000000002', 'Sunita Devi Yadav', 'sunita.yadav@example.com', '+91 9812345678', 'H.No 12, Ward 4, Shiv Nagar', 'Jaipur', 'Rajasthan', '1992-11-22', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

