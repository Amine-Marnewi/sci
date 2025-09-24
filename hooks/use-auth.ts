"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useBrand } from "@/contexts/brand-context"

export function useAuthRedirect() {
  const { isAuthenticated } = useBrand()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/welcome")
    }
  }, [isAuthenticated, router])

  return isAuthenticated
}

export function useRequireAuth() {
  const { isAuthenticated } = useBrand()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  return isAuthenticated
}
