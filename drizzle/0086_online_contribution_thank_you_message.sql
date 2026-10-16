-- Mensagem configurável exibida ao discípulo após o envio de uma contribuição PIX.
-- NULL mantém o fallback padrão da aplicação para configurações PIX já existentes.
ALTER TABLE treasury_pix_settings
  ADD COLUMN thankYouMessage TEXT NULL;
