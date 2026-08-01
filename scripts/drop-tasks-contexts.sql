-- Drop leftover Oh-Task tables (safe if already gone).
-- Run: docker exec -i study-dock-db psql -U studydock -d studydock < scripts/drop-tasks-contexts.sql
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS contexts CASCADE;
