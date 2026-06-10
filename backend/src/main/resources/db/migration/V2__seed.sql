-- Настройки по умолчанию
INSERT INTO settings (key, value) VALUES
  ('global_markup_percent', '30'),
  ('rounding_rule', 'TO_1'),
  ('rate_mode', 'BANK'),
  ('delivery_fee_mdl', '50'),
  ('pickup_address', 'Кишинёв — укажите адрес точки самовывоза в настройках'),
  ('pickup_hours', 'Пн–Сб 9:00–18:00'),
  ('photo_max_size_mb', '10'),
  ('snapshot_keep_count', '30');

-- Админ по умолчанию: admin / sacramento2026 (сменить пароль после первого входа!)
INSERT INTO admin_users (username, password_hash) VALUES
  ('admin', '$2y$10$HT/X4mvXQWUSAMVqzRjY0.uFNeaQ/C8xFlSRHQ/KporUED/GP2E1y');

-- Справочник WMI (первые 3 символа VIN -> производитель)
INSERT INTO wmi_codes (wmi, make) VALUES
  -- Audi
  ('WAU','Audi'),('WA1','Audi'),('TRU','Audi'),
  -- Volkswagen
  ('WVW','Volkswagen'),('WV1','Volkswagen'),('WV2','Volkswagen'),('WVG','Volkswagen'),
  ('1VW','Volkswagen'),('3VW','Volkswagen'),('9BW','Volkswagen'),('AAV','Volkswagen'),
  -- Porsche
  ('WP0','Porsche'),('WP1','Porsche'),
  -- BMW / Mini
  ('WBA','BMW'),('WBS','BMW'),('WBY','BMW'),('WBX','BMW'),('4US','BMW'),('5UX','BMW'),
  ('WMW','Mini'),
  -- Mercedes-Benz / Smart
  ('WDB','Mercedes-Benz'),('WDC','Mercedes-Benz'),('WDD','Mercedes-Benz'),
  ('W1K','Mercedes-Benz'),('W1N','Mercedes-Benz'),('W1V','Mercedes-Benz'),
  ('4JG','Mercedes-Benz'),('WME','Smart'),
  -- Skoda / Seat
  ('TMB','Skoda'),('VSS','Seat'),
  -- Toyota / Lexus
  ('JTD','Toyota'),('JTE','Toyota'),('JTM','Toyota'),('JTN','Toyota'),('JTB','Toyota'),
  ('SB1','Toyota'),('VNK','Toyota'),('2T1','Toyota'),('4T1','Toyota'),('5TD','Toyota'),
  ('MR0','Toyota'),('JTH','Lexus'),('JTJ','Lexus'),('2T2','Lexus'),
  -- Honda / Acura
  ('JHM','Honda'),('SHH','Honda'),('1HG','Honda'),('2HG','Honda'),('JH4','Acura'),
  -- Nissan / Infiniti
  ('JN1','Nissan'),('JN8','Nissan'),('SJN','Nissan'),('VSK','Nissan'),
  ('1N4','Nissan'),('5N1','Nissan'),('JNK','Infiniti'),('JNR','Infiniti'),
  -- Mazda
  ('JM1','Mazda'),('JMZ','Mazda'),('JM3','Mazda'),
  -- Mitsubishi
  ('JA3','Mitsubishi'),('JA4','Mitsubishi'),('JMB','Mitsubishi'),('JMY','Mitsubishi'),
  ('MMB','Mitsubishi'),
  -- Suzuki / Subaru
  ('JSA','Suzuki'),('TSM','Suzuki'),
  ('JF1','Subaru'),('JF2','Subaru'),('4S3','Subaru'),('4S4','Subaru'),
  -- Kia
  ('KNA','Kia'),('KND','Kia'),('KNE','Kia'),('U5Y','Kia'),('U6Y','Kia'),
  -- Hyundai / Genesis
  ('KMH','Hyundai'),('KM8','Hyundai'),('TMA','Hyundai'),('NLH','Hyundai'),
  ('KMG','Genesis'),('KMU','Genesis'),
  -- Renault / Dacia
  ('VF1','Renault'),('VF2','Renault'),('UU1','Dacia'),
  -- Peugeot / Citroen / Opel
  ('VF3','Peugeot'),('VF7','Citroen'),('W0L','Opel'),('W0V','Opel'),
  -- Ford
  ('WF0','Ford'),('1FA','Ford'),('1FT','Ford'),('1FM','Ford'),('NM0','Ford'),
  -- Fiat / Alfa Romeo / Lancia
  ('ZFA','Fiat'),('ZAR','Alfa Romeo'),('ZLA','Lancia'),
  -- Ferrari / Lamborghini / Maserati
  ('ZFF','Ferrari'),('ZHW','Lamborghini'),('ZAM','Maserati'),
  -- Volvo / Saab
  ('YV1','Volvo'),('YV4','Volvo'),('YS3','Saab'),
  -- Jaguar / Land Rover
  ('SAJ','Jaguar'),('SAL','Land Rover'),
  -- Rolls-Royce / Bentley / Aston Martin
  ('SCA','Rolls-Royce'),('SCB','Bentley'),('SCF','Aston Martin'),
  -- Chevrolet / Cadillac / Daewoo
  ('1G1','Chevrolet'),('2G1','Chevrolet'),('KL1','Chevrolet'),('KL8','Chevrolet'),
  ('1G6','Cadillac'),('1GY','Cadillac'),('KLA','Daewoo'),
  -- Chrysler / Jeep / Dodge / Ram
  ('1C3','Chrysler'),('2C3','Chrysler'),('1J4','Jeep'),('1C4','Jeep'),
  ('1B3','Dodge'),('2B3','Dodge'),('3C6','Ram'),
  -- Tesla
  ('5YJ','Tesla'),('7SA','Tesla'),('LRW','Tesla'),
  -- СНГ
  ('XTA','Lada'),('XTH','GAZ'),('XTT','UAZ'),
  -- Прочее
  ('ZCF','Iveco'),('WMA','MAN');
