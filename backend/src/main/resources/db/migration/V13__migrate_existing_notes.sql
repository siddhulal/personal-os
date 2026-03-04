-- Create a default notebook and section for each user who has existing notes
-- Step 1: Create "My Notebook" for each user with notes
INSERT INTO notebooks (id, name, description, color, icon, order_index, user_id)
SELECT DISTINCT uuid_generate_v4(), 'My Notebook', 'Default notebook for imported notes', '#6366f1', 'notebook', 0, n.user_id
FROM notes n
WHERE n.deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM notebooks nb WHERE nb.user_id = n.user_id);

-- Step 2: Create "General" section in each default notebook
INSERT INTO sections (id, name, order_index, notebook_id, user_id)
SELECT uuid_generate_v4(), 'General', 0, nb.id, nb.user_id
FROM notebooks nb
WHERE nb.name = 'My Notebook'
AND NOT EXISTS (SELECT 1 FROM sections s WHERE s.notebook_id = nb.id);

-- Step 3: Assign existing notes to their user's default notebook and section
UPDATE notes n
SET notebook_id = nb.id,
    section_id = s.id
FROM notebooks nb
JOIN sections s ON s.notebook_id = nb.id
WHERE nb.user_id = n.user_id
AND nb.name = 'My Notebook'
AND s.name = 'General'
AND n.notebook_id IS NULL
AND n.deleted_at IS NULL;
