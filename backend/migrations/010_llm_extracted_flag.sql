-- Add column to identify skills extracted by LLM model
ALTER TABLE candidate_skills ADD COLUMN llm_extracted BOOLEAN DEFAULT 0;
