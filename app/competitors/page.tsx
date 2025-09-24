"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  ShoppingCart,
  DollarSign,
  Percent,
  Target,
  Award,
  AlertTriangle,
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  Settings,
  RefreshCw,
} from "lucide-react"
import { useBrand, useBrandTheme } from "@/contexts/brand-context"
import { useRequireAuth } from "@/hooks/use-auth"
import { useBrandData } from "@/hooks/use-brand-data"
import { dataManager } from "@/lib/data-manager"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Product } from "@/app/dashboard/page"

interface CompetitorInsight {
  brand: string
  products: Product[]
  totalProducts: number
  avgPrice: number
  promoRate: number
  categories: Set<string>
  categoriesCount: number
  minPrice: number
  maxPrice: number
  marketShare: number
  priceCompetitiveness: number
  threatLevel: "low" | "medium" | "high"
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
}

export default function CompetitorsPage() {
  const isAuthenticated = useRequireAuth()
  const { brandInfo } = useBrand()
  const { brandColors, brandName } = useBrandTheme()
  const router = useRouter()

  const { data: userBrandData, dataSource, isLoading, error, refreshData, hasData } = useBrandData()

  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("threat")
  const [filterBy, setFilterBy] = useState("all")

  const competitorAnalysis = useMemo((): CompetitorInsight[] => {
    const userBrand = brandInfo.brandName || "SAÏDA"

    const competitorDataResult = dataManager.getCompetitorData(userBrand)
    if (!competitorDataResult) {
      console.log(`[v0] No competitor data found for brand: ${userBrand}`)
      return []
    }

    const { allData, competitors } = competitorDataResult
    const userProducts = allData.filter(
      (product) => product.Brand && product.Brand.toLowerCase().trim() === userBrand.toLowerCase().trim(),
    )

    console.log(`[v0] Analyzing ${competitors.length} competitors for ${userBrand}`)
    console.log(`[v0] User brand has ${userProducts.length} products`)

    if (competitors.length === 0) return []

    const competitorInsights = competitors.reduce(
      (acc, competitorBrand) => {
        const competitorProducts = allData.filter(
          (product) => product.Brand && product.Brand.toLowerCase().trim() === competitorBrand.toLowerCase().trim(),
        )

        if (competitorProducts.length === 0) return acc

        acc[competitorBrand] = {
          brand: competitorBrand,
          products: competitorProducts,
          totalProducts: competitorProducts.length,
          avgPrice: 0,
          promoRate: 0,
          categories: new Set(),
          categoriesCount: 0,
          minPrice: Number.POSITIVE_INFINITY,
          maxPrice: 0,
          marketShare: 0,
          priceCompetitiveness: 0,
          threatLevel: "low" as const,
          strengths: [],
          weaknesses: [],
          opportunities: [],
        }

        competitorProducts.forEach((product) => {
          acc[competitorBrand].categories.add(product["Sous-famille"])

          const price = product["Price After (TND)"]
          if (!isNaN(price) && price > 0) {
            acc[competitorBrand].minPrice = Math.min(acc[competitorBrand].minPrice, price)
            acc[competitorBrand].maxPrice = Math.max(acc[competitorBrand].maxPrice, price)
          }
        })

        return acc
      },
      {} as Record<string, CompetitorInsight>,
    )

    const totalMarketProducts = allData.length
    const userAvgPrice =
      userProducts.length > 0
        ? userProducts.reduce((sum, p) => sum + (p["Price After (TND)"] || 0), 0) / userProducts.length
        : 0

    Object.values(competitorInsights).forEach((competitor) => {
      const validPrices = competitor.products
        .map((p) => p["Price After (TND)"])
        .filter((price) => !isNaN(price) && price > 0)

      competitor.avgPrice =
        validPrices.length > 0 ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length : 0

      const promoProducts = competitor.products.filter((p) => p.promo_date_debut && p.promo_date_fin)
      competitor.promoRate = competitor.totalProducts > 0 ? (promoProducts.length / competitor.totalProducts) * 100 : 0

      competitor.categoriesCount = competitor.categories.size
      competitor.minPrice = competitor.minPrice === Number.POSITIVE_INFINITY ? 0 : competitor.minPrice
      competitor.marketShare = (competitor.totalProducts / totalMarketProducts) * 100

      competitor.priceCompetitiveness =
        userAvgPrice > 0 ? ((competitor.avgPrice - userAvgPrice) / userAvgPrice) * 100 : 0

      if (competitor.marketShare > 25 || (competitor.priceCompetitiveness < -15 && competitor.promoRate > 30)) {
        competitor.threatLevel = "high"
      } else if (competitor.marketShare > 15 || competitor.categoriesCount >= 3) {
        competitor.threatLevel = "medium"
      } else {
        competitor.threatLevel = "low"
      }

      competitor.strengths = []
      competitor.weaknesses = []
      competitor.opportunities = []

      if (competitor.priceCompetitiveness < -10) {
        competitor.strengths.push("Prix compétitifs")
      }
      if (competitor.promoRate > 25) {
        competitor.strengths.push("Activité promotionnelle élevée")
      }
      if (competitor.categoriesCount >= 4) {
        competitor.strengths.push("Large gamme de produits")
      }
      if (competitor.marketShare > 20) {
        competitor.strengths.push("Forte présence marché")
      }

      if (competitor.priceCompetitiveness > 15) {
        competitor.weaknesses.push("Prix élevés")
      }
      if (competitor.promoRate < 10) {
        competitor.weaknesses.push("Peu d'activité promotionnelle")
      }
      if (competitor.categoriesCount <= 2) {
        competitor.weaknesses.push("Gamme limitée")
      }

      const userCategories = new Set(userProducts.map((p) => p["Sous-famille"]))
      competitor.categories.forEach((category) => {
        if (!userCategories.has(category)) {
          competitor.opportunities.push(`Absent en ${category}`)
        }
      })
    })

    console.log(`[v0] Generated insights for ${Object.keys(competitorInsights).length} competitors`)
    return Object.values(competitorInsights)
  }, [brandInfo.brandName])

  const filteredCompetitors = useMemo(() => {
    const filtered = competitorAnalysis.filter((competitor) => {
      const matchesSearch = competitor.brand.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterBy === "all" || competitor.threatLevel === filterBy
      return matchesSearch && matchesFilter
    })

    switch (sortBy) {
      case "threat":
        filtered.sort((a, b) => {
          const threatOrder = { high: 3, medium: 2, low: 1 }
          return threatOrder[b.threatLevel] - threatOrder[a.threatLevel]
        })
        break
      case "products":
        filtered.sort((a, b) => b.totalProducts - a.totalProducts)
        break
      case "price":
        filtered.sort((a, b) => b.avgPrice - a.avgPrice)
        break
      case "market-share":
        filtered.sort((a, b) => b.marketShare - a.marketShare)
        break
      case "promo":
        filtered.sort((a, b) => b.promoRate - a.promoRate)
        break
      default:
        break
    }

    return filtered
  }, [competitorAnalysis, searchTerm, sortBy, filterBy])

  const marketInsights = useMemo(() => {
    const totalCompetitorProducts = competitorAnalysis.reduce((sum, c) => sum + c.totalProducts, 0)
    const avgMarketPrice =
      competitorAnalysis.length > 0
        ? competitorAnalysis.reduce((sum, c) => sum + c.avgPrice, 0) / competitorAnalysis.length
        : 0
    const avgPromoRate =
      competitorAnalysis.length > 0
        ? competitorAnalysis.reduce((sum, c) => sum + c.promoRate, 0) / competitorAnalysis.length
        : 0

    const highThreatCompetitors = competitorAnalysis.filter((c) => c.threatLevel === "high").length
    const topCompetitor =
      competitorAnalysis.length > 0
        ? competitorAnalysis.reduce((top, current) => (current.marketShare > top.marketShare ? current : top))
        : null

    return {
      totalCompetitors: competitorAnalysis.length,
      totalProducts: totalCompetitorProducts,
      avgPrice: avgMarketPrice,
      avgPromoRate,
      highThreatCount: highThreatCompetitors,
      topCompetitor,
    }
  }, [competitorAnalysis])

  const getBrandColors = (brandName: string) => {
    const colors = {
      CARTHAGE: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      SICAM: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
      GOULETTE: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
      DELICE: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
      VITALAIT: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    }
    return (
      colors[brandName as keyof typeof colors] || {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
      }
    )
  }

  const getThreatBadge = (threatLevel: string) => {
    switch (threatLevel) {
      case "high":
        return { label: "Menace élevée", color: "bg-red-500", icon: AlertTriangle }
      case "medium":
        return { label: "Concurrent actif", color: "bg-yellow-500", icon: Target }
      case "low":
        return { label: "Concurrent mineur", color: "bg-green-500", icon: Award }
      default:
        return { label: "Non évalué", color: "bg-gray-500", icon: Target }
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Analyse des concurrents en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      <header
        className="bg-white shadow-sm border-b-4"
        style={{ borderBottomColor: `var(--color-${brandColors.accent})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour au Dashboard</span>
              </Button>
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${brandColors.primary} rounded-lg flex items-center justify-center`}
                >
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Analyse des Concurrents</h1>
                  <p className="text-sm text-gray-600">Mapping intelligent de la concurrence pour {brandName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">Erreur lors du chargement des données: {error}</AlertDescription>
          </Alert>
        )}

        {competitorAnalysis.length === 0 && !isLoading && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              Aucune donnée de concurrent disponible. Importez un fichier CSV contenant des données de marché pour
              analyser vos concurrents automatiquement.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className={`border-l-4 border-l-${brandColors.accent}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Concurrents Actifs</p>
                  <p className="text-2xl font-bold text-gray-900">{marketInsights.totalCompetitors}</p>
                </div>
                <Users className={`w-8 h-8 text-${brandColors.secondary}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Produits Concurrents</p>
                  <p className="text-2xl font-bold text-gray-900">{marketInsights.totalProducts}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Prix Moyen Marché</p>
                  <p className="text-2xl font-bold text-gray-900">{marketInsights.avgPrice.toFixed(2)} TND</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux Promo Moyen</p>
                  <p className="text-2xl font-bold text-gray-900">{marketInsights.avgPromoRate.toFixed(1)}%</p>
                </div>
                <Percent className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Menaces Élevées</p>
                  <p className="text-2xl font-bold text-red-600">{marketInsights.highThreatCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtres et Recherche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher un concurrent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Trier par..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="threat">Niveau de menace</SelectItem>
                  <SelectItem value="market-share">Part de marché</SelectItem>
                  <SelectItem value="products">Nombre de produits</SelectItem>
                  <SelectItem value="price">Prix moyen</SelectItem>
                  <SelectItem value="promo">Taux de promotion</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par menace..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="high">Menace élevée</SelectItem>
                  <SelectItem value="medium">Menace moyenne</SelectItem>
                  <SelectItem value="low">Menace faible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitors.map((competitor) => {
            const brandColors = getBrandColors(competitor.brand)
            const threatBadge = getThreatBadge(competitor.threatLevel)
            const ThreatIcon = threatBadge.icon

            return (
              <Card
                key={competitor.brand}
                className={`${brandColors.border} border-2 hover:shadow-lg transition-shadow`}
              >
                <CardHeader className={`${brandColors.bg} ${brandColors.text}`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{competitor.brand}</CardTitle>
                    <Badge className={`${threatBadge.color} text-white`}>
                      <ThreatIcon className="w-3 h-3 mr-1" />
                      {threatBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Produits</p>
                      <p className="text-2xl font-bold text-gray-900">{competitor.totalProducts}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Part de marché</p>
                      <p className="text-2xl font-bold text-gray-900">{competitor.marketShare.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">Prix vs {brandName}</p>
                      <div className="flex items-center">
                        {competitor.priceCompetitiveness > 0 ? (
                          <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                        )}
                        <span
                          className={`text-sm font-bold ${
                            competitor.priceCompetitiveness > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {competitor.priceCompetitiveness > 0 ? "+" : ""}
                          {competitor.priceCompetitiveness.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{competitor.avgPrice.toFixed(2)} TND</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-600">Activité promotionnelle</p>
                      <span className="text-sm font-bold">{competitor.promoRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={competitor.promoRate} className="h-2" />
                  </div>

                  {competitor.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">Forces:</p>
                      <div className="flex flex-wrap gap-1">
                        {competitor.strengths.slice(0, 2).map((strength, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-green-700 border-green-300">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {competitor.opportunities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-blue-700 mb-1">Opportunités:</p>
                      <div className="flex flex-wrap gap-1">
                        {competitor.opportunities.slice(0, 2).map((opportunity, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-blue-700 border-blue-300">
                            {opportunity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredCompetitors.length === 0 && competitorAnalysis.length > 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun concurrent trouvé</h3>
              <p className="text-gray-500">
                {searchTerm
                  ? "Aucun concurrent ne correspond à votre recherche."
                  : "Aucune donnée de concurrent disponible avec les filtres sélectionnés."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
