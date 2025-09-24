const mysql = require("mysql2/promise")

async function initDatabase() {
  let connection

  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: Number.parseInt(process.env.MYSQL_PORT || "3306"),
      user: process.env.MYSQL_USER || "mon_user",
      password: process.env.MYSQL_PASSWORD || "motdepasse_user",
      database: process.env.MYSQL_DATABASE || "ma_base",
    })

    console.log("Connected to MySQL database")

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        brand_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        industry VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_email (email),
        INDEX idx_brand_name (brand_name),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `

    await connection.execute(createTableQuery)
    console.log("✅ Users table created successfully")

    const [rows] = await connection.execute('SHOW TABLES LIKE "users"')
    if (rows.length > 0) {
      console.log('✅ Table "users" exists and is ready to use')
    } else {
      console.log("❌ Failed to create users table")
    }
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log("Database connection closed")
    }
  }
}

initDatabase()
