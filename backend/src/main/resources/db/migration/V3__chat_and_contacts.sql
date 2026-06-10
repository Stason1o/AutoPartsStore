CREATE TABLE chat_conversations (
  id BIGSERIAL PRIMARY KEY,
  visitor_token VARCHAR(36) NOT NULL UNIQUE,
  visitor_name TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('VISITOR','ADMIN')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  read_by_visitor BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_chat_messages_conv ON chat_messages(conversation_id, id);
CREATE INDEX idx_chat_unread_admin ON chat_messages(conversation_id)
  WHERE sender = 'VISITOR' AND read_by_admin = FALSE;

-- Контакты магазина (пустые не показываются на витрине, заполняются в админке)
INSERT INTO settings (key, value) VALUES
  ('contact_phone', '+373 22 00 11 22'),
  ('contact_email', 'info@sacramento.md'),
  ('contact_viber', ''),
  ('contact_whatsapp', ''),
  ('contact_telegram', ''),
  ('contact_instagram', '');
