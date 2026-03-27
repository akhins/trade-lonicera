-- SametAbiTrade - Extended Database Schema
-- This file extends the original db.sql with additional tables

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Mevcut tablolar (db.sql'den)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS parite (
  id int(11) NOT NULL AUTO_INCREMENT,
  parite varchar(244) NOT NULL,
  mesajzamani timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS pozisyonlar (
  id int(11) NOT NULL AUTO_INCREMENT,
  parite varchar(244) NOT NULL,
  entry_price varchar(244) NOT NULL,
  stop_price varchar(244) NOT NULL,
  tp_price varchar(244) NOT NULL,
  LONGSHORT varchar(244) NOT NULL,
  status varchar(244) NOT NULL,
  zaman datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Kullanıcılar tablosu
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id int(11) NOT NULL AUTO_INCREMENT,
  username varchar(100) NOT NULL UNIQUE,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'admin',
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  last_login datetime DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Trades tablosu - Demo trading işlemleri için
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS trades (
  id int(11) NOT NULL AUTO_INCREMENT,
  symbol varchar(20) NOT NULL,
  direction enum('LONG','SHORT') NOT NULL,
  entry_price decimal(20,8) NOT NULL,
  stop_loss decimal(20,8) NOT NULL,
  take_profit decimal(20,8) NOT NULL,
  risk_reward_ratio decimal(5,2) NOT NULL DEFAULT 3.00,
  quantity decimal(20,8) NOT NULL DEFAULT 0,
  leverage int(11) NOT NULL DEFAULT 1,
  status enum('OPEN','CLOSED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  pnl decimal(20,8) DEFAULT 0,
  pnl_percent decimal(10,4) DEFAULT 0,
  open_time datetime NOT NULL DEFAULT current_timestamp(),
  close_time datetime DEFAULT NULL,
  close_reason enum('TP','SL','MANUAL') DEFAULT NULL,
  signal_reason text,
  indicator_values json,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  updated_at datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  INDEX idx_symbol (symbol),
  INDEX idx_status (status),
  INDEX idx_open_time (open_time),
  INDEX idx_direction (direction),
  INDEX idx_close_reason (close_reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Varsayılan admin kullanıcı (şifre: admin123)
INSERT IGNORE INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@sametabi.trade', '$2a$10$xVqYLGEuG4jQFTKsLhJEruWXr7lQwBdGhS1vCZJmJxnnqf2DRO3Hy', 'admin');

-- --------------------------------------------------------
-- Telegram ham mesajlar
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS telegram_messages (
  id int(11) NOT NULL AUTO_INCREMENT,
  message_id bigint DEFAULT NULL,
  chat_id bigint DEFAULT NULL,
  sender varchar(255) DEFAULT NULL,
  raw_text text NOT NULL,
  received_at datetime NOT NULL DEFAULT current_timestamp(),
  parsed tinyint(1) NOT NULL DEFAULT 0,
  parse_success tinyint(1) DEFAULT NULL,
  error_message text DEFAULT NULL,
  PRIMARY KEY (id),
  INDEX idx_received (received_at),
  INDEX idx_parsed (parsed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Parse edilmiş sinyaller
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS signals (
  id int(11) NOT NULL AUTO_INCREMENT,
  telegram_message_id int(11) DEFAULT NULL,
  symbol varchar(50) NOT NULL,
  direction enum('LONG','SHORT') NOT NULL,
  entry_min decimal(20,8) DEFAULT NULL,
  entry_max decimal(20,8) DEFAULT NULL,
  stop_loss decimal(20,8) NOT NULL,
  take_profit_1 decimal(20,8) DEFAULT NULL,
  take_profit_2 decimal(20,8) DEFAULT NULL,
  take_profit_3 decimal(20,8) DEFAULT NULL,
  take_profit_4 decimal(20,8) DEFAULT NULL,
  leverage int DEFAULT NULL,
  status enum('PENDING','ACTIVE','FILLED','CANCELLED','EXPIRED','INVALID') NOT NULL DEFAULT 'PENDING',
  validity tinyint(1) NOT NULL DEFAULT 1,
  validation_notes text DEFAULT NULL,
  source varchar(100) DEFAULT 'telegram',
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  updated_at datetime DEFAULT NULL ON UPDATE current_timestamp(),
  expires_at datetime DEFAULT NULL,
  PRIMARY KEY (id),
  INDEX idx_symbol (symbol),
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  FOREIGN KEY (telegram_message_id) REFERENCES telegram_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Paper Trades (genişletilmiş trade tablosu)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS paper_trades (
  id int(11) NOT NULL AUTO_INCREMENT,
  signal_id int(11) DEFAULT NULL,
  symbol varchar(50) NOT NULL,
  direction enum('LONG','SHORT') NOT NULL,
  entry_price decimal(20,8) NOT NULL,
  current_price decimal(20,8) DEFAULT NULL,
  stop_loss decimal(20,8) NOT NULL,
  take_profit_1 decimal(20,8) DEFAULT NULL,
  take_profit_2 decimal(20,8) DEFAULT NULL,
  take_profit_3 decimal(20,8) DEFAULT NULL,
  take_profit_4 decimal(20,8) DEFAULT NULL,
  position_size decimal(20,8) NOT NULL,
  leverage int NOT NULL DEFAULT 1,
  commission decimal(20,8) DEFAULT 0,
  slippage decimal(20,8) DEFAULT 0,
  status enum('OPEN','CLOSED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  result_type enum('TP1','TP2','TP3','TP4','SL','BREAKEVEN','MANUAL','EXPIRED') DEFAULT NULL,
  exit_price decimal(20,8) DEFAULT NULL,
  pnl decimal(20,8) DEFAULT NULL,
  pnl_percent decimal(10,4) DEFAULT NULL,
  risk_amount decimal(20,8) DEFAULT NULL,
  reward_amount decimal(20,8) DEFAULT NULL,
  opened_at datetime NOT NULL DEFAULT current_timestamp(),
  closed_at datetime DEFAULT NULL,
  notes text DEFAULT NULL,
  PRIMARY KEY (id),
  INDEX idx_symbol (symbol),
  INDEX idx_status (status),
  INDEX idx_opened (opened_at),
  INDEX idx_closed (closed_at),
  FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Paper Trading Bakiye Geçmişi
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS balance_history (
  id int(11) NOT NULL AUTO_INCREMENT,
  balance decimal(20,8) NOT NULL,
  change_amount decimal(20,8) DEFAULT NULL,
  change_reason varchar(100) DEFAULT NULL,
  trade_id int(11) DEFAULT NULL,
  recorded_at datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  INDEX idx_recorded (recorded_at),
  FOREIGN KEY (trade_id) REFERENCES paper_trades(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Sistem Logları
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS system_logs (
  id int(11) NOT NULL AUTO_INCREMENT,
  level enum('DEBUG','INFO','WARN','ERROR','FATAL') NOT NULL DEFAULT 'INFO',
  module varchar(100) NOT NULL,
  message text NOT NULL,
  details text DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  INDEX idx_level (level),
  INDEX idx_module (module),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Sistem Ayarları
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  id int(11) NOT NULL AUTO_INCREMENT,
  setting_key varchar(100) NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description varchar(255) DEFAULT NULL,
  updated_at datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Varsayılan ayarlar
INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES
('paper_balance', '10000', 'Başlangıç paper trading bakiyesi'),
('risk_amount', '250', 'İşlem başına yatırılacak sabit veya risk miktarı ($)'),
('risk_percent', '0', 'Sermayenin yüzde kaçı ile girilecek (0 ise sabit tutar kullanılır)'),
('commission_rate', '0.04', 'Komisyon oranı (%)'),
('slippage', '0', 'Slippage simülasyonu (%)'),
('max_open_trades', '10', 'Maksimum eş zamanlı açık trade sayısı'),
('max_wait_minutes', '60', 'Sinyal entry bekleme süresi (dakika)'),
('default_leverage', '2', 'Varsayılan kaldıraç (Cross)'),
('reward_ratio', '2', 'Risk ödül oranı (1:X) - otomatik TP hesaplama için'),
('telegram_enabled', '1', 'Telegram entegrasyonu aktif'),
('binance_enabled', '1', 'Binance veri çekme aktif'),
('theme', 'dark', 'Arayüz teması');

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
