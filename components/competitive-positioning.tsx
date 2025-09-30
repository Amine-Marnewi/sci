import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle } from "lucide-react"
import type { Product } from "@/app/dashboard/page"
import { useBrand } from "@/contexts/brand-context"

interface CompetitivePositioningProps {
  data: Product[]
}

export function CompetitivePositioning({ data }: CompetitivePositioningProps) {
  const { brandInfo, formattedBrandName } = useBrand()
  const userBrand = formattedBrandName

  // Analyse par sous-famille
  const familyAnalysis = data.reduce(
    (acc, product) => {
      const family = product["Sous-famille"]
      if (!acc[family]) {
        acc[family] = {
          family,
          userProducts: [],
          competitorProducts: [],
          totalProducts: 0,
        }
      }

      acc[family].totalProducts++

      if (product.Brand?.toLowerCase().trim() === userBrand) {
        acc[family].userProducts.push(product)
      } else {
        acc[family].competitorProducts.push(product)
      }

      return acc
    },
    {} as Record<
      string,
      {
        family: string
        userProducts: Product[]
        competitorProducts: Product[]
        totalProducts: number
      }
    >,
  )

  const positioningData = Object.values(familyAnalysis)
    .map((item) => {
      const userAvgPrice =
        item.userProducts.length > 0
          ? item.userProducts.reduce((sum, p) => sum + p["Price After (TND)"], 0) / item.userProducts.length
          : 0

      const competitorAvgPrice =
        item.competitorProducts.length > 0
          ? item.competitorProducts.reduce((sum, p) => sum + p["Price After (TND)"], 0) / item.competitorProducts.length
          : 0

      const marketShare = (item.userProducts.length / item.totalProducts) * 100

      const userPromoRate =
        item.userProducts.length > 0
          ? (item.userProducts.filter((p) => p.promo_date_debut && p.promo_date_fin).length /
              item.userProducts.length) *
            100
          : 0

      const competitorPromoRate =
        item.competitorProducts.length > 0
          ? (item.competitorProducts.filter((p) => p.promo_date_debut && p.promo_date_fin).length /
              item.competitorProducts.length) *
            100
          : 0

      const priceCompetitiveness =
        competitorAvgPrice > 0 ? ((competitorAvgPrice - userAvgPrice) / competitorAvgPrice) * 100 : 0

      return {
        ...item,
        userAvgPrice,
        competitorAvgPrice,
        marketShare,
        userPromoRate,
        competitorPromoRate,
        priceCompetitiveness,
        hasPresence: item.userProducts.length > 0,
      }
    })
    .sort((a, b) => b.marketShare - a.marketShare)

  const getPositionStatus = (marketShare: number) => {
    if (marketShare >= 50) return { label: "Premium", color: "bg-green-500", icon: Award }
    if (marketShare >= 30) return { label: "Compétitif", color: "bg-yellow-500", icon: TrendingUp }
    if (marketShare >= 15) return { label: "Challenger", color: "bg-orange-500", icon: Minus }
    return { label: "À développer", color: "bg-red-500", icon: AlertTriangle }
  }

  const getPricePositioning = (competitiveness: number) => {
    if (competitiveness > 10) return { label: "Premium", trend: "down", color: "text-red-600" }
    if (competitiveness > -5) return { label: "Équilibré", trend: "neutral", color: "text-gray-600" }
    return { label: "Compétitif", trend: "up", color: "text-green-600" }
  }

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-yellow-400">
        <CardHeader>
          <CardTitle>Positionnement Concurrentiel par Sous-famille</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {positioningData.map((item) => {
              const status = getPositionStatus(item.marketShare)
              const pricePos = getPricePositioning(item.priceCompetitiveness)
              const StatusIcon = status.icon

              return (
                <div key={item.family} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">{item.family}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Part relative de la marque</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xl font-bold">{item.marketShare.toFixed(1)}%</p>
                        <Badge className={`${status.color} text-white`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {item.userProducts.length}/{item.totalProducts} produits
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Position prix</p>
                      <div className="flex items-center space-x-2">
                        <p className={`text-xl font-bold ${pricePos.color}`}>{pricePos.label}</p>
                        {pricePos.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {pricePos.trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {pricePos.trend === "neutral" && <Minus className="w-4 h-4 text-gray-500" />}
                      </div>
                      <p className="text-xs text-gray-500">
                        {item.priceCompetitiveness > 0 ? "+" : ""}
                        {item.priceCompetitiveness.toFixed(1)}% vs concurrence
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Prix moyen {brandInfo.brandName}</p>
                      <p className="text-xl font-bold">{item.userAvgPrice.toFixed(2)} TND</p>
                      <p className="text-xs text-gray-500">vs {item.competitorAvgPrice.toFixed(2)} TND concurrents</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">Activité promo</p>
                      <p className="text-xl font-bold">{item.userPromoRate.toFixed(0)}%</p>
                      <p className="text-xs text-gray-500">vs {item.competitorPromoRate.toFixed(0)}% concurrents</p>
                    </div>
                  </div>

                  {!item.hasPresence && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <p className="text-sm font-medium text-red-800">Opportunité manquée</p>
                      </div>
                      <p className="text-sm text-red-600 mt-1">
                        Aucun produit {brandInfo.brandName} dans cette sous-famille. Considérer le développement de
                        produits.
                      </p>
                    </div>
                  )}

                  {item.marketShare < 30 && item.hasPresence && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <p className="text-sm font-medium text-yellow-800">Recommandations</p>
                      </div>
                      <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                        {item.marketShare < 15 && <li>• Augmenter la présence produit</li>}
                        {item.priceCompetitiveness < -10 && <li>• Revoir la stratégie prix</li>}
                        {item.userPromoRate < item.competitorPromoRate && <li>• Intensifier les promotions</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
