import os
import mysql.connector
from mysql.connector import errorcode

def init_database():
    # Database connection parameters
    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "mon_user")
    password = os.getenv("MYSQL_PASSWORD", "motdepasse_user")
    database = os.getenv("MYSQL_DATABASE", "ma_base")

    connection = None
    try:
        # Connect to MySQL
        connection = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        print("✅ Connected to MySQL database")

        cursor = connection.cursor()

        # Create table query
        create_table_query = """
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
        """

        cursor.execute(create_table_query)
        print("✅ Users table created successfully")

        # Verify table exists
        cursor.execute('SHOW TABLES LIKE "users"')
        result = cursor.fetchall()
        if result:
            print('✅ Table "users" exists and is ready to use')
        else:
            print('❌ Failed to create users table')

    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("❌ Something is wrong with your username or password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print(f"❌ Database '{database}' does not exist")
        else:
            print(f"❌ Database initialization failed: {err}")
    finally:
        if connection:
            connection.close()
            print("Database connection closed")

if __name__ == "__main__":
    init_database()
