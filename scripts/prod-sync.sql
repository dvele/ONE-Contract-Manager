-- ==============================================
-- Dev → Production Sync Script
-- Generated: 2026-02-15T18:40:32.475Z
-- ==============================================

BEGIN;

-- ============ CLAUSES ============

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2049, 'one-document-summary-100', 'Document Summary', '<p>This Master Purchase Agreement (Agreement) is made and entered into as of {{AGREEMENT_EXECUTION_DATE}}, by and between {{DVELE_PARTNERS_XYZ_LEGAL_NAME}}, a {{DVELE_PARTNERS_XYZ_STATE}} {{DVELE_PARTNERS_XYZ_ENTITY_TYPE}} (''Company''), and {{CLIENT_LEGAL_NAME}}, a {{CLIENT_STATE}} {{CLIENT_ENTITY_TYPE}} (''Client'') (collectively the ''Parties'').</p>
<p>This section gives Client an overview of what is being signed, what to expect, and what happens at each stage of the project. For full legal terms, refer to the full Agreement.</p>', 1, NULL, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2050, 'one-what-the-client-is-signing-200', 'What the Client is Signing:', '<p>Client is entering into an agreement with Company for the design and purchase of {{TOTAL_UNITS}} high-performance modular home(s). Services may include:</p>', 2, 2049, 90, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2051, 'one-offsite-services-design-engineering-and-manufactur-210', 'Offsite Services: Design, engineering, and manufacturing', '', 4, 2053, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2052, 'one-on-site-services-shipping-delivery-installation-an-215', 'On-Site Services: Shipping, delivery, installation, and site construction', '', 4, 2053, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2053, 'one-services-220', 'Services:', '<p>The specific services selected are detailed in Section 1.1. This agreement starts with design only, with subsequent phases requiring Client approval to proceed.</p>', 2, 2049, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2054, 'one-initial-payment-225', 'Initial Payment:', '', 2, 2049, 30, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2055, 'one-design-engineering-fee-designfee---due-upon-signin-230', 'Design & Engineering Fee', '<p>Design & Engineering Fee: {{DESIGN_FEE}} - Due upon signing this agreement. Work cannot begin until it''s paid.</p>', 4, 2054, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2056, 'one-this-fee-covers-all-site-specific-design-engineeri-235', 'This fee covers all site-specific design, engineering, development coordination, cost estimation, and permitting support needed to provide accurate final pricing, but excludes professional fees, such as Engineer’s Stamping, Site Survey’s, Soil Testing and Geotechnical.', '', 4, 2054, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2057, 'one-peace-of-mind-guarantee-you-pay-only-this-fee-unti-240', 'Peace of Mind Guarantee: You pay only this fee until Green Light. If final pricing makes the project unfeasible, you can exit gracefully.', '', 4, 2054, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2058, 'one-what-happens-next-245', 'What Happens Next', '<p>{{WHAT_HAPPENS_NEXT_TABLE}}</p>', 2, 2049, 40, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2059, 'one-important-notes-250', 'Important Notes', '', 2, 2049, 50, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2060, 'one-preliminary-estimates-at-signing-are-based-on-init-255', 'Preliminary estimates at signing are based on initial information. They will be refined during design as site conditions, design decisions, and permitting requirements become clear.', '', 4, 2059, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2061, 'one-at-green-light-manufacturing-pricing-becomes-locke-260', 'At Green Light, manufacturing pricing becomes LOCKED. Site pricing is refined to maximum accuracy but may be subject to change orders if unforeseen conditions arise.', '', 4, 2059, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2062, 'one-you-can-exit-after-the-design-phase-before-green-l-265', 'You can exit after the design phase (before Green Light) having paid only the Design & Engineering Fee.', '', 4, 2059, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2063, 'one-optional-design-work-beyond-the-base-scope-require-270', 'Optional design work (beyond the base scope) requires Client written approval and additional fees.', '', 4, 2059, 30, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2064, 'one-clients-responsibilities-275', 'Client''s Responsibilities', '', 2, 2049, 60, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2065, 'one-on-site-work-choose-to-have-this-included-in-the-c-280', 'On-Site work: choose to have this included in the contract or hire your own licensed General Contractor to prepare the project site', '', 4, 2064, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2066, 'one-stay-engaged-during-design-285', 'Stay engaged during design.', '', 4, 2064, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2067, 'one-respond-to-key-decisions-on-time-290', 'Respond to key decisions on time', '', 4, 2064, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2068, 'one-make-timely-payments-as-per-the-agreement-295', 'Make timely payments as per the agreement', '', 4, 2064, 30, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2069, 'one-when-does-this-end-300', 'When Does This End?', '', 2, 2049, 70, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2070, 'one-before-green-light-either-party-can-terminate-clie-305', 'Before Green Light: Either party can terminate. Client pays only for design work completed (the Design & Engineering Fee) and any third party professional fees necessary for the project.', '', 4, 2069, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2071, 'one-after-green-light-client-is-fully-committed-to-the-310', 'After Green Light: Client is fully committed to the locked manufacturing price and refined site estimates. Termination after Green Light may result in significant financial obligations per Section 10.', '<p>For questions, reach out to the assigned Company project representative.</p>', 4, 2069, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2072, 'one-peace-of-mind-guarantee-315', 'Peace of Mind Guarantee', '<p>We understand that designing and building a new home is a major decision. That''s why this agreement is structured around clear milestones. At the end of each design milestone, at least until the phase called "Green Light Production Notice," the Client will have the option to continue, pause, or exit the process. Client will only be responsible for work completed up to that point - no hidden commitments, no pressure.</p>
<p>This ensures the Client stays in control throughout the process.</p>', 2, 2049, 80, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2073, 'one-recitals-320', 'RECITALS', '', 1, NULL, 50, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2074, 'one-company-is-engaged-in-the-business-of-coordinating-420', 'Company is engaged in the business of coordinating the design, manufacturing and installation of factory-built homes, also known as modular homes, on Client owned properties.', '', 2, 2073, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2075, 'one-company-will-engage-a-third-party-modular-home-man-425', 'Company will engage a third-party modular home manufacturer ("Manufacturer") to fabricate the Home(s) at the Manufacturer''s factory facility pursuant to a separate agreement between Company and Manufacturer. Client acknowledges that Manufacturer is not a party to this Agreement, and Client''s sole contractual relationship for factory production is with Company.', '', 2, 2073, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2076, 'one-if-company-managed-on-site-services-are-selected-u-430', 'If Company-Managed On-Site Services are selected under Recital G below, Company will engage qualified third-party contractors ("On-Site Contractors") to perform site work pursuant to separate agreements between Company and such contractors. Client acknowledges that On-Site Contractors are not parties to this Agreement, and Client''s sole contractual relationship for on-site services is with Company.', '', 2, 2073, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2077, 'one-client-owns-or-controls-certain-real-property-loca-435', 'Site Location', '<p>Client owns or controls certain real property located at {{DELIVERY_ADDRESS}} (the "Site”) on which Client intends to install one or more modular homes.</p>', 2, 2073, 30, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2078, 'one-whereas-client-desires-to-purchase-from-company-to-440', 'Project Scope', '<p>WHEREAS, Client desires to purchase from Company {{TOTAL_UNITS}} modular home unit(s) (individually, a ''Unit'' or ''Home''; collectively, the ''Units'' or ''Homes''), and Company may provide some or all of the services below:</p>', 2, 2073, 50, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2079, 'one-offsite-services-design-engineering-manufacturing--445', 'Offsite Services: Design, engineering, manufacturing (factory-related services)', '', 3, 2078, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2080, 'one-on-site-services-shipping-logistics-installation-s-450', 'On-Site Services: Shipping, logistics, installation, site construction, and related services', '<p>(The specific scope of Offsite Services and On-Site Services is detailed in Section 1.1); and</p>', 3, 2078, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2081, 'one-whereas-this-agreement-is-structured-to-accommodat-455', 'WHEREAS, this Agreement is structured to accommodate single-unit or multi-unit projects, whether for direct-to-consumer clients (''D2C Projects'') or business-to-business development partners (''B2B Projects''):', '', 3, 2073, 40, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2082, 'one-on-site-services-provider-460', 'On-Site Services Provider:', '<p>Client must select one of the following options for On-Site Services. This </p>
<p>election determines responsibilities, payment flows, and warranty provisions </p>
<p>throughout this Agreement.</p>
<p>{{BLOCK_ON_SITE_SCOPE_RECITALS}}</p>
<p>SELECTED OPTION: {{VAR_ON_SITE_SELECTION_NAME}}</p>
<p> {{CUSTOMER_ACKNOWLEDGE_TABLE}}</p>', 2, 2073, 60, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2083, 'one-whereas-the-total-preliminary-project-cost-is-prel-465', 'Preliminary Project Cost', '<p>WHEREAS, the total preliminary project cost is {{PRELIMINARY_CONTRACT_PRICE}}, which includes:</p>', 2, 2073, 70, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2084, 'one-design-and-engineering-designfee-470', 'Design and Engineering', '<p>{{DESIGN_FEE}}</p>', 2, 2083, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2085, 'one-offsite-services-preliminaryoffsiteprice-475', 'Offsite Services', '<p>{{PRELIMINARY_OFFSITE_PRICE}}</p>', 2, 2083, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2086, 'one-if-included-on-site-services-preliminaryonsitepric-480', 'On-Site Services (if included)', '<p>{{PRELIMINARY_ONSITE_PRICE}}</p>', 2, 2083, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2087, 'one-whereas-the-design-engineering-fee-allows-company--485', 'WHEREAS, the Design & Engineering Fee allows Company to perform site-specific design, engineering and cost estimation. At Green Light Production Notice, Client will receive final pricing. Manufacturing price will be LOCKED at Green Light, while on-site pricing may adjust based on actual site conditions discovered during construction. If final pricing makes the project unfeasible, Client may exit the Agreement per Section 10, having paid only the Design & Engineering Fee;', '<p>Peace of Mind Guarantee:</p>
<p>The Design & Engineering Fee allows Company to perform site-specific engineering and cost estimation. During the design process, preliminary estimates will be refined based on actual site conditions, design decisions, and permitting requirements. At Green Light Production Notice, Client will receive final pricing for manufacturing (locked) and refined site cost estimates. If final pricing makes the project unfeasible, Client may exit the Agreement in accordance with Section 10, having paid only for design work completed.</p>', 2, 2073, 80, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2088, 'one-final-pricing-established-at-green-light-490', 'Final Pricing (Established at Green Light):', '', 2, 2073, 90, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2089, 'one-off-site-services-price-becomes-fixed-and-locked-495', 'Off-Site Services price becomes fixed and locked', '', 2, 2088, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2090, 'one-on-site-price-estimate-if-included-is-refined-to-m-500', 'On-Site price estimate, if included, is refined to maximum accuracy', '<p>Client must approve final pricing to proceed to production. A detailed pricing breakdown and payment schedule is set forth in Exhibit A (Project Budget) and Exhibit C (Payment Schedule); and</p>
<p>        NOW, THEREFORE, in consideration of the foregoing and the mutual covenants and promises set forth herein, and for good and valuable consideration the receipt and sufficiency of which is hereby acknowledged, the Parties, intending to be legally bound, hereby agree as follows:</p>', 2, 2088, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2091, 'one-attachments-505', 'ATTACHMENTS', '', 1, NULL, 80, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2092, 'one-exhibit-a-project-budget-605', 'Exhibit A. Project Budget', '', 2, 2091, 605, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2093, 'one-exhibit-b-plans-and-specifications-drawing-set-and-610', 'Exhibit B. Plans and Specifications Drawing Set and the interior finishes for the Home', '', 2, 2091, 610, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2094, 'one-exhibit-c-payment-schedule-615', 'Exhibit C. Payment Schedule', '', 2, 2091, 615, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2095, 'one-exhibit-d-design-milestone-schedule-620', 'Exhibit D. Design Milestone Schedule', '', 2, 2091, 620, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2096, 'one-exhibit-e-limited-warranty-625', 'Exhibit E. Limited Warranty', '', 2, 2091, 625, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2097, 'one-exhibit-f-site-responsibility-matrix-requirements--630', 'Exhibit F. Site Responsibility Matrix & Requirements for Warranty Eligibility', '', 2, 2091, 630, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2098, 'one-exhibit-g-state-specific-provisions-635', 'Exhibit G. State-Specific Provisions', '', 2, 2091, 635, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2099, 'one-agreement-640', 'AGREEMENT', '', 1, NULL, 100, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2100, 'one-section-1-scope-of-services-740', 'Section 1. Scope of Services', '', 2, 2099, 740, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2101, 'one-overview-750', 'Overview', '<p>This Agreement covers services selected by Client, which are:</p>', 3, 2100, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2102, 'one-offsite-services-factory-related-755', 'Offsite Services (Factory-Related):', '', 3, 2101, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2103, 'one-design-phase-develop-design-engineering-and-permit-760', 'Design Phase: Develop design, engineering, and permitting necessary to define the modular home(s).', '', 3, 2102, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2104, 'one-production-phase-manufacture-assembly-and-factory--765', 'Production Phase: Manufacture, assembly, and factory completion of approved modular home(s).', '', 3, 2102, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2105, 'one-shipping-logistics-transportation-and-delivery-of--770', 'Shipping & Logistics: Transportation and delivery of completed modules to the Site.', '', 3, 2102, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2106, 'one-on-site-services-non-factory-775', 'On-Site Services (Non-Factory):', '<p>{{BLOCK_ON_SITE_SCOPE_1.1_B}}</p>', 3, 2101, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2107, 'one-design-phase-780', 'Design Phase', '<p>During this phase, Company will:</p>', 2, 2100, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2108, 'one-collaborate-with-client-to-finalize-the-design-and-785', 'Collaborate with Client to finalize the design and layout.', '', 2, 2107, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2109, 'one-provide-opinion-of-probable-cost-790', 'Provide opinion of Probable Cost', '', 2, 2107, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2110, 'one-incorporate-clients-selections-from-the-interior-f-795', 'Incorporate Client''s selections from the interior finishes.', '', 2, 2107, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2111, 'one-prepare-one-set-of-stamped-structural-and-mep-mech-800', 'Prepare one set of stamped structural and MEP (mechanical, electrical and plumbing) drawings to support permitting.', '', 2, 2107, 30, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2112, 'one-assist-with-local-jurisdiction-permitting-and-plan-805', 'Assist with local jurisdiction permitting and planning approvals.', '', 2, 2107, 40, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2113, 'one-submit-to-applicable-3rd-party-review-agency-810', 'Submit to applicable 3rd Party Review Agency', '', 2, 2107, 50, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2114, 'one-submit-plans-to-applicable-state-authority-for-mod-815', 'Submit plans to applicable state authority for modular approval', '', 2, 2107, 60, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2115, 'one-provide-a-detailed-cost-estimate-and-estimated-pro-820', 'Provide a detailed cost estimate and estimated production schedule.', '', 2, 2107, 70, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2116, 'one-if-applicable-coordinate-with-clients-general-cont-825', 'If applicable, coordinate with Client''s General Contractor regarding site requirements and scheduling.', '<p>This Design Phase includes:</p>', 2, 2107, 80, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2117, 'one-pre-design-and-feasibility-approx-1-week-830', 'Pre-Design and Feasibility (approx. 1 week):', '', 2, 2116, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2118, 'one-assess-site-conditions-utilities-and-local-permitt-835', 'Assess site conditions, utilities, and local permitting requirements to optimize modular design.', '', 2, 2117, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2119, 'one-market-and-program-development-approx-1-week--840', 'Market and Program Development (approx. 1 week) :', '', 2, 2116, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2120, 'one-define-project-goals-product-mix-and-features-with-845', 'Define project goals, product mix, and features with the Client.', '', 2, 2119, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2121, 'one-concept-and-schematic-design-approx-2-weeks-850', 'Concept and Schematic Design (approx. 2 weeks):', '', 2, 2116, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2122, 'one-prepare-preliminary-site-plans-and-layouts-in-coor-855', 'Prepare preliminary site plans and layouts in coordination with Client''s land planner and or civil engineers.', '', 2, 2121, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2123, 'one-design-documentation-2-4-months-860', 'Design Documentation (2-4 months):', '', 2, 2116, 30, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2124, 'one-produce-detailed-plans-and-specifications-ready-fo-865', 'Produce detailed plans and specifications ready for permitting and factory production.', '', 2, 2123, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2125, 'one-proof-of-clients-ownership-of-the-site-870', 'Company will only begin production after these "Green Light Conditions” below are met:', '<p>Proof of Client''s ownership of the site.</p>', 2, 2100, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2126, 'one-clients-approval-of-schematic-design-interior-fini-875', 'Client’s approval of schematic design, interior finishes, and Project Budget.', '', 2, 2125, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2127, 'one-hiring-a-licensed-general-contractor-and-submittin-880', 'Hiring a licensed General Contractor and submitting their scope and schedule.', '', 2, 2125, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2128, 'one-all-necessary-permits-are-issued-885', 'All necessary permits are issued.', '', 2, 2125, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2129, 'one-proof-of-funds-or-if-financing-a-bank-letter-with--890', 'Proof of Funds or if Financing a bank letter with direction to pay to Company', '', 2, 2125, 30, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2130, 'one-payment-of-the-green-light-production-notice-amoun-895', 'Payment of the Green Light Production Notice amount.', '<p>Once these conditions are satisfied, Company will issue a Green Light Production Notice to begin production including: a delivery schedule and pricing. From this point, the remaining Production Payment Schedule applies.</p>
<p>Before shipment of Client''s module(s), if Client hires their own On-Site Contractor, then Client''s Contractor must confirm that the foundation and utilities are complete and the site is ready to receive the home. Site readiness is detailed in Exhibit F.</p>', 2, 2125, 40, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2131, 'one-timing-dependencies-900', 'Timing Dependencies', '<p>Client acknowledges that the Milestone Schedule Exhibit D is the agreed upon target schedule and is time sensitive.  Delays in providing any Green Light deliverables, including final design approvals, permit submittals, site readiness documentation, or payment, may impact production and delay the start of manufacturing.</p>
<p>          Such delays may also impact pricing and delivery timelines due to production scheduling, supply chain fluctuations, and inflationary costs.</p>
<p>          Company will not be liable for delays or cost increases resulting from incomplete or late Green Light deliverables from the Client.</p>', 2, 2100, 30, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2132, 'one-production-phase-905', 'Production Phase', '<p>This phase includes manufacturing the module(s) for Client''s project and coordinating delivery. Key points include:</p>', 2, 2100, 40, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2133, 'one-production-begins-only-after-mutual-written-agreem-910', 'Production begins only after mutual written agreement and satisfaction of Green Light Conditions.', '', 2, 2132, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2134, 'one-company-will-provide-weekly-updates-on-production--915', 'Company will provide weekly updates on production progress and work in good faith to meet estimated delivery timelines; however delivery dates are not guaranteed and are subject to change.', '', 2, 2132, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2135, 'one-on-site-work-and-installation-refer-to-exhibit-f-920', 'On-Site Work and Installation (Refer to Exhibit F)', '<p>All On-Site Services shall be performed as specified in Client''s election under Recital G: either by Client''s retained General Contractor subject to Company approval, or by contractors engaged and managed by Company under this Agreement.</p>
<p>Detailed responsibilities and requirements for the Client and their chosen On-Site contractor are set forth in Exhibit F. Company will hold all On-Site Contractors to the same standards set out in Exhibit irrespective of who Client hires for On-Site Services.</p>
<p>{{BLOCK_ON_SITE_SCOPE_1.5}}</p>', 2, 2100, 50, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2136, 'one-custom-design-services-optional-925', 'Custom Design Services (Optional)', '<p>Company offers customizable  Design service that includes but is not limited to:</p>', 2, 2100, 60, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2137, 'one-interior-design-930', 'Interior design', '', 2, 2136, 0, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2138, 'one-furnishings-and-accessories-artwork-etc-935', 'Furnishings and accessories (artwork, etc.)', '', 2, 2136, 10, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2139, 'one-staging-940', 'Staging', '<p>Note: Any such optional service selected by the Client will be contracted for in a separate agreement and for an additional charge.             </p>', 2, 2136, 20, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2140, 'one-section-2-fees-purchase-price-and-payment-terms-945', 'Section 2. Fees, Purchase Price, and Payment Terms', '', 2, 2099, 945, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2141, 'one-design-engineering-fee-955', 'Design & Engineering Fee', '<p>The Design & Engineering Fee for this project is {{DESIGN_FEE}}, due upon execution of this Agreement. This fee is a condition precedent to the commencement of any work by Company.</p>
<p>The Design & Engineering Fee covers:</p>', 3, 2140, 955, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2142, 'one-site-specific-engineering-and-analysis-960', 'Site-specific engineering and analysis', '', 3, 2140, 960, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2143, 'one-architectural-mep-and-structural-design-developmen-965', 'Architectural, MEP and structural design development (excluding external professional/consultant fees)', '', 3, 2140, 965, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2144, 'one-cost-estimation-and-budget-refinement-970', 'Cost estimation and budget refinement', '', 3, 2140, 970, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2145, 'one-permitting-support-and-plan-preparation-975', 'Permitting support and plan preparation', '', 3, 2140, 975, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2146, 'one-up-to-designrevisionrounds-rounds-of-design-revisi-980', 'Design Revisions', '<p>Up to {{DESIGN_REVISION_ROUNDS}} rounds of design revisions</p><p>The Design & Engineering Fee EXCLUDES local jurisdiction application fees, local permit fees, professional (engineering, survey, geotechnical) fees  and travel expenses related to local submittals. These fees will be billed separately at actual cost and are due upon receipt of invoice.</p>
<p>Peace of Mind Guarantee: The Design & Engineering Fee is the only payment to Company required until Green Light Production Notice. If Client does not approve final pricing at Green Light, Client may terminate this Agreement per Section 10, having paid only the Design & Engineering Fee for work completed. The Design & Engineering Fee is non-refundable once work begins.</p>', 3, 2140, 980, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2147, 'one-custom-design-services-fee-optional-985', 'Custom Design Services Fee (Optional)', '<p>Compensation for Custom Design, Permitting, and Site Work Services (Section 1.6) will be billed at an hourly rate. Estimated fees will be provided upon request and updated periodically. Time will be recorded in 15-minute increments, with a minimum billing increment of 30 minutes per activity. Monthly invoices will reflect hours incurred.</p>', 3, 2140, 985, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2148, 'one-optional-design-services-will-only-be-performed-up-990', 'Optional Design Services will only be performed upon the Client''s prior written approval of the scope and estimated hours. No Optional Services will be provided without this pre-approval.', '', 3, 2140, 990, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2149, 'one-reimbursable-expenses-995', 'Reimbursable Expenses', '<p>Expenses reasonably incurred by Company for travel, printing, postage, local permit application fees, and local permit fees shall be itemized and reimbursed by the Client at Company''s cost plus fifteen (15) percent.</p>', 3, 2140, 995, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2150, 'one-total-preliminary-project-cost-1000', 'Total Preliminary Project Cost', '<p>TOTAL PRELIMINARY PROJECT COST (At Signing): {{PRELIMINARY_CONTRACT_PRICE}}</p>
<p>This represents the estimated total cost for the complete project, including:</p>
<p>{{PRICING_BREAKDOWN_TABLE}}</p>
<p>Note: The Design & Engineering Fee (Section 2.1) is separate from and in addition to the Total Contract Price.</p>', 3, 2140, 1000, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2151, 'one-pricing-structure-and-refinement-process-1005', 'Pricing Structure and Refinement Process:', '', 3, 2140, 1005, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2152, 'one-at-signing-client-receives-preliminary-estimates-b-1010', 'AT SIGNING: Client receives preliminary estimates based on initial project information and standard assumptions.', '', 3, 2140, 1010, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2153, 'one-during-design-engineering-phase-pricing-estimates--1015', 'DURING DESIGN & ENGINEERING PHASE: Pricing estimates are refined based on:', '', 3, 2140, 1015, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2154, 'one-actual-site-conditions-slopes-soil-utilities-acces-1020', 'Actual site conditions (slopes, soil, utilities, access)', '', 3, 2140, 1020, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2155, 'one-final-design-selections-and-specifications-1025', 'Final design selections and specifications', '', 3, 2140, 1025, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2156, 'one-permitting-requirements-and-jurisdictional-standar-1030', 'Permitting requirements and jurisdictional standards', '', 3, 2140, 1030, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2157, 'one-current-material-and-labor-market-conditions-1035', 'Current material and labor market conditions', '', 3, 2140, 1035, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2158, 'one-at-green-light-client-receives-final-pricing-1040', 'AT GREEN LIGHT: Client receives final pricing:', '', 3, 2140, 1040, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2159, 'one-offsite-services-manufacturing-locked-and-guarante-1045', 'Offsite Services (Manufacturing): LOCKED and guaranteed subject to respective clauses in Section 5, which are outside of Company''s control', '', 3, 2140, 1045, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2160, 'one-on-site-services-site-work-refined-estimate-subjec-1050', 'On-Site Services (Site Work): REFINED estimate (subject to change orders for unforeseen field conditions)', '', 3, 2140, 1050, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2161, 'one-client-approval-required-client-must-approve-final-1055', 'CLIENT APPROVAL REQUIRED: Client must approve final pricing to proceed to Production Phase. If Client does not approve, Client may terminate per Section 10.', '', 3, 2140, 1055, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2162, 'one-final-total-contract-price-at-green-light-finalcon-1060', 'FINAL TOTAL CONTRACT PRICE (At Green Light)', '<p>{{FINAL_CONTRACT_PRICE}}</p>', 3, 2140, 1060, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2163, 'one-any-revisions-to-pricing-after-green-light-shall-b-1065', 'Any revisions to pricing after Green Light shall be documented via written Change Order signed by both parties.', '<p>The prices provided are estimates as of the date this agreement was signed and are subject to change before final designs are completed. Fluctuations may occur due to material selection and design choices affecting overall cost. Additionally, price adjustments may be necessary due to unforeseen changes in supply chain costs, including but not limited to tariffs, commodity price fluctuations, product manufacturer price increases and transportation expenses, which are outside of Company''s direct control.</p>', 3, 2140, 1065, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2164, 'one-client-acknowledges-that-signing-this-agreement-se-1070', 'Client acknowledges that signing this Agreement secures design services only. The Production Price and On-Site Services costs are subject to adjustment. If any changes are made to the design, spec, or material changes due to permitting details and new information around site specific conditions.', '<p><br /><br />Any revisions to the Total Contract Price shall be documented and acknowledged by the Parties in a revised Project Budget (Exhibit A) or a written Change Order, which shall be incorporated into this Agreement by reference.</p>', 3, 2140, 1070, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2165, 'one-whats-not-included-in-this-agreement-1075', 'What’s Not Included in This Agreement', '<p>To ensure complete transparency, here’s a list of common services and costs <strong>not</strong> included in this agreement unless expressly stated otherwise:</p>', 3, 2140, 1075, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2166, 'one-local-permit-fees-and-municipal-approvals-1080', 'Local permit fees and municipal approvals', '', 3, 2140, 1080, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2167, 'one-specialty-equipment-such-as-expansion-tanks-second-1085', 'Specialty equipment such as expansion tanks, secondary fire systems, lift stations or anything not specifically included in Company standard package', '', 3, 2140, 1085, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2168, 'one-furniture-window-coverings-or-speciality-appliance-1090', 'Furniture, window coverings, or speciality appliance installation', '', 3, 2140, 1090, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2169, 'one-additional-landscaping-driveways-or-fencing-not-sp-1095', 'Additional Landscaping, driveways, or fencing not specified in the design package', '<p>On-Site Services will be completed as per Section 1.1.</p>', 3, 2140, 1095, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2170, 'one-change-orders-1100', 'Change Orders', '<p>Any increases in costs resulting from Client-requested changes, Client-caused delays or unforeseen site conditions will be added to the Total Contract Price via written Change Order with Client acknowledgment. </p>
<p>Company reserves the right to make certain substitutions of products of like for like.</p>', 3, 2140, 1100, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2171, 'one-payment-schedule-1105', 'Payment Schedule', '<p>{{PAYMENT_SCHEDULE_TABLE}}</p>
<p>The detailed, project-specific payment schedule is set forth in Exhibit C and may be adjusted based on the services selected and project structure.</p>
<p>Note: If On-Site Services are selected, those services will be provided by Company.</p>', 3, 2140, 1105, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2172, 'one-late-payments-and-collection-1110', 'Late Payments and Collection', '<p>Payments not received when due will accrue interest at 10% per annum or the maximum allowed by law. Company reserves the right to suspend work, delay delivery and pursue legal remedies for non-payment.</p>', 3, 2140, 1110, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2173, 'one-additional-reimbursable-expenses-1115', 'Additional Reimbursable Expenses', '<p>Client shall reimburse costs for site visits and reproduction of drawing sets without markup.</p>', 3, 2140, 1115, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2174, 'one-section-3-client-responsibilities-1120', 'Section 3. Client Responsibilities', '<p>The Client plays a critical role in the success of the project. The Client''s responsibilities include providing information, coordinating with contractors, and ensuring site readiness as outlined below. Should Client fail to provide timely site access or information, additional fees may apply.</p>', 2, 2099, 1120, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2175, 'one-project-information-and-coordination-1130', 'Project Information and Coordination', '<p>Client agrees to:</p>', 3, 2174, 1130, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2176, 'one-provide-timely-and-complete-information-about-proj-1135', 'Provide timely and complete information about project goals, design preferences, schedule constraints, space needs, and any special equipment or systems requirements. All required information must be provided prior to commencement of Milestone 1 in Exhibit D - “Milestone Schedule”', '', 3, 2174, 1135, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2177, 'one-supply-within-5-business-days-upon-companys-writte-1140', 'Supply, within 5 business days, upon Company''s written request, all available site information, including:', '', 3, 2174, 1140, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2178, 'one-surveys-describing-physical-characteristics-legal--1145', 'Surveys describing physical characteristics, legal boundaries, easements, and utility locations.', '', 3, 2174, 1145, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2179, 'one-reports-from-geotechnical-engineers-environmental--1150', 'Reports from geotechnical engineers, environmental consultants, or other specialists.', '', 3, 2174, 1150, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2180, 'one-results-from-any-required-tests-inspections-or-fea-1155', 'Results from any required tests, inspections, or feasibility studies.', '', 3, 2174, 1155, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2181, 'one-failure-to-supply-requested-information-within-the-1160', 'Failure to supply requested information within the required timeframes may result in delays to the schedule and any additional costs will be borne by the Client.', '<p>{{BLOCK_ON_SITE_SCOPE_3.1}}</p>', 3, 2174, 1160, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2182, 'one-access-to-site-1165', 'Access to Site', '<p>Client will provide Company and its representatives with reasonable access to the Site as needed to perform services. Client will also ensure that consultants and contractors grant Company access as required throughout the project.</p>', 3, 2174, 1165, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2183, 'one-legal-authority-and-site-control-1170', 'Legal Authority and Site Control', '<p>Before the Client''s modules are delivered to the Site, the Client must:</p>', 3, 2174, 1170, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2184, 'one-provide-proof-of-ownership-or-control-of-the-site--1175', 'Provide proof of ownership or control of the Site sufficient to authorize installation of the home.', '', 3, 2174, 1175, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2185, 'one-maintain-legal-authority-to-carry-out-all-required-1180', 'Maintain legal authority to carry out all required work through final payment.', '', 3, 2174, 1180, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2186, 'one-general-contractor-engagement-1185', 'General Contractor Engagement', '<p>{{BLOCK_ON_SITE_SCOPE_3.4}}</p>', 3, 2174, 1185, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2187, 'one-green-light-conditions-1190', 'Green Light Conditions', '<p>Client must:</p>', 3, 2174, 1190, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2188, 'one-ensure-all-green-light-conditions-described-in-sec-1195', 'Ensure all “Green Light Conditions” described in Section 1.2 are satisfied in a timely manner.', '', 3, 2174, 1195, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2189, 'one-maintain-those-conditionssuch-as-financing-permit--1200', 'Maintain those conditions—such as financing, permit approvals, and site control—through completion of delivery and payment of the Total Contract Price.', '<p>If the Client is using financing to pay the Total Contract Price, Client must:</p>', 3, 2174, 1200, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2190, 'one-enter-into-a-loan-agreement-with-a-lender-before-t-1205', 'Enter into a loan agreement with a lender before this Agreement is signed.', '', 3, 2174, 1205, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2191, 'one-satisfy-all-lender-requirements-necessary-to-fund--1210', 'Satisfy all lender requirements necessary to fund payments to Company on schedule.', '', 3, 2174, 1210, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2192, 'one-provide-letter-from-the-financial-institution-stat-1215', 'Provide letter from the financial institution stating funds are in place for the entire project and will be directed to Company as per the agreed payment schedule in Section 2.8.', '', 3, 2174, 1215, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2193, 'one-section-4-company-responsibilities-1220', 'Section 4. Company Responsibilities', '', 2, 2099, 1220, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2194, 'one-design-and-pre-production-services-as-per-section--1230', 'Design and Pre-Production Services as per Section 1.2', '<p>The scope of these services may be expanded only upon mutual written agreement pursuant to Section 1.6 (Optional and Custom Design Services).</p>', 3, 2193, 1230, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2195, 'one-production-services-1235', 'Production Services', '<p>Upon satisfaction of the Green Light Conditions described in Section 1.2 and issuance of the Green Light Production Notice, Company shall:</p>', 3, 2193, 1235, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2196, 'one-commence-production-of-the-homes-through-the-manuf-1240', 'Commence production of the Home(s) through the Manufacturer at the Manufacturer''s facility;', '', 3, 2193, 1240, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2197, 'one-oversee-and-manage-the-production-process-to-ensur-1245', 'Oversee and manage the production process to ensure compliance with the approved design, specifications, and quality standards.', '', 3, 2193, 1245, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2198, 'one-delivery-and-installation-services-1250', 'Delivery and Installation Services', '<p>Subject to Client''s compliance with site readiness requirements in Exhibit F and timely payments under Section 2, Company shall:</p>', 3, 2193, 1250, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2199, 'one-arrange-and-coordinate-transport-of-the-completed--1255', 'Arrange and coordinate transport of the completed modular units to the Site;', '', 3, 2193, 1255, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2200, 'one-coordinate-delivery-timing-with-clients-general-co-1260', 'Coordinate delivery timing with Client''s General Contractor (if Client-Retained) or with Company’s on-site contractors (if Company-Arranged Services);', '', 3, 2193, 1260, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2201, 'one-insurance-1265', 'Insurance', '<p>Company shall maintain in full force and effect throughout the term of this Agreement:</p>', 3, 2193, 1265, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2202, 'one-workers-compensation-insurance-in-accordance-with--1270', 'Workers’ compensation insurance in accordance with applicable state and federal law; and', '', 3, 2193, 1270, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2203, 'one-commercial-general-liability-insurance-with-limits-1275', 'Commercial General Liability Insurance with limits of no less than One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) in the aggregate.', '<p>Certificates of insurance shall be made available to Client upon written request.</p>', 3, 2193, 1275, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2204, 'one-section-5-project-schedule-and-delays-1280', 'Section 5. Project Schedule and Delays', '', 2, 2099, 1280, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2205, 'one-project-timeline-1290', 'Project Timeline', '<p>Company shall use commercially reasonable efforts to perform its obligations under this Agreement in accordance with the project schedule provided to Client during the Design Phase (the "Project Schedule"). The Project Schedule is an estimate only and is subject to adjustment based on permitting timelines, factory slot availability, weather, site readiness, material availability, and other contingencies outside of Company’s control. Client acknowledges that time is not of the essence unless otherwise agreed in writing by both parties.</p>', 3, 2204, 1290, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2206, 'one-preconditions-to-commencement-of-production-1295', 'Preconditions to Commencement of Production', '<p>Company shall not be obligated to commence factory production of the Home until all Green Light Conditions, as described in Section 1.2, have been fully satisfied, and both parties have executed the Green Light Production Notice. If such conditions are not met within the anticipated timeline, Company may adjust the Project Schedule accordingly, with notice to Client.</p>', 3, 2204, 1295, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2207, 'one-site-readiness-and-delivery-coordination-1300', 'Site Readiness and Delivery Coordination', '<p>{{BLOCK_ON_SITE_SCOPE_5.3}}</p>', 3, 2204, 1300, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2208, 'one-delay-events-1305', 'Delay Events', '<p>Neither Party shall be liable for any failure or delay in performance due to causes beyond its reasonable control, including but not limited to: acts of God, natural disasters, weather events, strikes or labor disputes, transportation disruptions, acts or omissions of governmental authorities, utility delays, supply chain disruptions, pandemics, or the failure of the other Party or its contractors to perform obligations in a timely manner (“Force Majeure Events”). In the event of a Force Majeure Event, the affected Party shall provide prompt written notice and the Project Schedule shall be equitably extended.</p>', 3, 2204, 1305, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2209, 'one-change-in-timeline-1310', 'Change in Timeline', '<p>Any material change to the Project Schedule, including a delay caused by Client''s change requests, failure to perform obligations, or other acts or omissions, shall be documented through a written Change Order in accordance with Section 2.5. Client acknowledges that changes may result in additional costs and/or delayed delivery and installation timelines. If a change in timeline results in increases to costs to the project, then such increases in costs shall be passed on to Client via written change order.</p>', 3, 2204, 1310, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2210, 'one-inflation-adjustment-clause-1315', 'Inflation Adjustment Clause:', '<p>If production is not initiated within 6 months of Agreement execution for reasons outside of Company’s control, Company reserves the right to adjust the Production Price to reflect market conditions, including inflation, material costs, and labor rates, with documentation provided.</p>', 3, 2204, 1315, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2211, 'one-section-6-limited-warranty-1320', 'Section 6. Limited Warranty', '', 2, 2099, 1320, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2212, 'one-state-specific-disclosure---projectstatepursuant-t-1330', 'State-Specific Disclosure', '<p><strong>[{{PROJECT_STATE}} STATE-SPECIFIC DISCLOSURE]</strong></p><p>PURSUANT TO {{PROJECT_STATE_CODE}}, THIS SECTION CHANGES YOUR EXISTING WARRANTY RIGHTS UNDER {{PROJECT_STATE}} LAW, AND REPLACES CERTAIN EXISTING WARRANTIES WITH A LIMITED WARRANTY.</p>', 3, 2211, 1330, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2213, 'one-exclusive-warranty-disclaimer-of-implied-warrantie-1335', 'Exclusive Warranty; Disclaimer of Implied Warranties', '<p>Except as expressly set forth in Exhibit E, Company makes no other warranties, express or implied. To the maximum extent permitted by law:</p>', 3, 2211, 1335, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2214, 'one-all-implied-warranties-including-any-warranty-of-m-1340', 'All implied warranties, including any warranty of merchantability, fitness for a particular purpose, or habitability, are hereby disclaimed. Client acknowledges that the Limited Warranty provides the exclusive remedy for any defect or failure relating to the Home.', '', 3, 2211, 1340, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2215, 'one-if-you-have-read-understand-and-agree-to-this-para-1345', 'If you have read, understand, and agree to this paragraph, please initial here: _____', '', 3, 2211, 1345, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2216, 'one-limited-warranty-coverage-1350', 'Limited Warranty Coverage', '<p>Company shall provide Client with a limited warranty for the Home as further described in Exhibit E (Limited Warranty). Subject to the terms and conditions in Exhibit E, Company warrants that:</p>', 3, 2211, 1350, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2217, 'one-for-a-period-of-two-2-years-from-the-date-the-home-1355', 'For a period of two (2) years from the date the Home leaves the factory (“Fit and Finish Warranty Period”), the Home shall be free from material defects in materials and workmanship in its interior and exterior finishes;', '', 3, 2211, 1355, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2218, 'one-for-a-period-of-five-5-years-from-the-date-the-hom-1360', 'For a period of five (5) years from the date the Home leaves the factory (“Envelope Warranty Period”), the Home’s building envelope (as defined in Exhibit E) shall remain free from water intrusion or structural separation due to defective materials or workmanship;', '', 3, 2211, 1360, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2219, 'one-for-a-period-of-ten-10-years-from-the-date-the-hom-1365', 'For a period of ten (10) years from the date the Home leaves the factory (“Structural Warranty Period”), the Home shall remain free from material structural defects (as defined in Exhibit E).', '', 3, 2211, 1365, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2220, 'one-if-you-have-read-understand-and-agree-to-this-para-1370', 'If you have read, understand, and agree to this paragraph, please initial here: _____', '', 3, 2211, 1370, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2221, 'one-other-affirmations-replaced-1375', 'Other Affirmations Replaced', '', 3, 2211, 1375, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2222, 'one-statedisclosurewarrantyexclusivity-1380', '[STATE_DISCLOSURE:{WARRANTY_EXCLUSIVITY}]', '<p>The provisions of paragraphs 6.1 and 6.2 of this section, along with Exhibit E, replace any and all other affirmations or representations of fact contained anywhere else within this document, notwithstanding anything to the contrary set forth in {{PROJECT_STATE_CODE}},Cal. Com. Code § 2316.  The Limited Warranty described in this Section and in Exhibit E is the sole and exclusive warranty available.</p>', 3, 2211, 1380, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2223, 'one-if-you-have-read-understand-and-agree-to-this-para-1385', 'If you have read, understand, and agree to this paragraph, please initial here: ____', '', 3, 2211, 1385, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2224, 'one-pass-through-manufacturer-warranties-1390', 'Pass-Through Manufacturer Warranties', '<p>Company shall assign and pass through to Client any warranties provided by manufacturers of appliances, fixtures, and equipment originally supplied with the Home. These third-party manufacturer warranties are the sole and exclusive remedy for any covered defect in such components.</p>', 3, 2211, 1390, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2225, 'one-exclusion-of-consequential-and-incidental-damages-1395', 'Exclusion of Consequential and Incidental Damages', '<p>To the fullest extent permitted by law, Company shall not be liable for incidental, special, indirect, punitive, or consequential damages, including but not limited to loss of use, lost profits, or cost of temporary housing, arising from any defect in the Home or any breach of this Agreement, regardless of the legal theory asserted.</p>', 3, 2211, 1395, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2226, 'one-claims-process-and-limitation-1400', 'Claims Process and Limitation', '<p>All warranty claims must be made in writing within the applicable warranty period, and in accordance with the notice and inspection procedures set forth in Exhibit F. No coverage exists for any claim submitted after the expiration of the applicable warranty period.</p>', 3, 2211, 1400, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2227, 'one-section-7-intellectual-property-copyrights-and-lic-1405', 'Section 7. Intellectual Property, Copyrights, and Licenses; Publicity', '', 2, 2099, 1405, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2228, 'one-ownership-of-work-product-1415', 'Ownership of Work Product.', '<p>Company shall be deemed the sole author and owner of all drawings, plans, specifications, and other deliverables (collectively, the “Work Product”) produced under this Agreement, and shall retain all common law, statutory, and other reserved rights, including copyrights and proprietary interests.</p>', 3, 2227, 1415, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2229, 'one-license-to-use-work-product-1420', 'License to Use Work Product.', '<p>Upon execution of this Agreement, Company grants Client a nonexclusive, nontransferable license to use the Work Product solely and exclusively for purposes of constructing, using, maintaining, altering, and adding to the Project, provided Client substantially performs its obligations under this Agreement, including prompt payment of all amounts owed when due. This license permits Client to authorize its contractors, consultants, and vendors to reproduce applicable portions of the Work Product solely and exclusively for performing services related to the Home. The license granted hereunder shall automatically terminate if Company terminates this Agreement pursuant to Section 10.</p>', 3, 2227, 1420, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2230, 'one-restrictions-on-use-1425', 'Restrictions on Use.', '<p>Except as expressly granted herein, no other license or rights shall be implied or granted to Client. Client shall not assign, sublicense, delegate, pledge, or otherwise transfer any license or rights granted without Company''s prior written consent. Any unauthorized use of the Work Product shall be at Client''s sole risk and without liability to Company or its agents, owners, contractors, or employees.</p>', 3, 2227, 1425, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2231, 'one-indemnification-regarding-work-product-use-1430', 'Indemnification Regarding Work Product Use.', '<p>If Client uses the Work Product without retaining Company, Client releases and agrees to indemnify, defend, and hold harmless Company and its agents, owners, contractors, and employees from all claims, damages, liabilities, losses, costs, and expenses (including attorney fees) arising out of such unauthorized use to the fullest extent permitted by law.</p>', 3, 2227, 1430, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2232, 'one-publicity-rights-1435', 'Publicity Rights.', '<p>Client grants Company the unrestricted right to photograph and use images of the Home and Site in advertising and promotional materials solely for Company’s benefit, without any royalty or payment obligations to Client. Company agrees to obtain Client’s prior written consent before publicly disclosing the specific location or address of the Home. Client shall provide reasonable access to the Home and Site for such purposes at mutually agreed times.</p>', 3, 2227, 1435, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2233, 'one-section-8-limitation-of-liability-and-exclusion-of-1440', 'Section 8. Limitation of Liability and Exclusion of Consequential Damages', '', 2, 2099, 1440, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2234, 'one-damages-1450', 'Damages', '<p>Except as expressly provided, neither party shall be liable to the other for consequential, incidental, punitive, indirect, or special damages, regardless of the legal theory asserted, even if advised of the possibility of such damages.<br /></p>', 3, 2233, 1450, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2235, 'one-liability-1455', 'Liability', '<p>Company’s total liability for claims arising under this Agreement, whether in contract, tort, or otherwise, shall be limited to the total fees paid by Client hereunder. This limitation shall not apply to claims arising from fraud, gross negligence, or willful misconduct by Company, nor to insured claims.</p>', 3, 2233, 1455, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2236, 'one-section-9-no-obligation-to-purchase-or-sell-milest-1460', 'Section 9. No Obligation to Purchase or Sell; Milestone Review and Approval', '', 2, 2099, 1460, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2237, 'one-scope-and-milestones-1470', 'Scope and Milestones.', '<p>The Services under this Agreement consist of design, engineering, and production of the Home as described in Section 1. The process shall proceed through defined milestones including but not limited to:</p>', 3, 2236, 1470, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2238, 'one-mid-design-price-review-1475', 'Mid Design Price Review', '', 3, 2236, 1475, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2239, 'one-final-design-approval-and-green-light-production-n-1480', 'Final Design Approval and Green Light Production Notice', '', 3, 2236, 1480, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2240, 'one-fabrication-and-assembly-1485', 'Fabrication and Assembly', '', 3, 2236, 1485, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2241, 'one-milestone-review-and-approval-1490', 'Milestone Review and Approval.', '<p>At the completion of each milestone, Company shall present deliverables and status reports to Client for review. Client shall have a reasonable period (not less than ten (10) business days) to approve, request revisions, or reject the milestone deliverables.</p>', 3, 2236, 1490, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2242, 'one-no-obligation-to-purchase-or-continue-1495', 'No Obligation to Purchase or Continue.', '<p>Client is under no obligation to purchase the Home or continue to the next milestones of Services unless Client signs off on milestone approval. Similarly, Company is under no obligation to proceed beyond any milestone without Client''s written approval and fulfillment of payment or other required conditions.</p>', 3, 2236, 1495, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2243, 'one-termination-or-out-option-at-each-milestone-1500', 'Termination or “Out” Option at Each Milestone.', '<p>If Client chooses not to approve the milestone deliverables or to continue, Client may terminate this Agreement in accordance with Section 10 by providing written notice within the review period. Company may also terminate or suspend the Agreement at any milestone if Client fails to timely approve, pay, or meet conditions necessary for the next milestone.</p>', 3, 2236, 1500, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2244, 'one-effect-of-termination-at-milestone-1505', 'Effect of Termination at Milestone.', '<p>If terminated at or before any milestone, Client shall pay for all Services performed and costs incurred by Company up to the effective date of termination, as invoiced and payable within ten (10) days. Upon such termination, Client shall have no rights to any Work Product developed beyond the last approved milestone.</p>', 3, 2236, 1505, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2245, 'one-section-10-termination-and-milestone-exit-rights-1510', 'Section 10. Termination and Milestone Exit Rights', '', 2, 2099, 1510, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2246, 'one-termination-by-either-party-at-milestones-1520', 'Termination by Either Party at Milestones.', '<p>Either party may terminate this Agreement at the completion of any milestone by providing written notice to the other party within the milestone review period. Termination shall be effective ten (10) days after notice, unless otherwise agreed.</p>', 3, 2245, 1520, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2247, 'one-termination-for-cause-or-payment-default-1525', 'Termination for Cause or Payment Default.', '<p>In addition to milestone termination rights, either party may terminate this Agreement for cause as detailed in Section 12, including Client’s Payment Default or material breach, with applicable cure periods.</p>', 3, 2245, 1525, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2248, 'one-permitting-delay-exit-clause-1530', 'Permitting Delay Exit Clause:', '<p>If required permits are not obtained within 4 months of submittal due to circumstances outside Company’s control, Company may terminate this Agreement with 10 days'' written notice. In such cases, Client shall pay for services rendered to date, and Company shall retain ownership of all Work Product developed.</p>', 3, 2245, 1530, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2249, 'one-effect-of-termination-1535', 'Effect of Termination.', '<p>Termination shall not relieve Client of payment obligations for Services performed or costs incurred through the effective date of termination, which shall be invoiced and payable within ten (10) days.</p>', 3, 2245, 1535, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2250, 'one-termination-for-client-convenience-1540', 'Termination for Client Convenience.', '', 3, 2245, 1540, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2251, 'one-state-specific-disclosure---projectstatepursuant-t-1545', 'State-Specific Disclosure', '<p><strong>[{{PROJECT_STATE}} STATE-SPECIFIC DISCLOSURE]</strong></p><p>PURSUANT TO {{PROJECT_STATE_CODE}}, THIS SECTION CHANGES YOUR EXISTING WARRANTY RIGHTS UNDER {{PROJECT_STATE}} LAW. PLEASE READ THE ENTIRE SECTION CAREFULLY AND INITIAL WHERE INDICATED AFTER READING ONLY IF YOU AGREE.</p><p>If Client elects to terminate for convenience at or between milestones, Client shall pay all amounts due for Services rendered and reasonable costs incurred by Company through the termination date. In such cases, Client shall purchase the Home ''as is'' (as that term is defined under {{PROJECT_STATE}} law) if production has commenced, and Company''s Limited Warranty shall be void to the fullest extent permitted by law, notwithstanding any other clause or paragraph in this document.</p>', 3, 2245, 1545, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2252, 'one-if-you-have-read-understand-and-agree-to-this-para-1550', 'If you have read, understand, and agree to this paragraph, please initial here: _____', '', 3, 2245, 1550, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2253, 'one-suspension-of-work-1555', 'Suspension of Work.', '<p>Company may suspend performance if Client fails to timely approve milestone deliverables, meet conditions, or pay amounts due. If suspension continues for more than thirty (30) days without cure, Company may terminate the Agreement pursuant to Section 12.</p>', 3, 2245, 1555, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2254, 'one-section-11-stepped-dispute-resolution-1560', 'Section 11. Stepped Dispute Resolution', '', 2, 2099, 1560, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2255, 'one-mandatory-mediation-1570', 'Mandatory Mediation', '<p>In the event of a dispute arising out of or relating to this Agreement or the services to be rendered hereunder, prior to the initiation of any legal proceedings, the Client and Company agree to attempt to resolve such disputes through direct negotiations between the appropriate representatives of each party.  If such negotiations are not fully successful, the parties agree to attempt to resolve any remaining dispute by formal non-binding mediation conducted in accordance with rules and procedures to be agreed upon by the parties.</p>', 3, 2254, 1570, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2256, 'one-arbitration-demand-and-limitations-1575', 'Arbitration Demand and Limitations.', '<p>All disputes, claims, or breaches arising under this Agreement, including warranty claims, shall be resolved exclusively by arbitration in Delaware, under its Delaware Rapid Arbitration Act (DRAA).</p>
<p>Arbitration must be initiated in writing within six (6) months after the cause of action accrues or the warranty period expires, whichever is shorter, or the claim is barred.</p>', 3, 2254, 1575, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2257, 'one-no-third-party-joinder-1580', 'No Third-Party Joinder.', '<p>No third party may be joined in the arbitration without mutual written consent.</p>', 3, 2254, 1580, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2258, 'one-enforcement-and-judgment-1585', 'Enforcement and Judgment.', '<p>The arbitration award shall be final and binding, and judgment on the award may be entered in any court of competent jurisdiction.</p>', 3, 2254, 1585, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2259, 'one-if-you-have-read-understand-and-agree-to-paragraph-1590', 'If you have read, understand, and agree to paragraphs 11.1 through 11.4, please initial here: ____', '', 3, 2254, 1590, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2260, 'one-section-12-default-1595', 'Section 12. Default', '', 2, 2099, 1595, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2261, 'one-payment-default-1605', 'Payment Default.', '<p>Client’s failure to pay any amount due under this Agreement when due shall constitute a Payment Default. If Client does not cure the Payment Default within five (5) days of written notice, Company may suspend performance and/or terminate this Agreement.</p>', 3, 2260, 1605, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2262, 'one-material-breach-1610', 'Material Breach.', '<p>Other material breaches by Client (including failure to meet funding or production conditions) not cured within five (5) days of written notice shall entitle Company to suspend performance and/or terminate this Agreement.</p>', 3, 2260, 1610, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2263, 'one-rights-upon-termination-1615', 'Rights upon Termination.', '<p>Upon termination for default, Company may retain all payments made and pursue all legal and equitable remedies.</p>', 3, 2260, 1615, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2264, 'one-section-13-miscellaneous-provisions-1620', 'Section 13. Miscellaneous Provisions', '', 2, 2099, 1620, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2265, 'one-governing-law-and-venue-1630', 'Governing Law and Venue.', '<p>This Agreement shall be governed by the laws of the State of {{PROJECT_STATE}}, without regard to conflict of law principles. All disputes shall be brought exclusively in the courts located in {{PROJECT_COUNTY}} County, {{PROJECT_STATE}}, or the U.S. District Court for the {{PROJECT_FEDERAL_DISTRICT}}, to which the parties hereby submit.</p>', 3, 2264, 1630, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2266, 'one-entire-agreement-amendments-1635', 'Entire Agreement; Amendments.', '<p>This Agreement constitutes the entire understanding between the parties and supersedes prior agreements. Any amendments must be in writing and signed by both parties.</p>', 3, 2264, 1635, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2267, 'one-assignment-1640', 'Assignment.', '<p>Neither party may assign this Agreement without prior written consent of the other, except that Company may assign to an affiliate or successor without Client’s consent.</p>', 3, 2264, 1640, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2268, 'one-no-third-party-beneficiaries-1645', 'No Third-Party Beneficiaries.', '<p>No third parties shall have any rights under this Agreement.</p>', 3, 2264, 1645, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2269, 'one-notices-1650', 'Notices.', '<p>All notices shall be in writing and deemed effective upon: (i) personal delivery, (ii) two (2) business days after deposit with a national overnight courier, or (iii) verified email receipt, to the addresses set forth above or as updated by written notice.</p>', 3, 2264, 1650, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2270, 'one-force-majeure-1655', 'Force Majeure.', '<p>Neither party shall be liable for delays or failures due to causes beyond reasonable control, including acts of God, war, terrorism, government actions, labor disputes, epidemics, or other unforeseeable events. If such events continue for an extended period making performance impracticable, either party may terminate with ten (10) days’ notice.</p>', 3, 2264, 1655, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2271, 'one-expanded-force-majeure-coverage-1660', 'Expanded Force Majeure Coverage', '<p>In addition to acts of God, natural disasters, labor strikes, and government actions, the following events shall also be deemed force majeure and relieve Company of performance obligations during their duration:</p>', 3, 2264, 1660, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2272, 'one-factory-production-slot-delays-or-plant-closures-d-1665', 'Factory production slot delays or plant closures due to external conditions', '', 3, 2264, 1665, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2273, 'one-module-transportation-restrictions-or-unavailabili-1670', 'Module transportation restrictions or unavailability of specialized carriers', '', 3, 2264, 1670, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2274, 'one-permit-delays-beyond-companys-control-caused-by-mu-1675', 'Permit delays beyond Company’s control caused by municipal backlogs or rule changes', '', 3, 2264, 1675, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2275, 'one-supply-chain-disruptions-that-materially-affect-co-1680', 'Supply chain disruptions that materially affect cost or timeline', '<p>Company will notify Client as soon as practicable of any such event and will work in good faith to minimize resulting delays.</p>', 3, 2264, 1680, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2276, 'one-counterparts-electronic-signatures-1685', 'Counterparts; Electronic Signatures.', '<p>This Agreement may be executed in counterparts and by electronic transmission, each of which shall be deemed an original.</p>', 3, 2264, 1685, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2277, 'one-state-specific-provisions-1690', 'State-Specific Provisions', '<p>This Agreement is subject to state-specific legal requirements as set forth in Exhibit H (State-Specific Provisions). The provisions of Exhibit H for {{PROJECT_STATE}} are incorporated into this Agreement and control in the event of any conflict with other provisions herein. Company and Client acknowledge that:</p>', 3, 2264, 1690, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2278, 'one-projectstate-law-governs-this-agreement-1695', 'Governing Law', '<p>{{PROJECT_STATE}} law governs this Agreement</p>', 3, 2264, 1695, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2279, 'one-all-work-must-comply-with-projectstate-building-co-1700', 'Building Code Compliance', '<p>All work must comply with {{PROJECT_STATE}} building codes ({{BUILDING_CODE_REFERENCE}})</p>', 3, 2264, 1700, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2280, 'one-company-must-comply-with-projectstate-contractor-l-1705', 'Contractor Licensing', '<p>Company must comply with {{PROJECT_STATE}} contractor licensing requirements</p>', 3, 2264, 1705, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2281, 'one-company-must-comply-with-projectstate-mechanics-li-1710', 'Mechanics Lien Law', '<p>Company must comply with {{PROJECT_STATE}} mechanic''s lien law provisions</p>', 3, 2264, 1710, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2282, 'one-all-permits-and-inspections-must-comply-with-proje-1715', 'Permit Compliance', '<p>All permits and inspections must comply with {{PROJECT_STATE}} requirements</p>', 3, 2264, 1715, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2283, 'one-dispute-resolution-procedures-follow-projectstate--1720', 'Dispute Resolution', '<p>Dispute resolution procedures follow {{PROJECT_STATE}} law</p><p>Client acknowledges receipt of Exhibit G and has had the opportunity to review the state-specific provisions applicable to {{PROJECT_STATE}} before executing this Agreement.</p>
<p>IN WITNESS WHEREOF, the parties have executed this Design Services Agreement as of the date first set forth above.</p>
', 3, 2264, 1720, '["ONE"]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2845, 'MASTER_EF_PREAMBLE', 'MASTER PURCHASE AGREEMENT', '<p>This Master Factory Built Home Purchase Agreement (this "Agreement") is entered into as of {{EFFECTIVE_DATE}} (the "Effective Date") by and between {{DVELE_PARTNERS_XYZ_LEGAL_NAME}}, a {{DVELE_PARTNERS_XYZ_STATE}} {{DVELE_PARTNERS_XYZ_ENTITY_TYPE}} ("Company"), and {{CLIENT_LEGAL_NAME}}, a {{CLIENT_STATE}} {{CLIENT_ENTITY_TYPE}} ("Client"). Company and Client may be referred to individually as a "Party" and collectively as the "Parties."</p>', 1, NULL, 0, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2846, 'MASTER_EF_RECITALS', 'RECITALS', '', 1, NULL, 15, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2847, 'MASTER_EF_AGREEMENT_CONSTRUCTION', 'AGREEMENT CONSTRUCTION', '', 1, NULL, 30, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2848, 'MASTER_EF_SERVICES_SCOPE', 'SERVICES; SCOPE; CHANGE CONTROL', '', 1, NULL, 60, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2849, 'FEES_PAYMENT_SECTION', 'FEES; PAYMENT; FINANCEABILITY', '', 1, NULL, 70, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2850, 'MASTER_EF_CLIENT_RESPONSIBILITIES', 'CLIENT RESPONSIBILITIES', '', 1, NULL, 90, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2851, 'MASTER_EF_COMPANY_RESPONSIBILITIES', 'COMPANY RESPONSIBILITIES; INSURANCE', '', 1, NULL, 110, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2852, 'MASTER_EF_SCHEDULE_DELAYS', 'SCHEDULE; DELAYS; FORCE MAJEURE; PRICING ADJUSTMENTS', '', 1, NULL, 120, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2853, 'MASTER_EF_WARRANTY', 'LIMITED WARRANTY; DISCLAIMER; REMEDIES', '', 1, NULL, 130, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2854, 'MASTER_EF_IP', 'INTELLECTUAL PROPERTY; LICENSE; PUBLICITY', '', 1, NULL, 140, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2855, 'MASTER_EF_LIABILITY', 'LIMITATION OF LIABILITY', '', 1, NULL, 150, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2856, 'MASTER_EF_MILESTONE_REVIEW', 'MILESTONE REVIEW; NO OBLIGATION; CLARIFICATION', '', 1, NULL, 160, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2857, 'MASTER_EF_DEFAULT_TERMINATION', 'DEFAULT; TERMINATION; EFFECTS', '', 1, NULL, 170, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2858, 'MASTER_EF_DISPUTE_RESOLUTION', 'DISPUTE RESOLUTION; GOVERNING LAW', '', 1, NULL, 180, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2859, 'MASTER_EF_MISCELLANEOUS', 'MISCELLANEOUS', '', 1, NULL, 190, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2860, 'MASTER_EF_SIGNATURES', 'SIGNATURES; COUNTERPARTS; AUTHORITY', '<p>IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date first written above. This Agreement may be executed in counterparts, each of which shall be deemed an original. Signatures delivered by electronic transmission shall be deemed original signatures.</p>

{{TABLE_SIGNATURE_SECTION14}}', 1, NULL, 200, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2861, 'MASTER_EF_RECITAL_1', 'Recital 1', '<p>WHEREAS, Company designs and manufactures factory-built housing components and modular homes and may provide delivery, assembly, installation support, and/or completion services described on Exhibit A (hereinafter "Services") as agreed.</p>', 2, 2846, 16, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2862, 'MASTER_EF_RECITAL_2', 'Recital 2', '<p>WHEREAS, Client owns or controls or will own or control, prior to delivery, the real property identified in Exhibit A (each, a "Site") and has or will obtain the authority necessary for delivery, installation, and completion of one or more factory built homes thereon.</p>', 2, 2846, 17, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2863, 'MASTER_EF_RECITAL_3', 'Recital 3', '<p>WHEREAS, Client desires to engage Company to provide certain Services for one or more properties and/or phases as more fully described in Exhibit A.</p>', 2, 2846, 18, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2864, 'MASTER_EF_RECITAL_THEREFORE', '', '<p>NOW, THEREFORE, for good and valuable consideration, the Parties agree as follows:</p>', 5, 2846, 19, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2865, 'MASTER_EF_EXHIBITS_INCORPORATED', 'Exhibits Incorporated', '<p>The following exhibits are attached to and incorporated into this Agreement:</p>', 2, 2847, 310, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2866, 'MASTER_EF_EXHIBIT_FIRST', 'Exhibit-First Structure', '<p>All project- and customer-specific descriptions and commercial terms are set forth in Exhibit A and related technical/operational Exhibits. No Services commence unless an Exhibit A is executed by both Parties.</p>', 2, 2847, 320, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2867, 'MASTER_EF_ORDER_PRECEDENCE', 'Order of Precedence', '<p>If there is any conflict:</p>', 2, 2847, 330, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2868, 'MASTER_EF_MULTIPLE_PROJECTS', 'Multiple Projects / Multiple Exhibit As', '<p>The Parties may execute one or more Exhibits A under this Agreement. Each Exhibit A constitutes a separate project engagement governed by this Agreement. Termination or completion of one Exhibit A does not affect others unless expressly stated.</p>', 2, 2847, 340, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2869, 'MASTER_EF_SERVICES', 'Services', '<p>Company will provide the services described in Exhibit A (the "Services"), including, as applicable, design/engineering coordination, factory manufacturing, production management, delivery coordination, on-site assembly/installation support, and/or completion services as allocated in Exhibit C.</p>', 2, 2848, 410, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2870, 'MASTER_EF_COMPLETION_MODEL', 'Completion Model; Separation of Responsibility', '<p>Completion responsibility is elected in Exhibit A and allocated in Exhibit C.</p>', 2, 2848, 420, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2871, 'MASTER_EF_CHANGE_ORDERS', 'Change Orders; Substitutions', '', 2, 2848, 430, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2872, 'MASTER_EF_NOT_INCLUDED', 'What is Not Included', '<p>Unless expressly included in Exhibit A (or a Change Order), Company does not provide: local permit fees, utility connection fees, specialty equipment not specified in Exhibit B, site landscaping/driveways/fencing, owner furnishings/window coverings, or other site work allocated to Client/GC in Exhibit C.</p>', 2, 2848, 440, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2873, 'MASTER_EF_PRICING_PAYMENT', 'Pricing and Payment Schedule', '<p>All fees, purchase price, milestone payments, deposits, reimbursements, and payment timing are set forth in Exhibit A.</p>', 2, 2849, 510, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2874, 'MASTER_EF_GREEN_LIGHT', 'Green Light Conditions; Green Light Production Notice', '<p>Where applicable, production begins only after satisfaction of the Green Light Conditions stated in Exhibit A (including design approvals, proof of site control, GC readiness as applicable, proof of funds/financing, and required deposits). Upon satisfaction, Company will issue a written Green Light Production Notice confirming production commencement and the applicable production slot.</p>', 2, 2849, 520, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2875, 'MASTER_EF_MILESTONE_CERT', 'Milestone Certification; Deemed Acceptance', '<p>Company will certify milestone completion in writing (email acceptable). Client has five (5) business days to object in writing specifying material non-conformity. Failure to object within that period constitutes acceptance of the milestone for all purposes, including payment.</p>', 2, 2849, 530, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2876, 'IRREVOCABLE_PAYMENT', 'Irrevocable Payment Obligation After Green Light', '<p>Upon issuance of the Green Light Production Notice, Client''s obligation to pay the Production Price and milestone payments is absolute, unconditional, and irrevocable, subject only to Company''s uncured material failure to perform its obligations for the applicable milestone(s).</p>', 2, 2849, 540, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2877, 'NO_SETOFF', 'No Setoff / No Counterclaim', '<p>Client waives any right of setoff, deduction, counterclaim, abatement, or withholding against amounts due, except to the extent arising from Company''s uncured material breach.</p>', 2, 2849, 550, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2878, 'MASTER_EF_REIMBURSABLES', 'Reimbursables', '<p>Unless otherwise stated in Exhibit A, reimbursable out-of-pocket expenses (e.g., travel, shipping premiums, printing, third-party review agency fees) are reimbursed at actual cost, with any administrative fee only if expressly stated in Exhibit A.</p>', 2, 2849, 560, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2879, 'MASTER_EF_LATE_PAYMENTS', 'Late Payments; Suspension', '<p>Late payments accrue interest at 1.5% per month (or the maximum allowed by law). If Client fails to pay amounts due, Company may suspend work and adjust schedule until payments are current. Storage, re-handling, and remobilization costs caused by Client delays are payable by Client.</p>', 2, 2849, 570, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2880, 'ASSIGNMENT_FINANCING', 'Assignment; Financing; Payment Directions', '<p>Client acknowledges Company may assign, pledge, sell, or grant a security interest in this Agreement, any Exhibit A, and any payment obligations/receivables to one or more financing parties (warehouse, receivables purchase, or project financing). Client consents to such actions without further consent. Client agrees to follow written payment instructions after notice of assignment. No assignment relieves Company of performance obligations.</p>', 2, 2849, 580, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2881, 'FINANCING_PARTY_CURE', 'Financing Party Cure Rights (Non-Operator)', '<p>Upon Client default, Company shall permit any financing party holding an assignment/security interest to cure payment defaults within the applicable cure period. No financing party is obligated to perform Client''s non-payment obligations and shall not be deemed an owner, contractor, or GC.</p>', 2, 2849, 590, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2882, 'MASTER_EF_CLIENT_GENERAL', 'General', '<p>Client''s timely performance is critical. Client will perform the responsibilities allocated to Client in Exhibit C, including site access, site readiness, GC coordination (if applicable), and timely approvals.</p>', 2, 2850, 610, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2883, 'MASTER_EF_SITE_INFO', 'Site Information; Surveys; Reports', '<p>Upon request, Client shall provide available site information (surveys, easements, utility locations, geotech/environmental reports, tests). Failure to timely provide information may delay schedule and increase costs, which will be addressed via Change Order.</p>', 2, 2850, 620, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2884, 'MASTER_EF_SITE_CONTROL', 'Site Control; Authority', '<p>Before delivery, Client shall provide proof of ownership/control sufficient to authorize installation and completion and maintain such authority through final payment.</p>', 2, 2850, 630, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2885, 'MASTER_EF_GC_ENGAGEMENT', 'GC Engagement (Client GC Completion Model)', '<p>If Client GC Completion Model is elected, Client will engage a licensed GC meeting the minimum requirements of Exhibit C and any warranty-eligibility requirements in Exhibit E/Exhibit F as applicable.</p>', 2, 2850, 640, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2886, 'MASTER_EF_DESIGN_PREPROD', 'Design / Pre-Production', '<p>Company will provide the design and pre-production services described in Exhibit A and Exhibit D, subject to Client providing required inputs/approvals.</p>', 2, 2851, 710, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2887, 'MASTER_EF_PRODUCTION', 'Production', '<p>Upon Green Light, Company will commence production and manage manufacturing in accordance with Exhibit B and applicable quality processes. Company may use qualified third-party manufacturing partners.</p>', 2, 2851, 720, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2888, 'MASTER_EF_DELIVERY_ONSITE', 'Delivery / On-Site', '<p>Delivery coordination and any on-site responsibilities will be performed as allocated in Exhibit C.</p>', 2, 2851, 730, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2889, 'MASTER_EF_INSURANCE', 'Insurance', '<p>Company will maintain workers'' compensation as required by law and commercial general liability with limits not less than $1,000,000 per occurrence / $2,000,000 aggregate (or such other amounts as stated in Exhibit A). Certificates provided upon request.</p>', 2, 2851, 740, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2890, 'MASTER_EF_PROJECT_SCHEDULE', 'Project Schedule', '<p>The schedule set forth in Exhibit D is an estimate and may adjust due to permitting, production slot availability, supply chain variability, weather, site readiness, and other factors outside Company''s reasonable control. Time is not of the essence unless expressly stated in Exhibit A.</p>', 2, 2852, 810, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2891, 'MASTER_EF_PRECONDITIONS', 'Preconditions to Production', '<p>Company is not obligated to begin production until Green Light Conditions are met. If conditions are not timely met, Company may reassign the production slot and adjust schedule with notice.</p>', 2, 2852, 820, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2892, 'MASTER_EF_SITE_NOT_READY', 'Site Not Ready', '<p>If the site is not ready as required by Exhibit C, Company may delay delivery and/or incur storage, re-handling, demurrage, and remobilization costs payable by Client.</p>', 2, 2852, 830, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2893, 'MASTER_EF_FORCE_MAJEURE', 'Force Majeure', '<p>Neither Party is liable for delay/failure caused by events beyond reasonable control (acts of God, natural disasters, governmental actions, labor disputes, transportation disruptions, pandemics, supply chain disruptions, permit backlogs, carrier unavailability, factory closures/slot disruptions due to external conditions). Schedule extends equitably.</p>', 2, 2852, 840, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2894, 'MASTER_EF_INFLATION_ADJUSTMENT', 'Inflation / Market Adjustment', '<p>If production has not commenced within [6] months after execution of the applicable Exhibit A due to factors outside Company''s control (including permitting delays, Client delays, or force majeure), Company may propose a reasonable price adjustment reflecting documented increases in materials/labor/transport costs. Any adjustment must be documented via Exhibit A amendment or Change Order.</p>', 2, 2852, 850, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2895, 'MASTER_EF_LIMITED_WARRANTY', 'Limited Warranty', '<p>Company provides the limited warranty set forth in Exhibit E, subject to exclusions, allocation of responsibilities in Exhibit C, and any warranty-eligibility requirements in Exhibit E/Exhibit F.</p>', 2, 2853, 910, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2896, 'MASTER_EF_EXCLUSIVE_REMEDY', 'Exclusive Remedy; Disclaimer', '<p class="conspicuous">EXCEPT AS EXPRESSLY STATED IN EXHIBIT E, COMPANY DISCLAIMS ALL OTHER WARRANTIES TO THE MAXIMUM EXTENT PERMITTED BY LAW, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE LIMITED WARRANTY IS THE SOLE AND EXCLUSIVE REMEDY FOR COVERED DEFECTS.</p>', 2, 2853, 920, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2897, 'MASTER_EF_MFR_PASSTHROUGH', 'Manufacturer Pass-Through', '<p>To the extent available, Company will pass through manufacturer warranties for appliances/fixtures/equipment; such manufacturer warranties are the exclusive remedy for those components except to the extent defects arise from Company''s workmanship within the applicable coverage.</p>', 2, 2853, 930, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2898, 'MASTER_EF_WORK_PRODUCT', 'Ownership of Work Product', '<p>Company owns all drawings, plans, specifications, and deliverables created by or for Company ("Work Product"), including all IP rights.</p>', 2, 2854, 1010, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2899, 'MASTER_EF_PROJECT_LICENSE', 'Limited Project License', '<p>Upon payment of amounts due through the applicable milestone, Client receives a non-exclusive, non-transferable license to use the Work Product solely for the applicable Project. If Client uses Work Product without Company''s further involvement or outside the Project, Client assumes all risk and will defend/indemnify Company from resulting claims to the fullest extent permitted by law.</p>', 2, 2854, 1020, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2900, 'MASTER_EF_PUBLICITY', 'Publicity', '<p>Client grants Company the right to photograph and use images of the home for marketing, provided Company will not publicly disclose the specific address without Client''s consent (not unreasonably withheld for portfolio-type references).</p>', 2, 2854, 1030, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2901, 'MASTER_EF_CONSEQUENTIAL', 'Exclusion of Consequential Damages', '<p class="conspicuous">TO THE FULLEST EXTENT PERMITTED BY LAW, NEITHER PARTY IS LIABLE FOR CONSEQUENTIAL, INCIDENTAL, SPECIAL, INDIRECT, OR PUNITIVE DAMAGES (INCLUDING LOST PROFITS OR LOSS OF USE), REGARDLESS OF THEORY.</p>', 2, 2855, 1110, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2902, 'MASTER_EF_LIABILITY_CAP', 'Liability Cap', '<p class="conspicuous">COMPANY''S TOTAL LIABILITY ARISING OUT OF OR RELATING TO THIS AGREEMENT WILL NOT EXCEED THE TOTAL AMOUNTS PAID BY CLIENT UNDER THE APPLICABLE EXHIBIT A GIVING RISE TO THE CLAIM, EXCEPT FOR FRAUD, GROSS NEGLIGENCE, OR WILLFUL MISCONDUCT.</p>', 2, 2855, 1120, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2903, 'MASTER_EF_MILESTONE_REVIEW_2', 'Milestone Review', '<p>Milestone review periods and deliverables are set forth in Exhibit D.</p>', 2, 2856, 1210, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2904, 'MASTER_EF_NO_OBLIGATION', 'Clarification of "No Obligation" vs Green Light', '<p>Notwithstanding anything else, Client''s right to decline to proceed without obligation applies only prior to issuance of the Green Light Production Notice. After Green Light, Client is committed to the Production Phase and payment obligations, subject only to Company''s uncured material default.</p>', 2, 2856, 1220, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2905, 'MASTER_EF_PAYMENT_DEFAULT', 'Payment Default', '<p>Failure to pay amounts due is a default. If not cured within five (5) days after notice, Company may suspend performance and/or terminate the applicable Exhibit A engagement.</p>', 2, 2857, 1310, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2906, 'MASTER_EF_MATERIAL_BREACH', 'Other Material Breach', '<p>Other material breach not cured within ten (10) days after notice (or such shorter period where cure is not possible and the breach is continuing) permits suspension/termination.</p>', 2, 2857, 1320, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2907, 'MASTER_EF_TERMINATION_CAUSE', 'Termination for Cause', '<p>Either Party may terminate for the other Party''s uncured material breach.</p>', 2, 2857, 1330, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2908, 'MASTER_EF_TERMINATION_PRIOR', 'Termination Prior to Green Light', '', 2, 2857, 1340, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2909, 'MASTER_EF_TERMINATION_EFFECT', 'Effect of Termination; Survival of Payment Obligations', '<p>In the event of Termination hereunder, Client shall remain responsible for payment of (i) all fees for Services performed through the effective date of termination, (ii) all approved reimbursable expenses incurred by Company, and (iii) any non-cancelable third-party costs committed by Company in reliance on this Agreement, as set forth in the applicable Exhibit A. Upon payment of such amounts, neither Party shall have any further obligation with respect to the terminated Exhibit A, except for provisions that by their nature survive termination.</p>', 2, 2857, 1350, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2910, 'MASTER_EF_WORK_PRODUCT_TERM', 'Work Product Upon Termination', '<p>Client''s license to use Work Product is limited to Work Product delivered and paid for through the last paid milestone and solely for the Project.</p>', 2, 2857, 1360, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2911, 'MASTER_EF_MEDIATION', 'Escalation and Mediation', '<p>The Parties will first attempt good-faith executive negotiation. If unresolved, the Parties will pursue non-binding mediation in Los Angeles County, California unless otherwise agreed.</p>', 2, 2858, 1410, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2912, 'MASTER_EF_ARBITRATION', 'Arbitration', '<p>Any dispute not resolved by mediation shall be finally resolved by binding arbitration administered by JAMS in Los Angeles County, California, under its Comprehensive Arbitration Rules. Judgment may be entered in any court of competent jurisdiction.</p>', 2, 2858, 1420, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2913, 'MASTER_EF_LIMITATIONS_PERIOD', 'Limitations Period', '<p>Any claim must be brought within twelve (12) months after the cause of action accrues, except where a longer period is required by applicable law.</p>', 2, 2858, 1430, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2914, 'MASTER_EF_GOVERNING_LAW', 'Governing Law', '<p>This Agreement is governed by the laws of the State of California, without regard to conflict-of-laws principles, provided Exhibit F controls where required by other state law for a given Project.</p>', 2, 2858, 1440, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2915, 'MASTER_EF_ENTIRE_AGREEMENT', 'Entire Agreement; Amendments', '<p>This Agreement and the Exhibits constitute the entire agreement. Amendments require a writing signed by both Parties. Exhibit A may be amended by a written Exhibit A amendment, provided no amendment modifies Sections {{XREF_BANKABILITY_SUBSECTIONS}} (bankability provisions) unless expressly stated.</p>', 2, 2859, 1510, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2916, 'MASTER_EF_NOTICES', 'Notices', '<p>Notices must be in writing and delivered by personal delivery, overnight courier, or email with confirmed receipt, to the addresses set forth in Exhibit A (or updated by notice).</p>', 2, 2859, 1520, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2917, 'MASTER_EF_ASSIGNMENT', 'Assignment', '<p>Client may not assign this Agreement without Company''s consent. Company may assign to affiliates, successors, and financing parties as provided in Section {{XREF_ASSIGNMENT_SECTION}}.</p>', 2, 2859, 1530, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2918, 'MASTER_EF_PRECEDENCE_A', '', '<p>Exhibit A controls solely for project scope, phasing, milestones, pricing, payment terms, delivery parameters, and site/completion model elections.</p>', 3, 2867, 331, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2919, 'MASTER_EF_PRECEDENCE_B', '', '<p>Exhibits B and C control for technical requirements, interfaces, and allocation of responsibilities.</p>', 3, 2867, 332, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2920, 'MASTER_EF_PRECEDENCE_C', '', '<p>Exhibit D controls for schedule mechanics and milestone review/admin.</p>', 3, 2867, 333, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2921, 'MASTER_EF_PRECEDENCE_D', '', '<p>Exhibit E controls for warranty terms and claims procedures.</p>', 3, 2867, 334, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2922, 'MASTER_EF_PRECEDENCE_E', '', '<p>Exhibit F controls solely to the extent required by applicable state law.</p>', 3, 2867, 335, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2923, 'MASTER_EF_PRECEDENCE_F', '', '<p>This Agreement controls in all other respects.</p>', 3, 2867, 336, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2924, 'MASTER_EF_COMPANY_COMPLETION', 'Company Completion Model', '<p>If Company Completion Model is selected, Company will perform or subcontract the on-site responsibilities allocated to Company in Exhibit C through issuance of a certificate of occupancy or equivalent approval ("CO/Equivalent"), subject to Client meeting its responsibilities.</p>', 3, 2870, 421, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2925, 'MASTER_EF_CLIENT_GC_COMPLETION', 'Client GC Completion Model', '<p>If Client GC Completion Model is selected, Client (through its GC) is responsible for all on-site work allocated to Client in Exhibit C, and Company has no responsibility for site conditions, inspections, completion, or CO/Equivalent beyond the scope allocated to Company in Exhibit C.</p>', 3, 2870, 422, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2926, 'MASTER_EF_CHANGE_ORDERS_SUB', 'Change Orders', '<p>Any Client-requested changes, Client-caused delays, or unforeseen site conditions that impact cost, scope, or schedule will be documented in a written change order or Exhibit A amendment signed by both Parties ("Change Order").</p>', 3, 2871, 431, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2927, 'MASTER_EF_SUBSTITUTIONS', 'Like-for-Like Substitutions', '<p>Company may make reasonable substitutions of materials, finishes, fixtures, or components of substantially similar quality and functionality where necessary due to supply constraints or discontinuations, provided such substitutions do not materially reduce overall performance or agreed finishes category.</p>', 3, 2871, 432, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2928, 'MASTER_EF_TERM_CONVENIENCE', 'Client Termination for Convenience', '<p>Prior to issuance of the Green Light Production Notice, Client may elect to terminate the applicable Exhibit A engagement for convenience upon written notice to Company.</p>', 3, 2908, 1341, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2929, 'MASTER_EF_PERMITTING_EXIT', 'Permitting Delay Exit', '<p>If permits are not obtained within 6 months of submission due to factors outside Company''s control, Company may terminate the applicable Exhibit A with notice; Client pays for Services performed and reimbursables incurred to date.</p>', 3, 2908, 1342, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2930, 'MASTER_EF_EXHIBIT_A_REF', 'Exhibit A', '<p>Project Scope and Commercial Terms (Project/Phase Matrix; Milestones; Pricing; Payment Schedule; Completion Model election)</p>', 3, 2865, 311, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2931, 'MASTER_EF_EXHIBIT_B_REF', 'Exhibit B', '<p>Home Plans, Specifications & Finishes (Plan Set Index; technical specs; finish schedules)</p>', 3, 2865, 312, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2932, 'MASTER_EF_EXHIBIT_C_REF', 'Exhibit C', '<p>General Contractor / On-Site Scope & Responsibility Matrix (Responsibility Allocation; Interfaces; Dependencies; site readiness requirements)</p>', 3, 2865, 313, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2933, 'MASTER_EF_EXHIBIT_D_REF', 'Exhibit D', '<p>Milestones & Schedule (Design/engineering schedule; review periods; production slot assumptions; reporting cadence)</p>', 3, 2865, 314, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2934, 'MASTER_EF_EXHIBIT_E_REF', 'Exhibit E', '<p>Limited Warranty (coverage terms; exclusions; claim process; manufacturer pass-through)</p>', 3, 2865, 315, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO clauses (id, slug, header_text, body_html, level, parent_id, "order", contract_types, tags)
VALUES (2935, 'MASTER_EF_EXHIBIT_F_REF', 'Exhibit F', '<p>State-Specific Provisions (only to the extent required by law)</p>', 3, 2865, 316, '["MASTER_EF"]'::jsonb, NULL)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  header_text = EXCLUDED.header_text,
  body_html = EXCLUDED.body_html,
  level = EXCLUDED.level,
  parent_id = EXCLUDED.parent_id,
  "order" = EXCLUDED."order",
  contract_types = EXCLUDED.contract_types,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- OPTIONAL: Uncomment to delete clauses that no longer exist in dev
-- DELETE FROM clauses WHERE id NOT IN (2049,2050,2051,2052,2053,2054,2055,2056,2057,2058,2059,2060,2061,2062,2063,2064,2065,2066,2067,2068,2069,2070,2071,2072,2073,2074,2075,2076,2077,2078,2079,2080,2081,2082,2083,2084,2085,2086,2087,2088,2089,2090,2091,2092,2093,2094,2095,2096,2097,2098,2099,2100,2101,2102,2103,2104,2105,2106,2107,2108,2109,2110,2111,2112,2113,2114,2115,2116,2117,2118,2119,2120,2121,2122,2123,2124,2125,2126,2127,2128,2129,2130,2131,2132,2133,2134,2135,2136,2137,2138,2139,2140,2141,2142,2143,2144,2145,2146,2147,2148,2149,2150,2151,2152,2153,2154,2155,2156,2157,2158,2159,2160,2161,2162,2163,2164,2165,2166,2167,2168,2169,2170,2171,2172,2173,2174,2175,2176,2177,2178,2179,2180,2181,2182,2183,2184,2185,2186,2187,2188,2189,2190,2191,2192,2193,2194,2195,2196,2197,2198,2199,2200,2201,2202,2203,2204,2205,2206,2207,2208,2209,2210,2211,2212,2213,2214,2215,2216,2217,2218,2219,2220,2221,2222,2223,2224,2225,2226,2227,2228,2229,2230,2231,2232,2233,2234,2235,2236,2237,2238,2239,2240,2241,2242,2243,2244,2245,2246,2247,2248,2249,2250,2251,2252,2253,2254,2255,2256,2257,2258,2259,2260,2261,2262,2263,2264,2265,2266,2267,2268,2269,2270,2271,2272,2273,2274,2275,2276,2277,2278,2279,2280,2281,2282,2283,2845,2846,2847,2848,2849,2850,2851,2852,2853,2854,2855,2856,2857,2858,2859,2860,2861,2862,2863,2864,2865,2866,2867,2868,2869,2870,2871,2872,2873,2874,2875,2876,2877,2878,2879,2880,2881,2882,2883,2884,2885,2886,2887,2888,2889,2890,2891,2892,2893,2894,2895,2896,2897,2898,2899,2900,2901,2902,2903,2904,2905,2906,2907,2908,2909,2910,2911,2912,2913,2914,2915,2916,2917,2918,2919,2920,2921,2922,2923,2924,2925,2926,2927,2928,2929,2930,2931,2932,2933,2934,2935);

-- ============ COMPONENT LIBRARY ============

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (5, 1, 'BLOCK_ON_SITE_SCOPE_RECITALS', '<p><strong>Option A – Client-Retained Contractor ("CRC")</strong></p>
<p>Client will engage and manage a licensed General Contractor of Client''s choosing to perform all On-Site Services, including but not limited to: site preparation, foundation work, utility connections, module setting and installation, and completion work.</p>
<p>Under this option:</p>
<ul>
<li>Client contracts directly with and pays the General Contractor</li>
<li>Company retains approval authority over contractor selection</li>
<li>Company retains inspection and quality control authority per Exhibit F</li>
<li>General Contractor must comply with Company''s installation specifications</li>
<li>Failure to meet Company standards may void all or part of Limited Warranty</li>
<li>On-Site Services costs are NOT included in this Agreement''s pricing</li>
</ul>
<p>CLIENT''S ELECTION (initial one):</p>
<p>SELECTED OPTION: The {{ON_SITE_SERVICES_SELECTION}} (''On-Site Service'') has been selected for this Agreement.</p>', 'Recitals section — Client-Retained Contractor election language', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (6, 1, 'BLOCK_ON_SITE_SCOPE_RECITALS', '<p><strong>Option B – Company-Managed On-Site Services ("CMOS")</strong></p>
<p>Company will engage and manage qualified contractors to perform all On-Site Services under this Agreement.</p>
<p>Under this option:</p>
<ul>
<li>Company contracts with and manages all on-site contractors</li>
<li>Client''s sole contractual relationship is with Company</li>
<li>All On-Site Services costs are included in this Agreement''s pricing</li>
<li>Company is responsible for on-site work quality and performance</li>
<li>Full Limited Warranty coverage applies per Exhibit E</li>
</ul>
<p>CLIENT''S ELECTION (initial one):</p>
<p>SELECTED OPTION: The {{ON_SITE_SERVICES_SELECTION}} (''On-Site Service'') has been selected for this Agreement.</p>', 'Recitals section — Company-Managed On-Site Services election language', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (7, 1, 'BLOCK_ON_SITE_SCOPE_1.1_B', '<p>On-Site Services (Item B above) are not included in this Agreement, Client is responsible to hire a licensed General Contractor, approved by Company, to prepare the site and complete all necessary work before the module(s) arrive at the site (see Exhibit C for details). Any contractor working on the Project must comply with Company''s installation requirements to maintain warranty eligibility (see Exhibit F).</p>
<p>The Design Phase must be completed before the Production Phase begins. Transition between phases requires written confirmation from both parties (email or signed notice is acceptable). Either party may terminate this Agreement as set forth in Section 10 (Termination), with settlement of amounts due for completed work.</p>', 'Section 1.1B Scope of Services — CRC: On-Site not included', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (8, 1, 'BLOCK_ON_SITE_SCOPE_1.1_B', '<ul>
<li><strong>Installation Services:</strong> Craning, setting, and installation supervision of modules.</li>
<li><strong>Site Construction Services:</strong> Site preparation, foundations, utilities, and completion work.</li>
</ul>
<p>The Design Phase must be completed before the Production Phase begins. Transition between phases requires written confirmation from both parties (email or signed notice is acceptable). Either party may terminate this Agreement as set forth in Section 10 (Termination), with settlement of amounts due for completed work.</p>', 'Section 1.1B Scope of Services — CMOS: Installation and site construction included', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (9, 1, 'BLOCK_ON_SITE_SCOPE_1.5', '<p>Client understands and acknowledges that all on-site preparation, foundation work, utility connections, crane staging, and post-delivery finish work are the Client''s responsibility or that of Client''s General Contractor as described in Exhibit F. If the site is not ready on schedule, delays and additional costs may apply, including storage fees for the module(s).</p>', 'Section 1.5 — CRC: Client responsible for all on-site prep', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (10, 1, 'BLOCK_ON_SITE_SCOPE_1.5', '<p>Company will coordinate and manage all on-site preparation, foundation work, utility connections, crane staging, and post-delivery finish work under this Agreement. Company will ensure site readiness in coordination with the manufacturing and delivery schedule.</p>', 'Section 1.5 — CMOS: Company manages site readiness', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (11, 1, 'BLOCK_ON_SITE_SCOPE_3.1', '<p>The Client is responsible for coordinating consultants and contractors, including civil engineers, architects, and permitting consultants, to ensure their work aligns with the services provided by Company.</p>
<p>Client must promptly notify Company in writing of any facts or changes that may impact the design, permitting, site preparation, or installation of the home.</p>', 'Section 3.1 Client Responsibilities — CRC: Client coordinates consultants', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (12, 1, 'BLOCK_ON_SITE_SCOPE_3.1', '<p>Company will coordinate with consultants and contractors, including civil engineers, architects, and permitting consultants, as needed to complete the Project. Client must promptly notify Company in writing of any facts or changes that may impact the design, permitting, site preparation, or installation of the home.</p>', 'Section 3.1 Client Responsibilities — CMOS: Company coordinates consultants', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (13, 1, 'BLOCK_ON_SITE_SCOPE_3.4', '<p>The Client is responsible for hiring a licensed General Contractor to perform all required on-site work, including site preparation, foundation, utility connections, crane access, and post-delivery finish work as detailed in Exhibit F. Company''s scope under this Agreement does not include On-Site Services. Client is solely responsible for contracting with, managing, and paying its General Contractor.</p>
<p>Client must:</p>
<ul>
<li>Enter into a written agreement with a licensed General Contractor for all on-site work in a timely manner.</li>
<li>Ensure that the General Contractor meets all requirements in Exhibit F (Contractor Requirements).</li>
<li>Ensure that the General Contractor performs all required tasks listed in Exhibit F, including any work that must be completed before delivery.</li>
<li>Provide Company with reasonable access to inspect and approve the General Contractor''s work.</li>
</ul>
<p>Company retains authority to inspect and approve (or reject) Client''s General Contractor''s work. If the General Contractor''s work does not meet Company''s standards, Company may require corrections before proceeding with delivery or installation. Client is responsible for all costs associated with corrections.</p>', 'Section 3.4 Client Responsibilities — CRC: Client hires GC with detailed obligations', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (14, 1, 'BLOCK_ON_SITE_SCOPE_3.4', '<p>Company will engage and manage qualified contractors for all site construction work under this Agreement. Company will coordinate manufacturing delivery schedules with site readiness.</p>', 'Section 3.4 Client Responsibilities — CMOS: Company manages contractors', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (15, 1, 'BLOCK_ON_SITE_SCOPE_5.3', '<p>Client shall ensure that the Site is ready to receive the Home on or before the scheduled delivery date, including completion of all site work listed in Exhibit F by Client''s General Contractor or other contractors. If the Site is not ready as scheduled, Company may, at its sole discretion, (a) delay delivery and charge reasonable storage and handling fees; (b) reallocate delivery logistics and factory output as needed; and/or (c) require a Change Order to reschedule delivery and adjust the Total Contract Price accordingly.</p>', 'Section 5.3 Project Schedule and Delays — CRC: Client ensures site ready', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (16, 1, 'BLOCK_ON_SITE_SCOPE_5.3', '<p>If Client has elected Company-Managed On-Site Services, such services will be provided by contractors engaged by Company under this Agreement. Company will coordinate manufacturing delivery schedules with site readiness. Client acknowledges that:</p>
<ul>
<li>Company maintains full responsibility for on-site contractors;</li>
<li>Client is not a party to contracts between Company and its contractors;</li>
<li>Company and Company''s Contractors are responsible for on-site work quality and performance;</li>
</ul>', 'Section 5.3 Project Schedule and Delays — CMOS: Company coordinates delivery with site', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (21, 1, 'TABLE_WHAT_HAPPENS_NEXT', '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; font-family: Arial, sans-serif;"><thead><tr><th style="background-color: #3b82f6; color: #ffffff; font-weight: bold; font-size: 10pt; font-family: Arial, sans-serif; padding: 8px 12px; width: 20%; text-align: left; border-bottom: 2px solid #3b82f6; border: 1px solid #3b82f6;">Phase</th><th style="background-color: #3b82f6; color: #ffffff; font-weight: bold; font-size: 10pt; font-family: Arial, sans-serif; padding: 8px 12px; width: 55%; text-align: left; border-bottom: 2px solid #3b82f6; border: 1px solid #3b82f6;">Description</th><th style="background-color: #3b82f6; color: #ffffff; font-weight: bold; font-size: 10pt; font-family: Arial, sans-serif; padding: 8px 12px; width: 25%; text-align: left; border-bottom: 2px solid #3b82f6; border: 1px solid #3b82f6;">Buyer Pays</th></tr></thead><tbody><tr><td style="background-color: #ffffff; padding: 8px 12px;  text-align: left; width: 20%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;"><strong>Design</strong></td><td style="background-color: #ffffff; padding: 8px 12px;  text-align: left; width: 55%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">Work starts after execution of this agreement and subsequent payment of the Design Fee. Buyer will collaborate on the project layout and aesthetics.</td><td style="background-color: #ffffff; padding: 8px 12px;  text-align: left; width: 25%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">Paid at Signing</td></tr><tr><td style="background-color: #f8f9fa; padding: 8px 12px;  text-align: left; width: 20%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;"><strong>Mid-Design Review</strong></td><td style="background-color: #f8f9fa; padding: 8px 12px;  text-align: left; width: 55%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">Buyer receives a refined estimate based on selections and site conditions.</td><td style="background-color: #f8f9fa; padding: 8px 12px;  text-align: left; width: 25%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">No payment due</td></tr><tr><td style="background-color: #ffffff; padding: 8px 12px;  text-align: left; width: 20%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;"><strong>Purchase Decision</strong></td><td style="background-color: #ffffff; padding: 8px 12px;  text-align: left; width: 55%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">The buyer decides whether to proceed to production.</td><td style="background-color: #ffffff; padding: 8px 12px;  text-align: left; width: 25%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">Production Deposit (Milestone 1)</td></tr><tr><td style="background-color: #f8f9fa; padding: 8px 12px;  text-align: left; width: 20%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;"><strong>Site &amp; Factory Milestones</strong></td><td style="background-color: #f8f9fa; padding: 8px 12px;  text-align: left; width: 55%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">Payments are made at key points during factory production and site work.</td><td style="background-color: #f8f9fa; padding: 8px 12px;  text-align: left; width: 25%; border-bottom: 1px solid #dee2e6; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">See Payment Schedule</td></tr></tbody></table>', 'Project phase overview table for Document Summary section', NULL, true, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (22, 1, 'BLOCK_ON_SITE_SCOPE_EXHIBIT_A', '<p><strong>On-Site Services (Not Included)</strong></p><p>On-Site Services are not included in this Agreement. Client is responsible for engaging a licensed General Contractor to perform all on-site work. On-site costs are estimated separately and are not part of the Contract Price.</p><p>Estimated On-Site Cost (for reference only): {{PRELIMINARY_ONSITE_PRICE}}</p>', 'Exhibit A — CRC: On-Site Services not included in budget', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (23, 1, 'BLOCK_ON_SITE_SCOPE_EXHIBIT_A', '<p><strong>On-Site Services (Included)</strong></p><p>On-Site Services are included in this Agreement and managed by Company.</p><p>Preliminary On-Site Price: {{PRELIMINARY_ONSITE_PRICE}}</p>', 'Exhibit A — CMOS: On-Site Services included in budget', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (24, 1, 'BLOCK_ON_SITE_SCOPE_EXHIBIT_F', '<p><strong>Client-Retained Contractor (CRC) — On-Site Requirements</strong></p><p>Client has elected to retain their own licensed General Contractor for all On-Site Services. The following requirements must be met by Client''s General Contractor in order for Client to maintain eligibility for the Limited Warranty provided by Company.</p><p>Client''s General Contractor must:</p><ul><li>Hold a valid general contractor license in the state where the Project is located</li><li>Maintain insurance coverage meeting Company''s minimum requirements</li><li>Execute Company''s Contractor Acknowledgment form prior to commencing work</li><li>Follow all installation specifications provided by Company</li><li>Allow Company reasonable access for inspection at all project milestones</li></ul>', 'Exhibit F — CRC: Client GC requirements for warranty eligibility', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (25, 1, 'BLOCK_ON_SITE_SCOPE_EXHIBIT_F', '<p><strong>Company-Managed On-Site Services (CMOS) — Scope</strong></p><p>Company will engage and manage qualified contractors to perform all On-Site Services under this Agreement. Company is responsible for coordinating site preparation, foundation, utility connections, module setting, and all completion work.</p><p>Company''s on-site management includes:</p><ul><li>Selection and management of licensed subcontractors</li><li>Coordination of site preparation and foundation work</li><li>Utility connection scheduling and oversight</li><li>Module delivery coordination and crane/setting supervision</li><li>Post-installation completion and punch list management</li></ul>', 'Exhibit F — CMOS: Company manages all on-site work', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (26, 1, 'BLOCK_ON_SITE_SCOPE_EXHIBIT_END', '<p><strong>NOTICE:</strong> Client acknowledges that failure by Client''s General Contractor to comply with Company''s installation specifications, quality standards, or inspection requirements may result in partial or complete voiding of the Limited Warranty set forth in Exhibit E. Client is solely responsible for ensuring their General Contractor''s compliance with the requirements in this Exhibit.</p>', 'Exhibit F closing — CRC: Warranty voiding notice for non-compliant GC work', 'CRC', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (27, 1, 'BLOCK_ON_SITE_SCOPE_EXHIBIT_END', '<p><strong>NOTICE:</strong> Company warrants that all On-Site Services performed under this Agreement will be completed in accordance with applicable building codes, manufacturer specifications, and the quality standards set forth in this Agreement. Any deficiencies in on-site work performed by Company''s contractors are covered under the Limited Warranty set forth in Exhibit E.</p>', 'Exhibit F closing — CMOS: Company warranty coverage for on-site work', 'CMOS', false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (28, 1, 'BLOCK_GC_INFO_SECTION', '<h3>C.1 Client-Retained General Contractor</h3>
<p>Under the Client GC Completion Model, Client engages their own licensed General Contractor ("GC") who assumes responsibility for all on-site work including:</p>
<ul>
<li>Foundation and site preparation to Company specifications</li>
<li>Module set and crane coordination</li>
<li>Final utility connections</li>
<li>All finish work, landscaping, and final inspections</li>
</ul>
<p>GC must meet Company qualifications and provide required insurance certificates.</p>', 'Exhibit C — CRC: Client-retained GC responsibilities', 'CRC', true, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (29, 1, 'BLOCK_GC_INFO_SECTION', '<h3>C.1 Company-Managed On-Site Services</h3>
<p>Under the Company Completion Model, Company manages all on-site construction including:</p>
<ul>
<li>Foundation coordination and verification</li>
<li>Module delivery, set, and installation</li>
<li>Utility hookups and final connections</li>
<li>Finish work and punch list completion</li>
<li>Final inspections and certificate of occupancy support</li>
</ul>
<p>Client remains responsible for site access and any permits not included in scope.</p>', 'Exhibit C — CMOS: Company-managed on-site scope', 'CMOS', true, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (30, 1, 'TABLE_SIGNATURE_SECTION14', '
    <div class="signature-section" style="margin-top: 48pt; page-break-inside: avoid;">
      <table style="width: 100%; border: none; margin-top: 24pt;">
        <tr>
          <td style="width: 47%; border: none; vertical-align: top; padding: 12pt;">
            <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8pt;">COMPANY:</div>
            <div style="font-weight: bold; color: #666; margin-bottom: 24pt;">{{DVELE_PARTNERS_XYZ_LEGAL_NAME}}</div>
            <div style="border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Signature</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Name (Print)</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Title</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Date</div>
          </td>
          <td style="width: 6%; border: none;"></td>
          <td style="width: 47%; border: none; vertical-align: top; padding: 12pt;">
            <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8pt;">CLIENT:</div>
            <div style="font-weight: bold; color: #666; margin-bottom: 24pt;">{{CLIENT_LEGAL_NAME}}</div>
            <div style="border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Signature</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Name: {{CLIENT_SIGNER_NAME}}</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Title: {{CLIENT_TITLE}}</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Date</div>
          </td>
        </tr>
      </table>
    </div>', 'Main agreement signature block - Section 14', NULL, false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (31, 1, 'TABLE_SIGNATURE_EXHIBIT_A', '
    <div class="signature-section" style="margin-top: 48pt; page-break-inside: avoid;">
      <table style="width: 100%; border: none; margin-top: 24pt;">
        <tr>
          <td style="width: 47%; border: none; vertical-align: top; padding: 8pt;">
            <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8pt;">Accepted and agreed:</div>
            <div style="font-weight: bold; margin-bottom: 24pt;">{{DVELE_PARTNERS_XYZ_LEGAL_NAME}}</div>
            <div style="border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Signature</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Name (Print)</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Title</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Date</div>
          </td>
          <td style="width: 6%; border: none;"></td>
          <td style="width: 47%; border: none; vertical-align: top; padding: 8pt;">
            <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8pt;">Post Design Approval (Greenlight):</div>
            <div style="font-weight: bold; margin-bottom: 24pt;">{{CLIENT_LEGAL_NAME}}</div>
            <div style="border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Signature</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Name (Print)</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Title</div>
            <div style="margin-top: 16pt; border-bottom: 1px solid #000; margin-bottom: 4pt; height: 20pt;"></div>
            <div style="font-size: 9pt; color: #666; margin-bottom: 2pt;">Date</div>
          </td>
        </tr>
      </table>
    </div>', 'Exhibit A dual signature blocks - Accepted/Agreed + Post Greenlight', NULL, false, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (32, 1, 'TABLE_PRICING_BREAKDOWN', '<p><em>This table is auto-generated from project pricing data. It cannot be edited here.</em></p>', 'Pricing summary table (A.4) — auto-generated from pricing engine. Column structure: Stage/Component, Amount, Notes.', NULL, true, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (33, 1, 'TABLE_PAYMENT_SCHEDULE', '<p><em>This table is auto-generated from project payment schedule. It cannot be edited here.</em></p>', 'Payment milestone table (A.5) — auto-generated from payment schedule. Columns: Property ID, Phase, Payment, Trigger, %, Amount, Due.', NULL, true, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO component_library (id, organization_id, tag_name, content, description, service_model, is_system, is_active)
VALUES (34, 1, 'TABLE_UNIT_DETAILS', '<p><em>This table is auto-generated from project unit selections. It cannot be edited here.</em></p>', 'Unit breakdown table — auto-generated from project units. Columns: Unit, Model, Specs, Price.', NULL, true, true)
ON CONFLICT (id) DO UPDATE SET
  tag_name = EXCLUDED.tag_name,
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  service_model = EXCLUDED.service_model,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- OPTIONAL: Uncomment to delete components that no longer exist in dev
-- DELETE FROM component_library WHERE id NOT IN (5,6,7,8,9,10,11,12,13,14,15,16,21,22,23,24,25,26,27,28,29,30,31,32,33,34);

-- ============ STATE DISCLOSURES (MASTER_EF_NOTICES - comprehensive updates) ============

UPDATE state_disclosures SET content = '
<h4 class="exhibit-clause">CA-1: Factory-Built Housing Notice</h4>
<p class="conspicuous">CALIFORNIA NOTICE: This Agreement involves the sale of a factory-built housing unit subject to Health and Safety Code Section 19960 et seq. The Buyer has the right to have the unit inspected by a licensed home inspector before taking possession.</p>

<h4 class="exhibit-clause">CA-2: Right to Cancel</h4>
<p class="exhibit-body">Pursuant to California Civil Code Section 1689.5 et seq., you, the Buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. To cancel, mail or deliver a signed and dated copy of a cancellation notice to the Company at the address specified in Exhibit A. If you cancel, any payments made by you will be returned within ten (10) business days following receipt of the cancellation notice.</p>

<h4 class="exhibit-clause">CA-3: Contractor''s License Disclosure</h4>
<p class="exhibit-body">Contractors are required by law to be licensed and regulated by the Contractors'' State License Board which has jurisdiction to investigate complaints against contractors if a complaint regarding a patent act or omission is filed within four (4) years of the date of the alleged violation. A complaint regarding a latent act or omission pertaining to structural defects must be filed within ten (10) years of the date of the alleged violation. Any questions concerning a contractor may be referred to the Registrar, Contractors'' State License Board, P.O. Box 26000, Sacramento, CA 95826.</p>

<h4 class="exhibit-clause">CA-4: Mechanics Lien Warning</h4>
<p class="conspicuous">UNDER CALIFORNIA CIVIL CODE SECTION 8044, ANYONE WHO HELPS IMPROVE YOUR PROPERTY, BUT WHO IS NOT PAID, MAY RECORD WHAT IS KNOWN AS A MECHANIC''S LIEN ON YOUR PROPERTY. A MECHANIC''S LIEN IS A CLAIM, LIKE A MORTGAGE OR HOME EQUITY LOAN, MADE AGAINST YOUR PROPERTY AND RECORDED WITH THE COUNTY RECORDER. TO PROTECT YOURSELF, YOU SHOULD OBTAIN APPROPRIATE LIEN RELEASES AND ENSURE THAT ALL SUBCONTRACTORS AND MATERIAL SUPPLIERS ARE PAID.</p>

<h4 class="exhibit-clause">CA-5: Home Improvement Contract Requirements</h4>
<p class="exhibit-body">This contract is subject to California Business and Professions Code Sections 7150-7168. The contract includes the approximate start and completion dates for the project as set forth in Exhibit D. The total contract price and payment schedule are set forth in Exhibit A. The Buyer has the right to require the Company to have a performance and payment bond.</p>

<h4 class="exhibit-clause">CA-6: Consumer Protection Provisions</h4>
<p class="exhibit-body">Client is protected under the California Consumer Legal Remedies Act (Civil Code Section 1750 et seq.). Company must provide proof of insurance and contractor licensing upon request. Company warrants that it holds a valid California contractor''s license and maintains all insurance coverage required by law.</p>

<h4 class="exhibit-clause">CA-7: Arbitration Disclosure</h4>
<p class="conspicuous">BY AGREEING TO ARBITRATION, THE PARTIES ARE GIVING UP THE RIGHT TO HAVE THE DISPUTE DECIDED BY A JUDGE OR JURY. THE PARTIES ALSO GIVE UP THE RIGHT TO DISCOVERY AND APPEAL EXCEPT AS PROVIDED BY THE ARBITRATION RULES. IF EITHER PARTY REFUSES TO SUBMIT TO ARBITRATION AFTER AGREEING TO THIS PROVISION, THAT PARTY MAY BE COMPELLED TO ARBITRATE UNDER CALIFORNIA CODE OF CIVIL PROCEDURE SECTION 1281.2.</p>
', updated_at = NOW()
WHERE code = 'MASTER_EF_NOTICES' AND state = 'CA';

UPDATE state_disclosures SET content = '
<h4 class="exhibit-clause">CO-1: Division of Housing Registration Notice</h4>
<p class="conspicuous">COLORADO NOTICE: This Agreement involves the sale of a factory-built modular housing unit regulated by the Colorado Division of Housing (DOH) under C.R.S. § 24-32-3301 et seq. and Administrative Rules 8 CCR 1302-14. All plans for the modular home have been submitted to and approved by the DOH prior to manufacturing. The manufacturer, seller, and installer are registered with the State of Colorado and maintain all required bonds and escrow accounts.</p>

<h4 class="exhibit-clause">CO-2: Construction Defect Action Reform Act (CDARA) Notice</h4>
<p class="conspicuous">IMPORTANT NOTICE REGARDING CONSTRUCTION DEFECT CLAIMS: PURSUANT TO C.R.S. § 13-20-803.5, BEFORE FILING ANY LAWSUIT OR ARBITRATION CLAIM FOR CONSTRUCTION DEFECTS, THE CLAIMANT MUST PROVIDE THE CONSTRUCTION PROFESSIONAL WITH WRITTEN NOTICE OF CLAIM DESCRIBING THE DEFECTS IN REASONABLE DETAIL. THE CONSTRUCTION PROFESSIONAL HAS SEVENTY-FIVE (75) DAYS FROM RECEIPT OF THE NOTICE TO INSPECT THE PROPERTY AND THIRTY (30) DAYS AFTER INSPECTION TO PROVIDE A WRITTEN RESPONSE, WHICH MAY INCLUDE AN OFFER TO REPAIR, SETTLE, OR DENY THE CLAIM. FAILURE TO FOLLOW THESE NOTICE REQUIREMENTS MAY RESULT IN THE CLAIM BEING STAYED OR DISMISSED.</p>

<h4 class="exhibit-clause">CO-3: Right to Cure</h4>
<p class="exhibit-body">Under the Colorado Construction Defect Action Reform Act (CDARA), the Company has the right to inspect and cure alleged construction defects before any legal action is commenced. The Buyer agrees to provide written notice of any claimed defect and to allow reasonable access for inspection and repair. The Company shall have the opportunity to correct defects in accordance with the CDARA timelines and procedures before the Buyer may pursue further remedies.</p>

<h4 class="exhibit-clause">CO-4: DOH Inspection and Certification</h4>
<p class="exhibit-body">The modular home units subject to this Agreement are inspected during the manufacturing process by the Colorado Division of Housing or its authorized agents. A certificate of compliance will be issued upon satisfactory completion of manufacturing inspections. Installation of the modular units on the permanent foundation will be inspected and certified by the DOH or local building authority as required by 8 CCR 1302-14. The Buyer has the right to request copies of all inspection certifications.</p>

<h4 class="exhibit-clause">CO-5: Consumer Complaint Rights</h4>
<p class="exhibit-body">The Buyer has the right to file a formal complaint with the Colorado Division of Housing regarding any manufacturing or installation defects. Complaints must be submitted in writing using the DOH complaint form (emails and telephone calls alone are not sufficient to initiate a formal investigation). The DOH has authority to investigate complaints and require manufacturers and installers to correct verified defects. The DOH represents the interests of the State, not individual consumers, but may order corrective action where warranted. Consumer complaints may be filed at: Colorado Division of Housing, Office of Regulatory Oversight, Building Codes and Standards.</p>

<h4 class="exhibit-clause">CO-6: Seller Property Disclosure</h4>
<p class="exhibit-body">Pursuant to C.R.S. § 38-35.7, the Company discloses all material facts known to it regarding the property and the modular home that may affect the value, desirability, or safety of the home. The Company warrants that it holds all required State of Colorado registrations and maintains compliance with applicable bonding, escrow, and insurance requirements for factory-built housing sales and installation.</p>

<h4 class="exhibit-clause">CO-7: Arbitration Disclosure</h4>
<p class="conspicuous">BY AGREEING TO ARBITRATION, THE PARTIES ARE GIVING UP THE RIGHT TO HAVE THE DISPUTE DECIDED BY A JUDGE OR JURY IN A COURT OF LAW. THE PARTIES ALSO GIVE UP THE RIGHT TO DISCOVERY AND APPEAL EXCEPT AS PROVIDED BY THE ARBITRATION RULES. THE ARBITRATION PROVISIONS OF THIS AGREEMENT ARE SUBJECT TO THE COLORADO CONSTRUCTION DEFECT ACTION REFORM ACT NOTICE REQUIREMENTS, WHICH MUST BE SATISFIED BEFORE ARBITRATION MAY COMMENCE.</p>
', updated_at = NOW()
WHERE code = 'MASTER_EF_NOTICES' AND state = 'CO';

-- Reset sequences
SELECT setval('clauses_id_seq', (SELECT COALESCE(MAX(id), 1) FROM clauses));
SELECT setval('component_library_id_seq', (SELECT COALESCE(MAX(id), 1) FROM component_library));

COMMIT;
