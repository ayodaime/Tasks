-- Rename the "STAFF" role to "OFFICER" (base role, works on assigned
-- tasks only; renamed to match the company's Officer/Supervisor/Manager
-- terminology). No schema change: role is a plain string column.
UPDATE "User" SET "role" = 'OFFICER' WHERE "role" = 'STAFF';
