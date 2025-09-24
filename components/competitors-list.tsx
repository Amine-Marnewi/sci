"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Package, TrendingUp, Percent } from "lucide-react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  BarChart,
  Bar,
  LabelList,
} from "recharts"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import type { Product } from "@/app/dashboard/page"
import { useBrand } from "@/contexts/brand-context"
import { useState } from "react"

interface CompetitorsListProps {
  data: Product[]
}

export function CompetitorsList({ data }: CompetitorsListProps) {
  const { brandInfo, formattedBrandName } = useBrand()
  const userBrand = formattedBrandName
  const [rankingBy, setRankingBy] = useState<"totalProducts" | "promoRate">("totalProducts")

  // Get all competitors (brands except the logged-in brand)
  const competitorAnalysis = data.reduce(
    (acc, product) => {
      const brand = product.Brand
      if (!brand || brand.toLowerCase().trim() === userBrand) {
        return acc // Skip user's brand
      }

      if (!acc[brand]) {
        acc[brand] = {
          brandName: brand,
          products: [],
          totalProducts: 0,
          avgPrice: 0,
          promoProducts: 0,
          promoRate: 0,
          subFamilies: new Set<string>(),
        }
      }

      acc[brand].products.push(product)
      acc[brand].totalProducts++
      acc[brand].subFamilies.add(product["Sous-famille"])

      // Check if product is on promotion
      if (product["Price Before (TND)"] > product["Price After (TND)"]) {
        acc[brand].promoProducts++
      }

      return acc
    },
    {} as Record<
      string,
      {
        brandName: string
        products: Product[]
        totalProducts: number
        avgPrice: number
        promoProducts: number
        promoRate: number
        subFamilies: Set<string>
      }
    >,
  )

  // Calculate averages and rates
  const competitorsList = Object.values(competitorAnalysis)
    .map((competitor) => {
      const avgPrice =
        competitor.products.reduce((sum, p) => sum + p["Price After (TND)"], 0) /
        competitor.totalProducts
      const promoRate = (competitor.promoProducts / competitor.totalProducts) * 100

      return {
        ...competitor,
        avgPrice,
        promoRate,
        subFamiliesCount: competitor.subFamilies.size,
      }
    })
    .sort((a, b) => b.totalProducts - a.totalProducts) // Sort by number of products

  const totalCompetitors = competitorsList.length
  const totalCompetitorProducts = competitorsList.reduce((sum, c) => sum + c.totalProducts, 0)

  const bubbleData = competitorsList.map((competitor) => ({
    x: competitor.totalProducts,
    y: competitor.avgPrice,
    z: competitor.subFamiliesCount * 10, // Size multiplier for visibility
    name: competitor.brandName,
    promoRate: competitor.promoRate,
    subFamilies: competitor.subFamiliesCount,
  }))

  const BubbleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">Produits: {data.x}</p>
          <p className="text-sm">Prix moyen: {data.y.toFixed(2)} TND</p>
          <p className="text-sm">Sous-familles: {data.subFamilies}</p>
          <p className="text-sm">Fréquence promos: {data.promoRate.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  // Sort for ranking chart
  const sortedRankingData = [...competitorsList].sort(
    (a, b) => (b[rankingBy] as number) - (a[rankingBy] as number),
  )

  const metricLabels: Record<typeof rankingBy, string> = {
    totalProducts: "Produits",
    promoRate: "Fréquence de promos (%)",
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-l-4 border-l-blue-400">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Analyse Concurrentielle</span>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {totalCompetitors} Concurrents
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-900">{totalCompetitors}</p>
              <p className="text-sm text-blue-700">Marques concurrentes</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">{totalCompetitorProducts}</p>
              <p className="text-sm text-green-700">Produits concurrents</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-900">{brandInfo.brandName}</p>
              <p className="text-sm text-yellow-700">Votre marque</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking / Leaderboard */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Classement des Concurrents</CardTitle>
            <Select
              onValueChange={(value: "totalProducts" | "promoRate") => setRankingBy(value)}
              defaultValue="totalProducts"
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Choisir un critère" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalProducts">Produits</SelectItem>
                <SelectItem value="promoRate">Fréquence de promos</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={sortedRankingData}
                layout="vertical"
                barCategoryGap={15} // espace entre les barres
                barSize={25} // épaisseur des barres
                margin={{ top: 20, right: 40, left: 100, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="brandName"
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value: number) => [
                    rankingBy === "promoRate" ? `${value.toFixed(1)}%` : `${value}`,
                    metricLabels[rankingBy],
                  ]}
                />
                <Bar
                  dataKey={rankingBy}
                  fill={rankingBy === "promoRate" ? "#f43f5e" : "#4f46e5"}
                  radius={[0, 8, 8, 0]}
                >
                  {/* <LabelList
                    dataKey={rankingBy}
                    position="right"
                    formatter={(value: number) =>
                      rankingBy === "promoRate" ? `${value.toFixed(1)}%` : `${value}`
                    }
                  /> */}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Positioning Scatter Plot */}
        <Card>
          <CardHeader>
            <CardTitle>Positionnement Concurrentiel</CardTitle>
            <p className="text-sm text-gray-600">
              Taille = Sous-familles | Couleur = Fréquence promos
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart data={bubbleData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  name="Nombre de Produits"
                  label={{ value: "Nombre de Produits", position: "insideBottom", offset: -10 }}
                />
                <YAxis
                  dataKey="y"
                  name="Prix Moyen (TND)"
                  label={{ value: "Prix Moyen (TND)", angle: -90, position: "insideLeft" }}
                />
                <ZAxis dataKey="z" range={[50, 400]} />
                <Tooltip content={<BubbleTooltip />} />
                <Scatter name="Concurrents" data={bubbleData}>
                  {bubbleData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(${(entry.promoRate / 100) * 120}, 70%, 50%)`}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Competitors List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Concurrents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitorsList.map((competitor, index) => (
              <Card
                key={competitor.brandName}
                className="border hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Brand Name */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{competitor.brandName}</h3>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Produits:</span>
                        <span className="font-medium">{competitor.totalProducts}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Sous-familles:</span>
                        <span className="font-medium">{competitor.subFamiliesCount}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Prix moyen:</span>
                        <span className="font-medium">
                          {competitor.avgPrice.toFixed(2)} TND
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Fréquence promos:</span>
                        <div className="flex items-center space-x-1">
                          <Percent className="w-3 h-3 text-purple-500" />
                          <span className="font-medium">
                            {competitor.promoRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Promotion Badge */}
                    {competitor.promoProducts > 0 && (
                      <Badge
                        variant="destructive"
                        className="w-full justify-center bg-red-100 text-red-700 border-red-200"
                      >
                        {competitor.promoProducts} produit
                        {competitor.promoProducts > 1 ? "s" : ""} en promo
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {competitorsList.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun concurrent trouvé dans les données</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
