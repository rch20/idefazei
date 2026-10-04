-- Acelera relatórios e saldos financeiros filtrados por tenant e competência.
-- Esta migration somente cria o índice; não altera lançamentos existentes.
CREATE INDEX `financial_transactions_church_date_idx`
  ON `financial_transactions` (`churchId`, `transactionDate`);
