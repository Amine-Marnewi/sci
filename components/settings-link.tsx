"use client"

import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import Link from "next/link"

export function SettingsLink() {
  return (
    <Link href="/settings">
      <Button variant="outline" size="sm">
        <Settings className="w-4 h-4 mr-2" />
        Paramètres
      </Button>
    </Link>
  )
}
