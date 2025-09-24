"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import type { Product } from "@/app/dashboard/page"

interface CSVUploaderProps {
  onUpload: (data: Product[]) => void
}

export function CSVUploader({ onUpload }: CSVUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectDelimiter = (line: string): string => {
    const delimiters = [",", ";", "\t", "|"]
    const counts = delimiters.map((d) => (line.match(new RegExp(`\\${d}`, "g")) || []).length)
    const maxCount = Math.max(...counts)
    return maxCount > 0 ? delimiters[counts.indexOf(maxCount)] : ","
  }

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ""))
        current = ""
      } else {
        current += char
      }
    }

    result.push(current.trim().replace(/^"|"$/g, ""))
    return result
  }

  const normalizeHeader = (header: string): string => {
    return header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const text = await file.text()
      const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim())

      if (lines.length < 2) {
        alert("Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données.")
        return
      }

      // Détecter le délimiteur à partir de la première ligne
      const delimiter = detectDelimiter(lines[0])

      // Parser les en-têtes
      const headers = parseCSVLine(lines[0], delimiter).map((header) => header.trim())
      const normalizedHeaders = headers.map(normalizeHeader)

      // Vérifier les colonnes requises
      const requiredFields = [
        "product",
        "brand",
        "rayon",
        "famille",
        "sous_famille",
        "grammage",
        "price_before_tnd",
        "price_after_tnd",
        "url",
        "promo_date_debut",
        "promo_date_fin",
      ]

      const missingFields = requiredFields.filter((field) => !normalizedHeaders.includes(field))

      if (missingFields.length > 0) {
        alert(`Champs manquants dans le CSV: ${missingFields.join(", ")}.\n\nEn-têtes détectés: ${headers.join(", ")}`)
        return
      }

      const data: Product[] = []
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue

        try {
          const values = parseCSVLine(lines[i], delimiter)

          if (values.length !== headers.length) {
            errors.push(`Ligne ${i + 1}: Nombre de colonnes incorrect (${values.length} au lieu de ${headers.length})`)
            continue
          }

          const product: any = {}
          headers.forEach((header, index) => {
            const normalizedHeader = normalizeHeader(header)
            let value: any = values[index] || ""

            // Conversion des types
            if (["grammage", "price_before_tnd", "price_after_tnd"].includes(normalizedHeader)) {
              // Remplacer les virgules par des points pour les nombres
              value = value.toString().replace(",", ".")
              value = Number.parseFloat(value) || 0
            }

            product[normalizedHeader] = value
          })

          // Mapper les noms normalisés aux noms attendus par l'interface Product
          const mappedProduct: Product = {
            Product: product.product || "",
            Brand: product.brand || "",
            Rayon: product.rayon || "",
            Famille: product.famille || "",
            "Sous-famille": product.sous_famille || "",
            Grammage: product.grammage || 0,
            "Price Before (TND)": product.price_before_tnd || 0,
            "Price After (TND)": product.price_after_tnd || 0,
            URL: product.url || "",
            promo_date_debut: product.promo_date_debut || "",
            promo_date_fin: product.promo_date_fin || "",
          }

          data.push(mappedProduct)
        } catch (error) {
          errors.push(`Ligne ${i + 1}: Erreur de traitement - ${error}`)
        }
      }

      if (errors.length > 0) {
        console.error("Erreurs d'importation:", errors)
      }

      if (data.length === 0) {
        alert("Aucune donnée valide trouvée. Vérifiez le format de votre fichier CSV.")
        return
      }

      onUpload(data)
      alert(`${data.length} produits importés avec succès ! ${errors.length > 0 ? `(${errors.length} erreurs)` : ""}`)
    } catch (error) {
      console.error("Erreur lors de l'import:", error)
      alert("Erreur lors de l'import du fichier. Vérifiez le format CSV.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
      <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline" size="sm">
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? "Import..." : "Importer CSV"}
      </Button>
    </>
  )
}
