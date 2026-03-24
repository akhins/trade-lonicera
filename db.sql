-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Anamakine: 127.0.0.1
-- Üretim Zamanı: 24 Mar 2026, 10:01:36
-- Sunucu sürümü: 10.4.32-MariaDB
-- PHP Sürümü: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Veritabanı: bot
--

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı parite
--

CREATE TABLE parite (
  id int(11) NOT NULL,
  parite varchar(244) NOT NULL,
  mesajzamani timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi parite
--

INSERT INTO parite (id, parite, mesajzamani) VALUES
(11, 'JASMYUSDT', '2026-03-23 07:51:03'),
(12, 'VELODROMEUSDT', '2026-03-23 07:55:16'),
(13, 'CETUSUSDT', '2026-03-23 09:05:21'),
(14, 'PIPPINUSDT', '2026-03-23 16:20:53'),
(15, 'CARVUSDT', '2026-03-23 17:37:56'),
(16, 'PIEVERSEUSDT', '2026-03-24 05:24:28'),
(17, 'MELANIAUSDT', '2026-03-24 05:51:41'),
(18, 'ZECUSDT', '2026-03-24 07:00:26'),
(19, 'AMZNUSDT', '2026-03-24 07:10:25'),
(20, 'SUSHIUSDT', '2026-03-24 07:15:52'),
(21, 'MINAUSDT', '2026-03-24 07:17:17'),
(22, 'SUIUSDT', '2026-03-24 07:17:40'),
(23, 'DODOXUSDT', '2026-03-24 07:17:54'),
(24, 'WALUSDT', '2026-03-24 07:21:22'),
(25, 'CVXUSDT', '2026-03-24 07:23:09'),
(26, 'XPLUSDT', '2026-03-24 07:23:30'),
(27, 'STXUSDT', '2026-03-24 07:32:47'),
(28, 'XRPUSDT', '2026-03-24 07:49:21'),
(29, 'AAVEUSDT', '2026-03-24 07:50:11'),
(30, 'HFTUSDT', '2026-03-24 08:03:01'),
(31, '1MBABYDOGEUSDT', '2026-03-24 08:19:29'),
(32, 'FLOCKUSDT', '2026-03-24 08:23:51'),
(33, 'ONTUSDT', '2026-03-24 08:45:59'),
(34, 'TUSDT', '2026-03-24 08:47:44'),
(35, 'LAYERUSDT', '2026-03-24 08:51:26'),
(36, 'INITUSDT', '2026-03-24 08:52:07'),
(37, 'NEWTUSDT', '2026-03-24 08:52:55');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı pozisyonlar
--

CREATE TABLE pozisyonlar (
  id int(11) NOT NULL,
  parite varchar(244) NOT NULL,
  entry_price varchar(244) NOT NULL,
  stop_price varchar(244) NOT NULL,
  tp_price varchar(244) NOT NULL,
  LONGSHORT varchar(244) NOT NULL,
  status varchar(244) NOT NULL,
  zaman datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi pozisyonlar
--

INSERT INTO pozisyonlar (id, parite, entry_price, stop_price, tp_price, LONGSHORT, status, zaman) VALUES
(1, 'FLOCKUSDT', '0.05921', '0.0605', '0.0567', 'SHORT', 'OPEN', '2026-03-24 11:26:07'),
(2, '1MBABYDOGEUSDT', '0.0004188', '0.0004', '0.0004', 'LONG', 'OPEN', '2026-03-24 11:26:07'),
(3, 'NEWTUSDT', '0.07231', '0.0731', '0.0708', 'SHORT', 'OPEN', '2026-03-24 11:56:06'),
(4, 'INITUSDT', '0.08153', '0.0824', '0.0798', 'SHORT', 'OPEN', '2026-03-24 11:56:06'),
(5, 'LAYERUSDT', '0.08445', '0.0839', '0.0855', 'LONG', 'OPEN', '2026-03-24 11:56:06'),
(6, 'TUSDT', '0.00661', '0.0067', '0.0065', 'SHORT', 'OPEN', '2026-03-24 11:56:06'),
(7, 'ONTUSDT', '0.0433', '0.0438', '0.0422', 'SHORT', 'OPEN', '2026-03-24 11:56:06');

--
-- Dökümü yapılmış tablolar için indeksler
--

--
-- Tablo için indeksler parite
--
ALTER TABLE parite
  ADD PRIMARY KEY (id);

--
-- Tablo için indeksler pozisyonlar
--
ALTER TABLE pozisyonlar
  ADD PRIMARY KEY (id);

--
-- Dökümü yapılmış tablolar için AUTO_INCREMENT değeri
--

--
-- Tablo için AUTO_INCREMENT değeri parite
--
ALTER TABLE parite
  MODIFY id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- Tablo için AUTO_INCREMENT değeri pozisyonlar
--
ALTER TABLE pozisyonlar
  MODIFY id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;