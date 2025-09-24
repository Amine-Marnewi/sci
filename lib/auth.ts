import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getDbConnection, type User, type CreateUserData, type LoginData } from "./database"
import type mysql from "mysql" // Declare the mysql variable

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string }
  } catch {
    return null
  }
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const db = getDbConnection()

  const hashedPassword = await hashPassword(userData.password)

  const [result] = await db.execute(
    "INSERT INTO users (email, password_hash, brand_name, company_name, industry) VALUES (?, ?, ?, ?, ?)",
    [userData.email, hashedPassword, userData.brand_name, userData.company_name || null, userData.industry || null],
  )

  const insertResult = result as mysql.ResultSetHeader

  const [rows] = await db.execute(
    "SELECT id, email, brand_name, company_name, industry, created_at, updated_at, is_active FROM users WHERE id = ?",
    [insertResult.insertId],
  )

  return (rows as User[])[0]
}

export async function authenticateUser(loginData: LoginData): Promise<User | null> {
  const db = getDbConnection()

  const [rows] = await db.execute(
    "SELECT id, email, password_hash, brand_name, company_name, industry, created_at, updated_at, is_active FROM users WHERE email = ? AND is_active = TRUE",
    [loginData.email],
  )

  const users = rows as (User & { password_hash: string })[]

  if (users.length === 0) {
    return null
  }

  const user = users[0]
  const isValidPassword = await verifyPassword(loginData.password, user.password_hash)

  if (!isValidPassword) {
    return null
  }

  // Remove password_hash from returned user object
  const { password_hash, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function getUserById(userId: number): Promise<User | null> {
  const db = getDbConnection()

  const [rows] = await db.execute(
    "SELECT id, email, brand_name, company_name, industry, created_at, updated_at, is_active FROM users WHERE id = ? AND is_active = TRUE",
    [userId],
  )

  const users = rows as User[]
  return users.length > 0 ? users[0] : null
}
