"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Settings,
  Save,
  ArrowLeft,
  Plus,
  X,
  Palette,
  Users,
  Package,
  Target,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { useBrand, useBrandTheme } from "@/contexts/brand-context"
import { useRequireAuth } from "@/hooks/use-auth"
import { getBrandConfiguration, addCustomBrandConfiguration, type BrandConfig } from "@/lib/data-generator"
import { useBrandData } from "@/hooks/use-brand-data"

const AVAILABLE_COLORS = [
  { name: "Jaune-Vert", value: "from-yellow-400 to-green-500", accent: "yellow-400", secondary: "green-500" },
  { name: "Bleu-Violet", value: "from-blue-400 to-purple-500", accent: "blue-400", secondary: "purple-500" },
  { name: "Rouge-Orange", value: "from-red-400 to-orange-500", accent: "red-400", secondary: "orange-500" },
  { name: "Teal-Cyan", value: "from-teal-400 to-cyan-500", accent: "teal-400", secondary: "cyan-500" },
  { name: "Rose-Violet", value: "from-pink-400 to-purple-500", accent: "pink-400", secondary: "purple-500" },
  { name: "Vert-Bleu", value: "from-green-400 to-blue-500", accent: "green-400", secondary: "blue-500" },
]

const INDUSTRIES = [
  "Agroalimentaire",
  "Cosmétique",
  "Textile",
  "Électronique",
  "Automobile",
  "Pharmaceutique",
  "Chimie",
  "Construction",
  "Services",
  "Technologie",
]

export default function SettingsPage() {
  const isAuthenticated = useRequireAuth()
  const { brandInfo, updateBrandInfo } = useBrand()
  const { brandColors } = useBrandTheme()
  const { data } = useBrandData()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get the tab from URL parameters, default to "general"
  const defaultTab = searchParams.get("tab") || "general"
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Function to handle tab change and update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    // Update URL with the new tab parameter
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", newTab)
    router.replace(`/settings?${params.toString()}`)
  }

  const [config, setConfig] = useState<Partial<BrandConfig>>({
    name: brandInfo.brandName,
    industry: brandInfo.industry,
    competitors: [],
    priceRange: { min: 1.0, max: 50.0 },
    promotionRate: 0.2,
  })

  const [newCompetitor, setNewCompetitor] = useState("")
  const [selectedColors, setSelectedColors] = useState(AVAILABLE_COLORS[0])
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  const availableCompetitors = [...new Set(data.map((p) => p.Brand))]
    .filter((brand) => brand && brand.toLowerCase().trim() !== brandInfo.brandName.toLowerCase().trim())
    .sort()

  console.log("[v0] Available competitors from data:", availableCompetitors)
  console.log("[v0] Current data length:", data.length)
  console.log("[v0] User brand name:", brandInfo.brandName)

  // Update active tab when URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam && ["general", "competitors", "pricing", "appearance"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (brandInfo.brandName) {
      const existingConfig = getBrandConfiguration(brandInfo.brandName)
      if (existingConfig) {
        setConfig(existingConfig)
      }
    }
  }, [brandInfo.brandName])

  const handleAddCompetitor = () => {
    if (newCompetitor.trim() && !config.competitors?.includes(newCompetitor.trim())) {
      setConfig((prev) => ({
        ...prev,
        competitors: [...(prev.competitors || []), newCompetitor.trim()],
      }))
      setNewCompetitor("")
    }
  }

  const handleRemoveCompetitor = (competitor: string) => {
    setConfig((prev) => ({
      ...prev,
      competitors: prev.competitors?.filter((c) => c !== competitor) || [],
    }))
  }

  const handleSaveConfiguration = async () => {
    setIsSaving(true)
    setSaveStatus("idle")

    try {
      const fullConfig: BrandConfig = {
        name: brandInfo.brandName,
        industry: config.industry || brandInfo.industry || "Général",
        competitors: config.competitors || [],
        productCategories: config.productCategories || [],
        priceRange: config.priceRange || { min: 1.0, max: 50.0 },
        promotionRate: config.promotionRate || 0.2,
      }

      addCustomBrandConfiguration(fullConfig)

      updateBrandInfo({
        industry: fullConfig.industry,
      })

      localStorage.setItem(`brand-config-${brandInfo.brandName}`, JSON.stringify(fullConfig))

      window.dispatchEvent(
        new CustomEvent("brandConfigUpdated", {
          detail: { brandName: brandInfo.brandName, config: fullConfig },
        }),
      )

      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (error) {
      console.error("Failed to save configuration:", error)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      <header className="bg-white shadow-sm border-b-4 border-b-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour au Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 bg-gradient-to-r ${brandColors.primary} rounded-lg flex items-center justify-center`}
                >
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Configuration de {brandInfo.brandName}</h1>
                  <p className="text-sm text-gray-600">Personnalisez votre analyse concurrentielle</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {saveStatus === "success" && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Sauvegardé</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Erreur</span>
                </div>
              )}
              <Button
                onClick={handleSaveConfiguration}
                disabled={isSaving}
                className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600"
              >
                {isSaving ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sauvegarde...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="competitors">Concurrents</TabsTrigger>
            <TabsTrigger value="pricing">Prix & Promotions</TabsTrigger>
            <TabsTrigger value="appearance">Apparence</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="border-l-4 border-l-yellow-400">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                  Informations Générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="brandName">Nom de la Marque</Label>
                    <Input id="brandName" value={brandInfo.brandName} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500">Le nom de la marque ne peut pas être modifié</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Secteur d'Activité</Label>
                    <Select
                      value={config.industry || ""}
                      onValueChange={(value) => setConfig((prev) => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un secteur" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l'Entreprise</Label>
                  <Input
                    id="companyName"
                    value={brandInfo.companyName}
                    onChange={(e) => updateBrandInfo({ companyName: e.target.value })}
                    placeholder="Nom de votre entreprise"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitors">
            <Card className="border-l-4 border-l-blue-400">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Gestion des Concurrents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Select value={newCompetitor} onValueChange={setNewCompetitor}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sélectionnez un concurrent disponible" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCompetitors
                          .filter((competitor) => !config.competitors?.includes(competitor))
                          .map((competitor) => (
                            <SelectItem key={competitor} value={competitor}>
                              {competitor}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddCompetitor} disabled={!newCompetitor.trim()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Concurrents Configurés ({config.competitors?.length || 0})</Label>
                    <div className="flex flex-wrap gap-2">
                      {config.competitors?.map((competitor) => (
                        <Badge key={competitor} variant="secondary" className="flex items-center space-x-1">
                          <span>{competitor}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCompetitor(competitor)}
                            className="h-auto p-0 ml-1 hover:bg-transparent"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      )) || <p className="text-sm text-gray-500">Aucun concurrent configuré</p>}
                    </div>
                  </div>

                  {availableCompetitors.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Aucun concurrent disponible dans la base de données. Importez un fichier CSV avec des données de
                        concurrents pour les voir apparaître dans la liste.
                      </AlertDescription>
                    </Alert>
                  )}

                  {availableCompetitors.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Sélectionnez parmi les {availableCompetitors.length} concurrents disponibles dans votre base de
                        données: {availableCompetitors.slice(0, 5).join(", ")}
                        {availableCompetitors.length > 5 && ` et ${availableCompetitors.length - 5} autres`}. Ces
                        concurrents sont automatiquement détectés à partir de vos données importées.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card className="border-l-4 border-l-green-400">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2 text-green-600" />
                  Configuration Prix & Promotions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label>Fourchette de Prix (TND)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="priceMin" className="text-xs">
                          Prix Minimum
                        </Label>
                        <Input
                          id="priceMin"
                          type="number"
                          step="0.1"
                          value={config.priceRange?.min || 1.0}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              priceRange: {
                                ...prev.priceRange,
                                min: Number.parseFloat(e.target.value) || 1.0,
                                max: prev.priceRange?.max || 50.0,
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="priceMax" className="text-xs">
                          Prix Maximum
                        </Label>
                        <Input
                          id="priceMax"
                          type="number"
                          step="0.1"
                          value={config.priceRange?.max || 50.0}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              min: prev.priceRange?.min || 1.0,
                              max: Number.parseFloat(e.target.value) || 50.0,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promotionRate">Taux de Promotion (%)</Label>
                    <Input
                      id="promotionRate"
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={(config.promotionRate || 0.2) * 100}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          promotionRate: Number.parseFloat(e.target.value) / 100 || 0.2,
                        }))
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Pourcentage de produits en promotion (utilisé pour la génération de données)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="border-l-4 border-l-purple-400">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 mr-2 text-purple-600" />
                  Personnalisation de l'Apparence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Schéma de Couleurs</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {AVAILABLE_COLORS.map((color) => (
                      <div
                        key={color.name}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedColors.name === color.name
                            ? "border-gray-900 shadow-lg"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                        onClick={() => setSelectedColors(color)}
                      >
                        <div className={`w-full h-8 bg-gradient-to-r ${color.value} rounded mb-2`}></div>
                        <p className="text-sm font-medium text-center">{color.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Les changements de couleur seront appliqués après la sauvegarde et le rechargement de la page.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
