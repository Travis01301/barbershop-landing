-- Gift Cards Table

CREATE TABLE IF NOT EXISTS gift_cards (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  balance NUMERIC(10,2) NOT NULL,
  purchased_by_email VARCHAR(255),
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  message TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_redeemed_at TIMESTAMP,
  last_redeemed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_card_redemptions (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  gift_card_id INTEGER NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  amount_redeemed NUMERIC(10,2) NOT NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  redeemed_by_email VARCHAR(255) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_gift_cards_shop_code ON gift_cards(shop_id, code);
CREATE INDEX idx_gift_cards_shop_active ON gift_cards(shop_id, is_active);
CREATE INDEX idx_gift_card_redemptions_gift_card ON gift_card_redemptions(gift_card_id);
CREATE INDEX idx_gift_card_redemptions_shop ON gift_card_redemptions(shop_id, redeemed_at DESC);

COMMIT;
