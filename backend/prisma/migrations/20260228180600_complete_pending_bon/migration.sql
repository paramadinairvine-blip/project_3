-- Update all PENDING BON transactions to COMPLETED
UPDATE "transactions" SET "status" = 'COMPLETED', "paidAt" = NOW() WHERE "type" = 'BON' AND "status" = 'PENDING';
