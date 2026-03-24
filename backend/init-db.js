require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  let conn;
  try {
    // Connect without database first to ensure schema exists
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('Connected to MySQL server.');

    // 1. Create DB if not exists
    const dbName = process.env.DB_NAME || 'bot';
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);
    console.log(`Using database: ${dbName}`);

    // 2. Read and apply schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log('Applying schema.sql...');
      await conn.query(schemaSql);
      console.log('Schema applied successfully.');
    } else {
      console.log('schema.sql not found at ' + schemaPath);
    }

    // 3. Update settings based on user request (kaldıraç 2, işlem 250, RR 1:2)
    console.log('Updating settings according to user request: 2x leverage, $250 size, 1:2 RR...');
    await conn.query(`
      INSERT INTO settings (setting_key, setting_value, description)
      VALUES 
        ('risk_amount', '250', 'İşlem başına kullanılacak miktar ($) (Eğer risk_percent 0 ise)'),
        ('risk_percent', '0', 'Sabit 250$ girmek için risk yüzdesi 0 olmalı'),
        ('default_leverage', '2', 'Varsayılan kaldıraç (Cross)'),
        ('reward_ratio', '2', 'Risk ödül oranı (1:X) - SL\\'ye göre TP belirleme')
      ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value);
    `);
    console.log('Settings updated.');

    await conn.end();
    console.log('✅ Initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during init:', err);
    if (conn) await conn.end();
    process.exit(1);
  }
}

run();
