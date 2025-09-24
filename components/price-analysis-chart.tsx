import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  const scatterData = data.map((product) => ({
    name: product.Product,
    brand: product.Brand,
    grammage: product.Grammage,
    price: product["Price After (TND)"],
    pricePerGram: (product["Price After (TND)"] / product.Grammage) * 100,
    isUserBrand: product.Brand?.toLowerCase().trim() === userBrand,
  }))

  const clusteredData = kMeansClustering(scatterData)
  const clusterColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]

  const familyData = data.reduce(
    (acc, product) => {
      const family = product["Sous-famille"]
      if (!acc[family]) {
        acc[family] = { family, userBrand: [], competitors: [] }
      }

      if (product.Brand?.toLowerCase().trim() === userBrand) {
        acc[family].userBrand.push(product["Price After (TND)"])
      } else {
        acc[family].competitors.push(product["Price After (TND)"])
      }

      return acc
    },
    {} as Record<string, { family: string; userBrand: number[]; competitors: number[] }>,
  )

  const barData = Object.values(familyData)
    .map((item) => ({
      family: item.family,
      userBrandAvg: item.userBrand.length > 0 ? item.userBrand.reduce((a, b) => a + b, 0) / item.userBrand.length : 0,
      competitorAvg:
        item.competitors.length > 0 ? item.competitors.reduce((a, b) => a + b, 0) / item.competitors.length : 0,
      userBrandCount: item.userBrand.length,
      competitorCount: item.competitors.length,
    }))
    .filter((item) => item.userBrandCount > 0 || item.competitorCount > 0)

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
            <ScatterChart data={clusteredData}>
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
                  data={clusteredData.filter((d) => d.cluster === clusterIndex)}
                  fill={clusterColors[clusterIndex]}
                  stroke={clusterColors[clusterIndex]}
                  strokeWidth={2}
                />
              ))}
              {/* Highlight user brand products */}
              <Scatter
                name={brandInfo.brandName}
                data={clusteredData.filter((d) => d.isUserBrand)}
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
          <CardTitle>Comparaison Prix Moyens par Sous-famille</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={barData} margin={{ bottom: 80, left: 20, right: 20, top: 20 }}>
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
              {/* <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} TND`,
                  name === "userBrandAvg" ? brandInfo.brandName : "Concurrents",
                ]}
              />
              <Bar dataKey="userBrandAvg" fill="#eab308" name={brandInfo.brandName} />
              <Bar dataKey="competitorAvg" fill="#6b7280" name="Concurrents" /> */}
              <Tooltip
                formatter={(value: number, name: string) => {
                  // If `name` is either the dataKey or the series name => it's the user brand
                  const isUserBrand =
                    name === "userBrandAvg" ||
                    name === brandInfo.brandName ||
                    name === formattedBrandName;

                  const label = isUserBrand ? brandInfo.brandName : "Concurrents";
                  return [`${value.toFixed(2)} TND`, label];
                }}
              />

              <Bar dataKey="userBrandAvg" fill="#eab308" name={brandInfo.brandName} />
              <Bar dataKey="competitorAvg" fill="#6b7280" name="Concurrents" />

            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
