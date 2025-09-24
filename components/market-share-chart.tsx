import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import type { Product } from "@/app/dashboard/page"
import { useBrand } from "@/contexts/brand-context"

interface MarketShareChartProps {
  data: Product[]
}

export function MarketShareChart({ data }: MarketShareChartProps) {
  const { brandInfo, formattedBrandName } = useBrand()
  const userBrand = formattedBrandName

  const brandCounts = data.reduce(
    (acc, product) => {
      acc[product.Brand] = (acc[product.Brand] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const generateDistinctColors = (count: number) => {
    const baseColors = [
      "#eab308",
      "#22c55e",
      "#3b82f6",
      "#ef4444",
      "#8b5cf6",
      "#f97316",
      "#06b6d4",
      "#84cc16",
      "#ec4899",
      "#14b8a6",
      "#a855f7",
      "#10b981",
      "#f59e0b",
      "#6366f1",
      "#0ea5e9",
      "#64748b",
      "#d946ef",
      "#84cc16",
      "#f43f5e",
      "#06b6d4",
    ]

    if (count > baseColors.length) {
      const additionalColors = []
      for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137.508) % 360
        additionalColors.push(`hsl(${hue}, 70%, 60%)`)
      }
      return [...baseColors, ...additionalColors]
    }

    return baseColors.slice(0, count)
  }

  const pieData = Object.entries(brandCounts)
    .map(([brand, count], index) => ({
      name: brand,
      value: count,
      percentage: (count / data.length) * 100,
      isUserBrand: brand?.toLowerCase().trim() === userBrand,
      colorIndex: index,
    }))
    .sort((a, b) => b.value - a.value)

  const distinctColors = generateDistinctColors(pieData.length)

  const promoData = Object.entries(brandCounts)
    .map(([brand, count]) => {
      const brandProducts = data.filter((p) => p.Brand === brand)
      const promoProducts = brandProducts.filter((p) => p["Price Before (TND)"] > p["Price After (TND)"])
      const promoRate = (promoProducts.length / brandProducts.length) * 100

      return {
        brand,
        totalProducts: count,
        promoProducts: promoProducts.length,
        promoRate: Math.round(promoRate),
        isUserBrand: brand?.toLowerCase().trim() === userBrand,
      }
    })
    .sort((a, b) => b.promoRate - a.promoRate)

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-md">
          <p className="font-bold">{`${label}`}</p>
          <p className="text-sm">{`Fréquence de promotion: ${payload[0].value}%`}</p>
          <p className="text-sm">{`Produits en promo: ${payload[0].payload.promoProducts}/${payload[0].payload.totalProducts}`}</p>
        </div>
      )
    }
    return null
  }

  const formatXAxisTick = (tick: string) => {
    if (tick.length > 10) {
      return tick.substring(0, 10) + "..."
    }
    return tick
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Part relative de la marque</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isUserBrand ? "#eab308" : distinctColors[entry.colorIndex % distinctColors.length]}
                    stroke={entry.isUserBrand ? "#ca8a04" : "none"}
                    strokeWidth={entry.isUserBrand ? 3 : 0}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} produits (${props.payload.percentage.toFixed(1)}%)`,
                  "Nombre",
                ]}
                labelFormatter={(label: string) => `Marque: ${label}`}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="max-h-40 overflow-y-auto mt-4 pr-2">
            <div className="grid grid-cols-1 gap-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{
                      backgroundColor: entry.isUserBrand
                        ? "#eab308"
                        : distinctColors[entry.colorIndex % distinctColors.length],
                      border: entry.isUserBrand ? "2px solid #ca8a04" : "none",
                    }}
                  />
                  <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {entry.name} ({entry.value} - {entry.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fréquence de promos par Marque</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={promoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="brand"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
                tickFormatter={formatXAxisTick}
              />
              <YAxis
                label={{
                  value: "Fréquence de promos (%)",
                  angle: -90,
                  position: "insideLeft",
                  offset: -10,
                  style: { textAnchor: "middle" },
                }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="promoRate" name="Fréquence de promos" fill="#8884d8">
                {promoData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.isUserBrand
                        ? "#eab308"
                        : distinctColors[pieData.findIndex((item) => item.name === entry.brand) % distinctColors.length]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-semibold text-blue-800">Moyenne générale</h3>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(promoData.reduce((sum, item) => sum + item.promoRate, 0) / promoData.length)}%
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h3 className="font-semibold text-yellow-800">Fréquence {brandInfo.brandName}</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {promoData.find((item) => item.isUserBrand)?.promoRate || 0}%
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <h3 className="font-semibold text-green-800">Meilleure Fréquence de promos</h3>
              <p className="text-xl font-bold text-green-600">
                {promoData[0]?.brand}: {promoData[0]?.promoRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
