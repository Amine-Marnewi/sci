import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, AlertTriangle, Target, ShoppingCart, Percent, DollarSign, Award } from "lucide-react"
import type { Product } from "@/app/dashboard/page"
import { useBrand } from "@/contexts/brand-context"

interface KPIDashboardProps {
  data: Product[]
}

export function KPIDashboard({ data }: KPIDashboardProps) {
  const { brandInfo, formattedBrandName } = useBrand()
  const userBrand = formattedBrandName

  const userProducts = data.filter((p) => p.Brand?.toLowerCase().trim() === userBrand)
  const competitorProducts = data.filter((p) => p.Brand?.toLowerCase().trim() !== userBrand)

  const totalProducts = data.length
  const userCount = userProducts.length
  const marketShare = totalProducts > 0 ? (userCount / totalProducts) * 100 : 0

  const userAvgPrice =
    userProducts.length > 0
      ? userProducts.reduce((sum, p) => {
          const price = p["Price After (TND)"]
          return sum + (isNaN(price) || price == null ? 0 : price)
        }, 0) / userProducts.length
      : 0

  const competitorAvgPrice =
    competitorProducts.length > 0
      ? competitorProducts.reduce((sum, p) => {
          const price = p["Price After (TND)"]
          return sum + (isNaN(price) || price == null ? 0 : price)
        }, 0) / competitorProducts.length
      : 0

  const priceCompetitiveness =
    competitorAvgPrice > 0 && !isNaN(competitorAvgPrice) && !isNaN(userAvgPrice)
      ? ((competitorAvgPrice - userAvgPrice) / competitorAvgPrice) * 100
      : 0

  const userPromoProducts = userProducts.filter((p) => p["Price Before (TND)"] > p["Price After (TND)"])
  const competitorPromoProducts = competitorProducts.filter((p) => p["Price Before (TND)"] > p["Price After (TND)"])

  const userPromoRate = userProducts.length > 0 ? (userPromoProducts.length / userProducts.length) * 100 : 0
  const competitorPromoRate =
    competitorProducts.length > 0 ? (competitorPromoProducts.length / competitorProducts.length) * 100 : 0

  const avgDiscount =
    userPromoProducts.length > 0
      ? userPromoProducts.reduce((sum, p) => {
          const priceBefore = p["Price Before (TND)"]
          const priceAfter = p["Price After (TND)"]

          if (
            isNaN(priceBefore) ||
            isNaN(priceAfter) ||
            priceBefore == null ||
            priceAfter == null ||
            priceBefore <= 0
          ) {
            return sum
          }

          const discount = ((priceBefore - priceAfter) / priceBefore) * 100
          return sum + (isNaN(discount) ? 0 : discount)
        }, 0) / userPromoProducts.length
      : 0

  const competitivenessScore = Math.min(
    100,
    Math.max(
      0,
      (priceCompetitiveness > 0 ? 30 : 10) +
        (isNaN(marketShare) ? 0 : marketShare * 0.5) +
        (userPromoRate > competitorPromoRate ? 20 : 10) +
        (avgDiscount > 10 ? 20 : 10),
    ),
  )

  const kpis = [
    {
      title: `Produits ${brandInfo.brandName}`,
      value: userCount.toString(),
      subtitle: `sur ${totalProducts} total`,
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: userCount > competitorProducts.length ? "up" : "down",
    },
    {
      title: "% total de la marque",
      value: `${(isNaN(marketShare) ? 0 : marketShare).toFixed(1)}%`,
      subtitle: "dans la sélection",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: marketShare > 50 ? "up" : "down",
    },
    {
      title: `Prix Moyen ${brandInfo.brandName}`,
      value: `${(isNaN(userAvgPrice) ? 0 : userAvgPrice).toFixed(2)} TND`,
      subtitle: `vs ${(isNaN(competitorAvgPrice) ? 0 : competitorAvgPrice).toFixed(2)} TND concurrents`,
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      trend: userAvgPrice < competitorAvgPrice ? "up" : "down",
    },
    {
      title: "Fréquence de Promos",
      value: `${(isNaN(userPromoRate) ? 0 : userPromoRate).toFixed(1)}%`,
      subtitle: `vs ${(isNaN(competitorPromoRate) ? 0 : competitorPromoRate).toFixed(1)}% concurrents`,
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: userPromoRate > competitorPromoRate ? "up" : "down",
    },
  ]

  const advancedKpis = [
    {
      title: "Compétitivité Prix",
      value: isNaN(priceCompetitiveness)
        ? "N/A"
        : priceCompetitiveness > 0
          ? `+${priceCompetitiveness.toFixed(1)}%`
          : `${priceCompetitiveness.toFixed(1)}%`,
      description: isNaN(priceCompetitiveness)
        ? "Données insuffisantes"
        : priceCompetitiveness > 0
          ? `${brandInfo.brandName} moins cher`
          : `${brandInfo.brandName} plus cher`,
      status: isNaN(priceCompetitiveness) ? "neutral" : priceCompetitiveness > 0 ? "positive" : "negative",
    },
    {
      title: "Remise Moyenne",
      value: `${(isNaN(avgDiscount) ? 0 : avgDiscount).toFixed(1)}%`,
      description: `sur ${userPromoProducts.length} produits en promo`,
      status: isNaN(avgDiscount) ? "neutral" : avgDiscount > 15 ? "positive" : avgDiscount > 5 ? "neutral" : "negative",
    },
    {
      title: "Score de Compétitivité",
      value: `${(isNaN(competitivenessScore) ? 0 : competitivenessScore).toFixed(0)}/100`,
      description: "Indice global de performance",
      status: isNaN(competitivenessScore)
        ? "neutral"
        : competitivenessScore > 70
          ? "positive"
          : competitivenessScore > 40
            ? "neutral"
            : "negative",
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div
                className={`absolute top-0 right-0 w-16 h-16 ${kpi.bgColor} rounded-bl-3xl flex items-center justify-center`}
              >
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  {kpi.trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{kpi.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI avancés */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {advancedKpis.map((kpi, index) => (
          <Card key={index} className="border-l-4 border-l-yellow-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                {kpi.title}
                <Badge
                  variant={
                    kpi.status === "positive" ? "default" : kpi.status === "negative" ? "destructive" : "secondary"
                  }
                  className={kpi.status === "positive" ? "bg-green-500" : ""}
                >
                  {kpi.status === "positive" ? "Excellent" : kpi.status === "negative" ? "À améliorer" : "Correct"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-600">{kpi.description}</p>
                {kpi.title === "Score de Compétitivité" && (
                  <Progress value={isNaN(competitivenessScore) ? 0 : competitivenessScore} className="mt-3" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertes et recommandations */}
      <Card className="border-l-4 border-l-orange-400">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            Alertes & Recommandations Stratégiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isNaN(priceCompetitiveness) && priceCompetitiveness < -10 && (
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Prix non compétitifs détectés</p>
                  <p className="text-sm text-red-600">
                    Les prix {brandInfo.brandName} sont en moyenne {Math.abs(priceCompetitiveness).toFixed(1)}% plus
                    élevés que la concurrence.
                  </p>
                </div>
              </div>
            )}

            {!isNaN(userPromoRate) && !isNaN(competitorPromoRate) && userPromoRate < competitorPromoRate && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Activité promotionnelle faible</p>
                  <p className="text-sm text-yellow-600">
                    Fréquence de promos {brandInfo.brandName} ({userPromoRate.toFixed(1)}%) inférieure aux concurrents (
                    {competitorPromoRate.toFixed(1)}%).
                  </p>
                </div>
              </div>
            )}

            {!isNaN(marketShare) && marketShare < 30 && (
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Target className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Opportunité d'expansion</p>
                  <p className="text-sm text-blue-600">
                    % total de la marque actuel de {marketShare.toFixed(1)}% - potentiel d'augmentation dans certaines
                    catégories.
                  </p>
                </div>
              </div>
            )}

            {!isNaN(competitivenessScore) && competitivenessScore > 70 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <Award className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Position concurrentielle forte</p>
                  <p className="text-sm text-green-600">
                    Score de compétitivité excellent ({competitivenessScore.toFixed(0)}/100). Maintenir cette
                    performance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
