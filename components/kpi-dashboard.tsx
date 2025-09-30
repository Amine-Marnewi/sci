import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, ShoppingCart, Percent, DollarSign } from "lucide-react"
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

  const kpis = [
    {
      title: `Produits ${brandInfo.brandName}`,
      value: userCount.toString(),
      subtitle: `${(isNaN(marketShare) ? 0 : marketShare).toFixed(1)}% du total (${totalProducts} produits)`,
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: userCount > competitorProducts.length ? "up" : "down",
    },
    {
      title: `Prix Moyen ${brandInfo.brandName}`,
      value: `${(isNaN(userAvgPrice) ? 0 : userAvgPrice).toFixed(2)} TND`,
      subtitle: isNaN(priceCompetitiveness)
        ? `vs ${(isNaN(competitorAvgPrice) ? 0 : competitorAvgPrice).toFixed(2)} TND concurrents`
        : priceCompetitiveness > 0
          ? `${priceCompetitiveness.toFixed(1)}% moins cher`
          : `${Math.abs(priceCompetitiveness).toFixed(1)}% plus cher`,
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      trend: userAvgPrice < competitorAvgPrice ? "up" : "down",
    },
    {
      title: "Taux de Promos",
      value: `${(isNaN(userPromoRate) ? 0 : userPromoRate).toFixed(1)}%`,
      subtitle: `Remise moyenne: ${(isNaN(avgDiscount) ? 0 : avgDiscount).toFixed(1)}% (${userPromoProducts.length} produits)`,
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: userPromoRate > competitorPromoRate ? "up" : "down",
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI principaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
  )
}
