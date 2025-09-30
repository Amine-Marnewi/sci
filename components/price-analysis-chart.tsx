"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts"
import type { Product } from "@/app/dashboard/page"
import { useBrand } from "@/contexts/brand-context"

interface PriceAnalysisChartProps {
  data: Product[]
}

interface Centroid {
  grammage: number
  price: number
}

function kMeansClustering(data: any[], k = 3) {
  if (data.length === 0) return data

  const centroids: Centroid[] = []
  for (let i = 0; i < k; i++) {
    const randomPoint = data[Math.floor(Math.random() * data.length)]
    centroids.push({
      grammage: randomPoint.grammage,
      price: randomPoint.price,
    })
  }

  let iterations = 0
  const maxIterations = 10

  while (iterations < maxIterations) {
    // Assign points to clusters
    const clusters: any[][] = Array(k)
      .fill(null)
      .map(() => [])

    data.forEach((point) => {
      let minDistance = Number.POSITIVE_INFINITY
      let clusterIndex = 0

      centroids.forEach((centroid, index) => {
        const distance = Math.sqrt(
          Math.pow(point.grammage - centroid.grammage, 2) + Math.pow(point.price - centroid.price, 2),
        )
        if (distance < minDistance) {
          minDistance = distance
          clusterIndex = index
        }
      })

      clusters[clusterIndex].push({ ...point, cluster: clusterIndex })
    })

    // Update centroids
    let centroidsChanged = false
    centroids.forEach((centroid, index) => {
      if (clusters[index].length > 0) {
        const newGrammage = clusters[index].reduce((sum, point) => sum + point.grammage, 0) / clusters[index].length
        const newPrice = clusters[index].reduce((sum, point) => sum + point.price, 0) / clusters[index].length

        if (Math.abs(newGrammage - centroid.grammage) > 0.1 || Math.abs(newPrice - centroid.price) > 0.1) {
          centroidsChanged = true
        }

        centroid.grammage = newGrammage
        centroid.price = newPrice
      }
    })

    if (!centroidsChanged) break
    iterations++
  }

  return data.map((point) => {
    let minDistance = Number.POSITIVE_INFINITY
    let clusterIndex = 0

    centroids.forEach((centroid, index) => {
      const distance = Math.sqrt(
        Math.pow(point.grammage - centroid.grammage, 2) + Math.pow(point.price - centroid.price, 2),
      )
      if (distance < minDistance) {
        minDistance = distance
        clusterIndex = index
      }
    })

    return { ...point, cluster: clusterIndex }
  })
}

export function PriceAnalysisChart({ data }: PriceAnalysisChartProps) {
  const { brandInfo, formattedBrandName } = useBrand()
  const userBrand = formattedBrandName

  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("all")

  // Get filtered competitors from localStorage (settings configuration)
  const filteredCompetitors = useMemo(() => {
    try {
      const savedConfig = localStorage.getItem(`brand-config-${brandInfo.brandName}`)
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        return config.competitors || []
      }
    } catch (error) {
      console.error("Error loading competitor configuration:", error)
    }
    return []
  }, [brandInfo.brandName])

  // SCATTER PLOT DATA - FIXED, ONLY CHANGES WITH SETTINGS
  const scatterPlotData = useMemo(() => {
    console.log("Recalculating scatter plot data - this should only happen when settings change")
    
    const filteredData = data.filter((product) => {
      const isUserBrand = product.Brand?.toLowerCase().trim() === userBrand
      if (isUserBrand) return true
      
      // Only apply settings filter
      return filteredCompetitors.length === 0 || filteredCompetitors.includes(product.Brand)
    })

    const scatterData = filteredData.map((product) => ({
      name: product.Product,
      brand: product.Brand,
      grammage: product.Grammage,
      price: product["Price After (TND)"],
      pricePerGram: (product["Price After (TND)"] / product.Grammage) * 100,
      isUserBrand: product.Brand?.toLowerCase().trim() === userBrand,
    }))

    return kMeansClustering(scatterData)
  }, [data, userBrand, filteredCompetitors]) // ONLY these dependencies

  // Available competitors for dropdown
  const availableCompetitors = useMemo(() => {
    return [...new Set(data.map((p) => p.Brand))]
      .filter((brand) => brand && brand.toLowerCase().trim() !== userBrand)
      .filter((brand) => filteredCompetitors.length === 0 || filteredCompetitors.includes(brand))
      .sort()
  }, [data, userBrand, filteredCompetitors])

  // BAR CHART DATA - CHANGES WITH DROPDOWN SELECTION
  const barChartData = useMemo(() => {
    console.log("Recalculating bar chart data for competitor:", selectedCompetitor)
    
    const familyData = data.reduce(
      (acc, product) => {
        const family = product["Sous-famille"]
        if (!acc[family]) {
          acc[family] = { family, userBrand: [], competitors: [] }
        }

        if (product.Brand?.toLowerCase().trim() === userBrand) {
          acc[family].userBrand.push(product["Price After (TND)"])
        } else {
          // Apply settings filter first
          const passesSettingsFilter = filteredCompetitors.length === 0 || filteredCompetitors.includes(product.Brand)
          if (!passesSettingsFilter) return acc
          
          // Then apply dropdown filter
          const passesDropdownFilter = selectedCompetitor === "all" || product.Brand === selectedCompetitor
          if (passesDropdownFilter) {
            acc[family].competitors.push(product["Price After (TND)"])
          }
        }

        return acc
      },
      {} as Record<string, { family: string; userBrand: number[]; competitors: number[] }>,
    )

    return Object.values(familyData)
      .map((item) => ({
        family: item.family,
        userBrandAvg: item.userBrand.length > 0 ? item.userBrand.reduce((a, b) => a + b, 0) / item.userBrand.length : 0,
        competitorAvg:
          item.competitors.length > 0 ? item.competitors.reduce((a, b) => a + b, 0) / item.competitors.length : 0,
        userBrandCount: item.userBrand.length,
        competitorCount: item.competitors.length,
      }))
      .filter((item) => item.userBrandCount > 0 || item.competitorCount > 0)
  }, [data, userBrand, selectedCompetitor, filteredCompetitors]) // includes selectedCompetitor

  const clusterColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">Marque: {data.brand}</p>
          <p className="text-sm">Prix: {data.price.toFixed(2)} TND</p>
          <p className="text-sm">Grammage: {data.grammage}g</p>
          <p className="text-sm">Prix/100g: {data.pricePerGram.toFixed(2)} TND</p>
          {data.cluster !== undefined && <p className="text-sm">Cluster: {data.cluster + 1}</p>}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyse Prix vs Grammage avec Clustering</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={scatterPlotData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="grammage"
                name="Grammage (g)"
                label={{ value: "Grammage (g)", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                dataKey="price"
                name="Prix (TND)"
                label={{ value: "Prix (TND)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {[0, 1, 2].map((clusterIndex) => (
                <Scatter
                  key={clusterIndex}
                  name={`Cluster ${clusterIndex + 1}`}
                  data={scatterPlotData.filter((d) => d.cluster === clusterIndex)}
                  fill={clusterColors[clusterIndex]}
                  stroke={clusterColors[clusterIndex]}
                  strokeWidth={2}
                />
              ))}
              {/* Highlight user brand products */}
              <Scatter
                name={brandInfo.brandName}
                data={scatterPlotData.filter((d) => d.isUserBrand)}
                fill="#fbbf24"
                stroke="#f59e0b"
                strokeWidth={3}
                shape="star"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Comparaison Prix Moyens par Sous-famille</CardTitle>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Concurrent:</label>
              <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sélectionner un concurrent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les concurrents</SelectItem>
                  {availableCompetitors.map((competitor) => (
                    <SelectItem key={competitor} value={competitor}>
                      {competitor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={barChartData} margin={{ bottom: 80, left: 20, right: 20, top: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="family"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                fontSize={11}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                label={{ value: "Prix Moyen (TND)", angle: -90, position: "insideLeft" }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const isUserBrand =
                    name === "userBrandAvg" || name === brandInfo.brandName || name === formattedBrandName

                  const label = isUserBrand
                    ? brandInfo.brandName
                    : selectedCompetitor === "all"
                      ? "Concurrents"
                      : selectedCompetitor
                  return [`${value.toFixed(2)} TND`, label]
                }}
              />

              <Bar dataKey="userBrandAvg" fill="#eab308" name={brandInfo.brandName} />
              <Bar
                dataKey="competitorAvg"
                fill="#6b7280"
                name={selectedCompetitor === "all" ? "Concurrents" : selectedCompetitor}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}