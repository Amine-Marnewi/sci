"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Target, Building2, Mail, Lock, ArrowRight, AlertCircle, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useBrand } from "@/contexts/brand-context"

const PREDEFINED_BRANDS = [
  "SAÏDA",
  "LBM", // Added LBM to predefined brands
  "CARTHAGE",
  "SICAM",
  "GOULETTE",
  "DELICE",
  "VITALAIT",
  "BIMO",
  "TOUNSI",
  "GOLDEN",
  "ROYAL",
  "PREMIUM",
  "ELITE",
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
]

export default function LoginPage() {
  const router = useRouter()
  const { setBrandInfo } = useBrand()

  const [formData, setFormData] = useState({
    brandName: "",
    customBrandName: "",
    email: "",
    password: "",
    companyName: "",
    industry: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [error, setError] = useState("")
  const [useCustomBrand, setUseCustomBrand] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("") // Clear error when user types
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const finalBrandName = useCustomBrand ? formData.customBrandName : formData.brandName

      if (mode === "signup" && !finalBrandName) {
        setError("Veuillez sélectionner ou saisir un nom de marque")
        setIsLoading(false)
        return
      }

      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup"
      const payload =
        mode === "login"
          ? { email: formData.email, password: formData.password }
          : {
              email: formData.email,
              password: formData.password,
              brandName: finalBrandName,
              companyName: formData.companyName,
              industry: formData.industry,
            }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 && mode === "login") {
          // User doesn't exist, suggest signup
          setError("Compte non trouvé. Voulez-vous créer un nouveau compte ?")
          setMode("signup")
        } else {
          setError(data.error || "Une erreur est survenue")
        }
        setIsLoading(false)
        return
      }

      setBrandInfo({
        brandName: data.user.brandName || finalBrandName || "LBM", // Fallback to LBM if not provided
        companyName: data.user.companyName || formData.companyName || "LBM Company",
        industry: data.user.industry || formData.industry || "Agroalimentaire",
        email: data.user.email,
        loginTime: new Date().toISOString(),
        isLoggedIn: true,
      })

      console.log("[v0] Setting brand info:", {
        brandName: data.user.brandName || finalBrandName || "LBM",
        companyName: data.user.companyName || formData.companyName || "LBM Company",
        industry: data.user.industry || formData.industry || "Agroalimentaire",
        email: data.user.email,
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Authentication error:", error)
      setError("Erreur de connexion. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid =
    mode === "login"
      ? formData.email && formData.password
      : (useCustomBrand ? formData.customBrandName : formData.brandName) &&
        formData.email &&
        formData.password &&
        formData.companyName &&
        formData.industry

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/welcome" className="inline-block">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === "login" ? "Connexion" : "Créer un Compte"}
          </h1>
          <p className="text-gray-600">Personnalisez votre analyse concurrentielle</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Login/Signup Form */}
        <Card className="border-l-4 border-l-yellow-400 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Building2 className="w-5 h-5 mr-2 text-green-600" />
              {mode === "login" ? "Connexion à votre compte" : "Informations de Votre Marque"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Nom de la Marque <span className="text-red-500">*</span>
                  </Label>

                  <div className="space-y-3">
                    {/* Predefined brands */}
                    <div>
                      <Select
                        value={useCustomBrand ? "" : formData.brandName}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setUseCustomBrand(true)
                            handleInputChange("brandName", "")
                          } else {
                            setUseCustomBrand(false)
                            handleInputChange("brandName", value)
                          }
                        }}
                        disabled={useCustomBrand}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-green-500">
                          <SelectValue placeholder="Sélectionnez votre marque" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREDEFINED_BRANDS.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">
                            <div className="flex items-center">
                              <Plus className="w-4 h-4 mr-2" />
                              Autre marque...
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom brand input */}
                    {useCustomBrand && (
                      <div>
                        <Input
                          type="text"
                          placeholder="Saisissez le nom de votre marque"
                          value={formData.customBrandName}
                          onChange={(e) => handleInputChange("customBrandName", e.target.value)}
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUseCustomBrand(false)
                            handleInputChange("customBrandName", "")
                          }}
                          className="mt-1 text-xs text-gray-500"
                        >
                          Retour à la liste prédéfinie
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Cette marque sera utilisée pour personnaliser votre dashboard</p>
                </div>
              )}

              {/* Company Name */}
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium">
                    Nom de l'Entreprise <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Nom de votre entreprise"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              )}

              {/* Industry */}
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-sm font-medium">
                    Secteur d'Activité <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="industry"
                    type="text"
                    placeholder="Ex: Agroalimentaire, Cosmétique..."
                    value={formData.industry}
                    onChange={(e) => handleInputChange("industry", e.target.value)}
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de Passe <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white py-3 mt-6"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {mode === "login" ? "Connexion en cours..." : "Création du compte..."}
                  </div>
                ) : (
                  <div className="flex items-center">
                    {mode === "login" ? "Accéder au Dashboard" : "Créer le compte"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                )}
              </Button>

              {/* Mode Toggle */}
              <div className="text-center pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login")
                    setError("")
                  }}
                  className="text-sm text-gray-600 hover:text-green-600"
                >
                  {mode === "login" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-gradient-to-r from-green-50 to-yellow-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-900 mb-1">Analyse Personnalisée</h3>
                <p className="text-sm text-green-700">
                  En saisissant le nom de votre marque, vous obtiendrez une analyse concurrentielle spécifiquement
                  adaptée à votre secteur et vos produits.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Welcome */}
        <div className="text-center mt-6">
          <Link href="/welcome" className="text-sm text-gray-600 hover:text-green-600 transition-colors">
            ← Retour à la page d'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
