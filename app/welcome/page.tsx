"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Target,
  BarChart3,
  ArrowRight,
  CheckCircle,
  ShoppingCart,
  DollarSign,
  Mic,
  Megaphone,
  Package,
  Building2,
  User,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { useBrand } from "@/contexts/brand-context"
import { useRouter } from "next/navigation"

export default function WelcomePage() {
  const { isAuthenticated, brandInfo, logout } = useBrand()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/welcome")
  }

  const features = [
    {
      icon: BarChart3,
      title: "Competitive Set",
      description: "Surveillez les prix, promotions et stratégies de vos concurrents en temps réel",
      href: isAuthenticated ? "/settings?tab=competitors" : "/login",
    },
    {
      icon: ShoppingCart,
      title: "Catalogues & Autre",
      description:
        "Ajoutez des catalogues où les articles seront extraits automatiquement et affichés dans un tableau pour un suivi complet",
      href: isAuthenticated ? "/catalog" : "/login", // Updated href to point to new catalog page
    },
    {
      icon: DollarSign,
      title: "Prix e-commerce",
      description:
        "Analysez et comparez les prix e-commerce de vos concurrents pour optimiser votre stratégie tarifaire",
      href: isAuthenticated ? "/dashboard" : "/login", // Placeholder for now
    },
    {
      icon: Mic,
      title: "Social Listening",
      description:
        "Surveillez les conversations et mentions de votre marque sur les réseaux sociaux pour comprendre la perception client",
      href: isAuthenticated ? "/dashboard" : "/login", // Placeholder for now
    },
    {
      icon: Megaphone,
      title: "Campaign Publicitaire",
      description:
        "Analysez les campagnes publicitaires de vos concurrents et optimisez vos propres stratégies marketing",
      href: isAuthenticated ? "/dashboard" : "/login", // Placeholder for now
    },
    {
      icon: Package,
      title: "Nouveaux Produits",
      description: "Découvrez les derniers produits ajoutés et restez informé des innovations de votre secteur",
      href: isAuthenticated ? "/dashboard" : "/login", // Will show new products
    },
    {
      icon: Building2,
      title: "Info Corporate",
      description:
        "Suivez les informations boursières et financières de vos concurrents pour une analyse stratégique complète",
      href: isAuthenticated ? "/dashboard" : "/login", // Placeholder for now
    },
  ]

  const benefits = [
    "Surveillance automatisée des prix concurrents",
    "Détection des promotions et offres spéciales",
    "Analyse comparative des parts de marché",
    "Rapports détaillés et exportables",
    "Interface intuitive et personnalisable",
    "Support multi-marques et multi-segments",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      {isAuthenticated && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-green-500 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Bienvenue, {brandInfo.brandName}</h1>
                  <p className="text-sm text-gray-600">{brandInfo.companyName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-yellow-500/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Target className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 text-balance">
              {isAuthenticated ? "Votre Plateforme de" : "Plateforme de Veille"}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-yellow-500">
                {" "}
                {isAuthenticated ? "Veille Concurrentielle" : "Concurrentielle"}
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto text-pretty">
              {isAuthenticated
                ? "Accédez à tous vos outils d'analyse concurrentielle et optimisez votre stratégie commerciale."
                : "Analysez votre marché, surveillez vos concurrents et optimisez votre stratégie commerciale avec notre solution intelligente de competitive intelligence."}
            </p>
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white px-8 py-3"
                  >
                    Commencer l'Analyse
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="px-8 py-3 bg-transparent">
                  Découvrir les Fonctionnalités
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {isAuthenticated ? "Vos Outils d'Analyse" : "Fonctionnalités Principales"}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {isAuthenticated
                ? "Cliquez sur une fonctionnalité pour commencer votre analyse"
                : "Découvrez tous les outils dont vous avez besoin pour une analyse concurrentielle complète"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Link key={index} href={feature.href}>
                <Card className="border-l-4 border-l-yellow-400 hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-yellow-100 rounded-lg flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-green-600" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                    {isAuthenticated && (
                      <div className="mt-4 flex items-center text-sm text-green-600">
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Accéder à l'outil
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!isAuthenticated && (
        <>
          {/* Benefits Section */}
          <section className="py-20 bg-gradient-to-r from-green-50 to-yellow-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Pourquoi Choisir Notre Solution ?</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Notre plateforme vous offre une vision complète et en temps réel de votre environnement
                    concurrentiel, vous permettant de prendre des décisions éclairées et stratégiques.
                  </p>
                  <div className="space-y-4">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-white rounded-2xl shadow-xl p-8 border-l-4 border-l-yellow-400">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Tableau de Bord Intuitif</h3>
                      <p className="text-gray-600 mb-6">
                        Visualisez toutes vos données d'analyse dans une interface claire et personnalisable
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="font-semibold text-green-700">+25%</div>
                          <div className="text-green-600">Efficacité</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <div className="font-semibold text-yellow-700">-40%</div>
                          <div className="text-yellow-600">Temps d'analyse</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Prêt à Optimiser Votre Stratégie Concurrentielle ?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Rejoignez les entreprises qui utilisent déjà notre plateforme pour prendre l'avantage sur leurs
                concurrents
              </p>
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white px-12 py-4 text-lg"
                >
                  Commencer Maintenant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-green-500 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Competitive Intelligence Platform</span>
          </div>
          <div className="text-center text-gray-400">
            <p>&copy; 2025 Plateforme de Veille Concurrentielle. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
