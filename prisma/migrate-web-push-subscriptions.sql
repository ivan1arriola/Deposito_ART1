CREATE TABLE IF NOT EXISTS web_push_subscription (
  subscription_id BIGSERIAL PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscription_usuario
  ON web_push_subscription (usuario_id);

CREATE INDEX IF NOT EXISTS idx_web_push_subscription_enabled
  ON web_push_subscription (enabled);

