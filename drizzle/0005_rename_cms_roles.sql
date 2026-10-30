-- "DAP editor" is now "DAP exco" (an AI Lodge exco role was added alongside it).
UPDATE "people" SET "role" = 'dap_exco' WHERE "role" = 'dap_editor';
