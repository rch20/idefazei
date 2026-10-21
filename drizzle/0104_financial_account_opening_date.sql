-- Tesouraria: data do saldo inicial da conta (nula = data de cadastro, comportamento anterior).
ALTER TABLE `financial_accounts` ADD COLUMN `openingBalanceDate` date NULL;
