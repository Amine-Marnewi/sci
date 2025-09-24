import { type NextRequest, NextResponse } from "next/server"
import { createUser } from "@/lib/auth"
import { generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, brandName, companyName, industry } = body

    // Validate required fields
    if (!email || !password || !brandName) {
      return NextResponse.json({ error: "Email, password, and brand name are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    const user = await createUser({
      email,
      password,
      brand_name: brandName,
      company_name: companyName,
      industry,
    })

    const token = generateToken(user.id, user.email)

    const response = NextResponse.json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        brandName: user.brand_name,
        companyName: user.company_name,
        industry: user.industry,
      },
    })

    // Set HTTP-only cookie for authentication
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error: any) {
    console.error("Signup error:", error)

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
