"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, ArrowUpDown } from "lucide-react"
import type { Product } from "@/app/dashboard/page"
import { useBrand } from "@/contexts/brand-context"

interface CompetitiveTableProps {
  data: Product[]
}

type SortField = keyof Product | "pricePerGram" | "discountPercent"
type SortDirection = "asc" | "desc"

export function CompetitiveTable({ data }: CompetitiveTableProps) {
  const { brandInfo, formattedBrandName } = useBrand()
  const userBrand = formattedBrandName

  const [sortField, setSortField] = useState<SortField>("Brand")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case "pricePerGram":
        aValue = 0 //(a["Price After (TND)"] / a.Grammage) * 100
        bValue = 0 //(b["Price After (TND)"] / b.Grammage) * 100
        break
      case "discountPercent":
        aValue =
          a["Price Before (TND)"] > a["Price After (TND)"]
            ? ((a["Price Before (TND)"] - a["Price After (TND)"]) / a["Price Before (TND)"]) * 100
            : 0
        bValue =
          b["Price Before (TND)"] > b["Price After (TND)"]
            ? ((b["Price Before (TND)"] - b["Price After (TND)"]) / b["Price Before (TND)"]) * 100
            : 0
        break
      default:
        aValue = a[sortField as keyof Product]
        bValue = b[sortField as keyof Product]
    }

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-1 font-medium text-left justify-start"
    >
      {children}
      <ArrowUpDown className="w-3 h-3 ml-1" />
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Tableau Comparatif des Produits
          <Badge variant="outline">{data.length} produits</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">
                  <SortButton field="Product">Produit</SortButton>
                </th>
                <th className="text-left p-3 font-medium">
                  <SortButton field="Brand">Marque</SortButton>
                </th>
                <th className="text-left p-3 font-medium">
                  <SortButton field="Sous-famille">Sous-famille</SortButton>
                </th>
                <th className="text-left p-3 font-medium">
                  <SortButton field="Grammage">Grammage</SortButton>
                </th>
                <th className="text-left p-3 font-medium">
                  <SortButton field="Price Before (TND)">Prix permanent</SortButton>
                </th>
                <th className="text-left p-3 font-medium">
                  <SortButton field="Price After (TND)">Prix promotionnel</SortButton>
                </th>
                <th className="text-left p-3 font-medium">
                  <SortButton field="pricePerGram">Prix/100g</SortButton>
                </th>

                <th className="text-left p-3 font-medium">Période Promo</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Actions</th>
                <th className="text-left p-3 font-medium">Mécanisme de remise</th>
                <th className="text-left p-3 font-medium">
                  <SortButton field="discountPercent">Remise</SortButton>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((product, index) => {
                const isUserBrand = product.Brand?.toLowerCase().trim() === userBrand
                const grammageValue = product.Grammage
                const pricePerGram = (product["Price After (TND)"] / grammageValue) * 100
                const hasPromo = product["Price Before (TND)"] > product["Price After (TND)"]
                const discountPercent = hasPromo
                  ? ((product["Price Before (TND)"] - product["Price After (TND)"]) / product["Price Before (TND)"]) *
                    100
                  : 0

                return (
                  <tr
                    key={index}
                    className={`border-b hover:bg-gray-50 ${isUserBrand ? "bg-yellow-50 border-l-4 border-l-yellow-400" : ""}`}
                  >
                    <td className="p-3">
                      <div className="font-medium text-sm">{product.Product}</div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={isUserBrand ? "default" : "secondary"}
                        className={isUserBrand ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                      >
                        {product.Brand}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{product["Sous-famille"]}</td>
                    <td className="p-3 text-sm">{product.Grammage}</td>
                    <td className="p-3 text-sm">
                      {hasPromo ? (
                        <span className="line-through text-gray-500">
                          {product["Price Before (TND)"].toFixed(2)} TND
                        </span>
                      ) : (
                        <span>{product["Price Before (TND)"].toFixed(2)} TND</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`font-medium ${hasPromo ? "text-red-600" : ""}`}>
                        {product["Price After (TND)"].toFixed(2)} TND
                      </span>
                    </td>
                    <td className="p-3 text-sm font-mono">{pricePerGram.toFixed(2)} TND</td>

                    <td className="p-3 text-sm">
                      {hasPromo && product.promo_date_debut ? (
                        <span className="text-red-600 font-medium">{product.promo_date_debut}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col space-y-1">
                        {hasPromo && (
                          <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border-red-200">
                            PROMO
                          </Badge>
                        )}
                        {!hasPromo && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Normal
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={product.URL} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3">
                      {hasPromo ? (
                        <Badge variant="destructive" className="bg-red-500">
                          -{discountPercent.toFixed(0)}%
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
