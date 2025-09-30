"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, ArrowLeft } from "lucide-react"

interface Product {
  Brand: string | null
  Product: string | null
  Rayon: string | null
  Famille: string | null
  "Sous-famille": string | null
  Grammage: string | null
  "Price Before (TND)": string | null
  "Price After (TND)": string | null
  URL: string | null
  promo_date_debut: string | null
  promo_date_fin: string | null
  Source?: string | null
}

interface CatalogResultsTableProps {
  products: Product[]
  onBack: () => void
}

export function CatalogResultsTable({ products, onBack }: CatalogResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(products.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProducts = products.slice(startIndex, endIndex)

  const exportToCSV = () => {
    const headers = Object.keys(products[0] || {})
    const csvContent = [
      headers.join(","),
      ...products.map((product) => headers.map((header) => `"${product[header as keyof Product] || ""}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `catalogue-products-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Résultats du Catalogue</h2>
            <p className="text-gray-600">{products.length} produits extraits</p>
          </div>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produits Extraits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Rayon</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead>Sous-famille</TableHead>
                  <TableHead>Grammage</TableHead>
                  <TableHead>Prix Avant</TableHead>
                  <TableHead>Prix Après</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Date Début</TableHead>
                  <TableHead>Date Fin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {product.Source ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                          {product.Source}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.Brand ? (
                        <Badge variant="outline">{product.Brand}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={product.Product || ""}>
                        {product.Product || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.Rayon ? (
                        <Badge variant="secondary">{product.Rayon}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <div className="truncate" title={product.Famille || ""}>
                        {product.Famille || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <div className="truncate" title={product["Sous-famille"] || ""}>
                        {product["Sous-famille"] || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{product.Grammage || "-"}</TableCell>
                    <TableCell>
                      {product["Price Before (TND)"] ? (
                        <span className="line-through text-gray-500">{product["Price Before (TND)"]} TND</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product["Price After (TND)"] ? (
                        <span className="font-semibold text-green-600">{product["Price After (TND)"]} TND</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[100px]">
                      {product.URL ? (
                        <a 
                          href={product.URL} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block"
                          title={product.URL}
                        >
                          Lien
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {product.promo_date_debut || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {product.promo_date_fin || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Affichage de {startIndex + 1} à {Math.min(endIndex, products.length)} sur {products.length} produits
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}