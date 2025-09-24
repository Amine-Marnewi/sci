"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Download,
  Target,
  BarChart3,
  LogOut,
  User,
  Settings,
  RefreshCw,
  Database,
  AlertCircle,
  ChevronDown,
  Home,
} from "lucide-react"
import { CompetitiveTable } from "@/components/competitive-table"
import { KPIDashboard } from "@/components/kpi-dashboard"
import { PriceAnalysisChart } from "@/components/price-analysis-chart"
import { MarketShareChart } from "@/components/market-share-chart"
import { CompetitivePositioning } from "@/components/competitive-positioning"
import { CompetitorsList } from "@/components/competitors-list"
import { CSVUploader } from "@/components/csv-uploader"
import { useBrand, useBrandTheme } from "@/contexts/brand-context"
import { useRequireAuth } from "@/hooks/use-auth"
import { useBrandData } from "@/hooks/use-brand-data"
import { useRouter } from "next/navigation"
import Link from "next/link"

export interface Product {
  Product: string
  Brand: string
  Rayon: string
  Famille: string
  "Sous-famille": string
  Grammage: number
  "Price Before (TND)": number
  "Price After (TND)": number
  URL: string
  promo_date_debut: string
  promo_date_fin: string
}

export default function DashboardPage() {
  const isAuthenticated = useRequireAuth()
  const { brandInfo, logout } = useBrand()
  const { brandColors, brandName, companyName, industry } = useBrandTheme()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dashboard")

  console.log("[v0] Brand context values:", {
    brandInfo,
    brandName,
    formattedBrandName: brandInfo.brandName.toLowerCase().trim(),
  })

  const { data, dataSource, isLoading, error, refreshData, importCSV, clearCache, hasData } = useBrandData()

  const [filters, setFilters] = useState({
    rayon: "all",
    sousFamille: "all",
    marque: "all",
    priceMin: "",
    priceMax: "",
    grammageMin: "",
    grammageMax: "",
    promoOnly: false,
    searchTerm: "",
  })

  const filteredData = useMemo(() => {
    return data.filter((product) => {
      const matchesRayon = filters.rayon === "all" || product.Rayon === filters.rayon
      const matchesSousFamille = filters.sousFamille === "all" || product["Sous-famille"] === filters.sousFamille
      const matchesMarque = filters.marque === "all" || product.Brand === filters.marque

      const priceMin = filters.priceMin ? Number.parseFloat(filters.priceMin) : null
      const priceMax = filters.priceMax ? Number.parseFloat(filters.priceMax) : null
      const grammageMin = filters.grammageMin ? Number.parseFloat(filters.grammageMin) : null
      const grammageMax = filters.grammageMax ? Number.parseFloat(filters.grammageMax) : null

      const matchesPriceMin = priceMin === null || (!isNaN(priceMin) && product["Price After (TND)"] >= priceMin)
      const matchesPriceMax = priceMax === null || (!isNaN(priceMax) && product["Price After (TND)"] <= priceMax)
      const matchesGrammageMin = grammageMin === null || (!isNaN(grammageMin) && product.Grammage >= grammageMin)
      const matchesGrammageMax = grammageMax === null || (!isNaN(grammageMax) && product.Grammage <= grammageMax)

      const matchesPromo = !filters.promoOnly || (product.promo_date_debut && product.promo_date_fin)
      const matchesSearch =
        !filters.searchTerm ||
        product.Product.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        product.Brand.toLowerCase().includes(filters.searchTerm.toLowerCase())

      return (
        matchesRayon &&
        matchesSousFamille &&
        matchesMarque &&
        matchesPriceMin &&
        matchesPriceMax &&
        matchesGrammageMin &&
        matchesGrammageMax &&
        matchesPromo &&
        matchesSearch
      )
    })
  }, [data, filters])

  const uniqueRayons = [...new Set(data.map((p) => p.Rayon))]
  const uniqueSousFamilles = [...new Set(data.map((p) => p["Sous-famille"]))].filter(
    (sf) => sf.toLowerCase().trim() !== brandInfo.brandName.toLowerCase().trim(),
  )
  const uniqueMarques = [...new Set(data.map((p) => p.Brand))].filter(
    (brand) => brand.toLowerCase().trim() !== brandInfo.brandName.toLowerCase().trim(),
  )

  const handleCSVUpload = async (newData: Product[]) => {
    try {
      await importCSV(newData)
    } catch (error) {
      console.error("Failed to import CSV:", error)
      alert("Erreur lors de l'importation du fichier CSV")
    }
  }

  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      alert("Aucune donnée à exporter")
      return
    }

    const headers = Object.keys(filteredData[0] || {})
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) => headers.map((header) => `"${row[header as keyof Product] || ""}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(brandInfo.brandName || "export").toLowerCase()}-competitive-analysis.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleLogout = () => {
    logout()
    router.push("/welcome")
  }

  const handleNavigation = (tabValue: string) => {
    setActiveTab(tabValue)
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Chargement des données de {brandName}...</p>
          <p className="text-sm text-gray-500">Génération de l'analyse concurrentielle</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      {/* Header */}
      <header
        className="bg-white shadow-sm border-b-4"
        style={{ borderBottomColor: `var(--color-${brandColors.accent})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/welcome">
                <Button variant="ghost" size="sm" className="p-2">
                  <Home className="w-5 h-5 text-gray-600 hover:text-gray-900" />
                </Button>
              </Link>
              <div
                className={`w-10 h-10 bg-gradient-to-r ${brandColors.primary} rounded-lg flex items-center justify-center`}
              >
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{brandName}</h1>
                  <p className="text-sm text-gray-600">
                    {companyName} - Veille Concurrentielle {industry && `• ${industry}`}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-4 bg-transparent">
                      Navigation <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleNavigation("dashboard")}>Tableau de bord</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation("products")}>Produits</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation("analysis")}>Analyses</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation("positioning")}>Positionnement</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation("competitors")}>Concurrents</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{brandInfo.email}</span>
              </div>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </Button>
              </Link>
              <CSVUploader onUpload={handleCSVUpload} />
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Analyse Concurrentielle Intelligente</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex items-start space-x-3">
                  <BarChart3 className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Analyses de Prix</h3>
                    <p className="text-sm text-gray-600">
                      Comparez vos prix avec la concurrence et identifiez les opportunités
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Target className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Positionnement Marché</h3>
                    <p className="text-sm text-gray-600">Visualisez votre position concurrentielle par segment</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <User className="w-6 h-6 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Analyse Concurrents</h3>
                    <p className="text-sm text-gray-600">Surveillez vos concurrents et leurs stratégies produits</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              Erreur lors du chargement des données: {error}
              <Button variant="ghost" size="sm" onClick={refreshData} className="ml-2 text-red-700 hover:text-red-800">
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {dataSource && (
          <Card className="mb-6 border-l-4 border-l-blue-400">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Source des données:{" "}
                      {dataSource.type === "generated"
                        ? "Générées automatiquement"
                        : dataSource.type === "csv"
                          ? "Fichier CSV importé"
                          : "Base de données"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {dataSource.recordCount} produits • Dernière mise à jour:{" "}
                      {new Date(dataSource.lastUpdated).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={refreshData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                  </Button>
                  {dataSource.type === "csv" && (
                    <Button variant="outline" size="sm" onClick={clearCache}>
                      <Database className="w-4 h-4 mr-2" />
                      Réinitialiser
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasData && !isLoading && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              Aucune donnée disponible pour {brandName}.
              <Link href="/settings" className="ml-1 underline hover:no-underline">
                Configurez vos paramètres
              </Link>{" "}
              ou importez un fichier CSV pour commencer l'analyse.
            </AlertDescription>
          </Alert>
        )}

        {/* Filtres */}
        <Card className={`mb-8 border-l-4 border-l-${brandColors.accent}`}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className={`w-5 h-5 mr-2 text-${brandColors.secondary}`} />
              Filtres de Recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recherche</label>
                <Input
                  placeholder="Rechercher un produit..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rayon</label>
                <Select
                  value={filters.rayon}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, rayon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les rayons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rayons</SelectItem>
                    {uniqueRayons.map((rayon) => (
                      <SelectItem key={rayon} value={rayon}>
                        {rayon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sous-famille</label>
                <Select
                  value={filters.sousFamille}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, sousFamille: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les sous-familles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sous-familles</SelectItem>
                    {uniqueSousFamilles.map((sf) => (
                      <SelectItem key={sf} value={sf}>
                        {sf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Marque</label>
                <Select
                  value={filters.marque}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, marque: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les marques" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les marques</SelectItem>
                    {uniqueMarques.map((marque) => (
                      <SelectItem key={marque} value={marque}>
                        {marque}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Prix min (TND)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priceMin: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prix max (TND)</label>
                <Input
                  type="number"
                  placeholder="100"
                  value={filters.priceMax}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priceMax: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Grammage min</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.grammageMin}
                  onChange={(e) => setFilters((prev) => ({ ...prev, grammageMin: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant={filters.promoOnly ? "default" : "outline"}
                  onClick={() => setFilters((prev) => ({ ...prev, promoOnly: !prev.promoOnly }))}
                  className={filters.promoOnly ? `bg-${brandColors.accent} hover:bg-${brandColors.secondary}` : ""}
                >
                  Promotions uniquement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Tableau de Bord</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="analysis">Analyses</TabsTrigger>
            <TabsTrigger value="positioning">Positionnement</TabsTrigger>
            <TabsTrigger value="competitors">Concurrents</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <KPIDashboard data={filteredData} />
          </TabsContent>

          <TabsContent value="products">
            <CompetitiveTable data={filteredData} />
          </TabsContent>

          <TabsContent value="analysis">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PriceAnalysisChart data={filteredData} />
              <MarketShareChart data={filteredData} />
            </div>
          </TabsContent>

          <TabsContent value="positioning">
            <CompetitivePositioning data={filteredData} />
          </TabsContent>

          <TabsContent value="competitors">
            <CompetitorsList data={filteredData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
