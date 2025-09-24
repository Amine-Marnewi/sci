"use client"

import { useState } from "react"
import { PDFUploadModal } from "@/components/pdf-upload-modal"
import { CatalogResultsTable } from "@/components/catalog-results-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, ArrowLeft } from "lucide-react"
import Link from "next/link"

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
}

export default function CatalogPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleUploadSuccess = (data: Product[]) => {
    setProducts(data)
    setShowResults(true)
  }

  const handleBack = () => {
    setShowResults(false)
    setProducts([])
  }

  if (showResults && products.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <CatalogResultsTable products={products} onBack={handleBack} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/welcome">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Extraction de Catalogues PDF</h1>
          <p className="text-lg text-gray-600">
            Téléchargez un catalogue PDF pour extraire automatiquement les produits et leurs informations
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Télécharger un Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                Notre système d'IA va analyser votre catalogue PDF et extraire automatiquement :
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="font-semibold text-green-700">Informations Produit</div>
                  <div className="text-green-600">Marque, nom, description</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="font-semibold text-yellow-700">Prix & Promotions</div>
                  <div className="text-yellow-600">Prix avant/après, remises</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="font-semibold text-blue-700">Catégorisation</div>
                  <div className="text-blue-600">Rayon, famille, sous-famille</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="font-semibold text-purple-700">Détails</div>
                  <div className="text-purple-600">Grammage, conditionnement</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button
                size="lg"
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600"
              >
                <Upload className="w-5 h-5 mr-2" />
                Télécharger un PDF
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">Formats supportés: PDF • Taille max: 50MB</div>
          </CardContent>
        </Card>
      </div>

      <PDFUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
