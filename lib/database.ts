import mysql from "mysql2/promise"

const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: Number.parseInt(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_USER || "mon_user",
  password: process.env.MYSQL_PASSWORD || "motdepasse_user",
  database: process.env.MYSQL_DATABASE || "ma_base",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

let pool: mysql.Pool | null = null

export function getDbConnection() {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

export interface User {
  id: number
  email: string
  brand_name: string
  company_name?: string
  industry?: string
  created_at: Date
  updated_at: Date
  is_active: boolean
}

export interface CreateUserData {
  email: string
  password: string
  brand_name: string
  company_name?: string
  industry?: string
}

export interface LoginData {
  email: string
  password: string
}
