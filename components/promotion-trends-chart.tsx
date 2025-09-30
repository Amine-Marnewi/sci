"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { TrendingUp, Calendar, DollarSign, BarChart3 } from "lucide-react"
import { getBrandConfiguration } from "@/lib/data-generator"
import { useBrand } from "@/contexts/brand-context"

interface PromotionTrendsChartProps {
  data?: any[]
}

const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null

  // Handle DD/MM/YYYY format
  const parts = dateString.split("/")
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // JavaScript months are 0-indexed
    const year = parseInt(parts[2], 10)

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day)
    }
  }

  // Fallback to default parsing
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

const generateTimelineData = (data: any[], selectedCompetitors: string[]) => {
  const allSources = [...new Set(data.map((p) => p.Source).filter(Boolean))].sort()

  const promoEvents: any[] = []

  selectedCompetitors.forEach((competitor) => {
    const competitorProducts = data.filter((p) => p.Brand === competitor && p.promo_date_debut && p.promo_date_fin)

    competitorProducts.forEach((product) => {
      const startDate = parseDate(product.promo_date_debut)
      const endDate = parseDate(product.promo_date_fin)

      if (!startDate || !endDate) {
        return
      }

      promoEvents.push({
        competitor,
        source: product.Source || "Inconnu",
        subFamily: product["Sous-famille"],
        startDate,
        endDate,
        product: product.Product,
      })
    })
  })

  return { allSources, promoEvents }
}

const generatePriceData = (data: any[], competitors: string[]) => {
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]

  return months.map((month, monthIndex) => {
    const monthData: any = { month }
    competitors.forEach((competitor) => {
      const products = data.filter((p) => p.Brand === competitor)
      if (products.length > 0) {
        const avg = products.reduce((sum, p) => sum + p["Price After (TND)"], 0) / products.length
        monthData[competitor] = Number(avg.toFixed(2))
      }
    })
    return monthData
  })
}

const generateSubFamilyData = (competitor: string, data: any[]) => {
  const products = data.filter((p) => p.Brand === competitor)
  const subFamilies = [...new Set(products.map((p) => p["Sous-famille"]))].filter(Boolean)

  return subFamilies.map((sf) => ({
    subFamily: sf,
    promos: products.filter((p) => p["Sous-famille"] === sf && p.promo_date_debut).length,
  }))
}

export function PromotionTrendsChart({ data }: PromotionTrendsChartProps) {
  const { brandInfo } = useBrand()
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([])
  const [availableCompetitors, setAvailableCompetitors] = useState<string[]>([])

  useEffect(() => {
    if (data && data.length > 0) {
      const allBrands = [...new Set(data.map((p) => p.Brand))]
        .filter((b) => b && b.toLowerCase() !== brandInfo.brandName.toLowerCase())
        .sort()

      const config = getBrandConfiguration(brandInfo.brandName)
      const configCompetitors = config?.competitors || []

      const competitors = configCompetitors.length > 0 ? configCompetitors : allBrands
      setAvailableCompetitors(competitors)
      setSelectedCompetitors(competitors)
    }
  }, [data, brandInfo.brandName])

  const priceData = generatePriceData(data || [], selectedCompetitors)
  const { allSources, promoEvents } = generateTimelineData(data || [], selectedCompetitors)

  const competitorColors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ]

  const chartConfig = selectedCompetitors.reduce(
    (config, competitor, index) => {
      config[competitor] = {
        label: competitor,
        color: competitorColors[index % competitorColors.length],
      }
      return config
    },
    {} as Record<string, { label: string; color: string }>,
  )

  const calculatePriceStats = () => {
    return selectedCompetitors.map((competitor) => {
      const prices = priceData.map((m) => m[competitor]).filter((p) => p > 0)
      if (prices.length === 0) return { competitor, avg: "0.00", min: "0.00", max: "0.00", volatility: "0%" }
      const avg = prices.reduce((s, p) => s + p, 0) / prices.length
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      return {
        competitor,
        avg: avg.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
        volatility: `${(((max - min) / avg) * 100).toFixed(1)}%`,
      }
    })
  }

  const totalPromotions = promoEvents.length
  const averagePerMonth = totalPromotions > 0 ? Math.round(totalPromotions / 12) : 0

  const toggleCompetitor = (competitor: string) => {
    if (selectedCompetitors.includes(competitor)) {
      if (selectedCompetitors.length > 1) {
        setSelectedCompetitors(selectedCompetitors.filter((c) => c !== competitor))
      }
    } else {
      setSelectedCompetitors([...selectedCompetitors, competitor])
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">Analyse Concurrentielle</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Tendances promotionnelles et évolution des prix par concurrent
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{totalPromotions}</p>
                <p className="text-xs text-gray-500">Promos totales</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-700">{averagePerMonth}</p>
                <p className="text-xs text-gray-500">Moyenne mensuelle</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-50">
                <Calendar className="w-3 h-3 mr-1" />
                Année complète
              </Badge>
              <Badge variant="secondary">{totalPromotions} promotions totales</Badge>
              <Badge variant="outline">{availableCompetitors.length} concurrents</Badge>
            </div>
          </div>

          <Tabs defaultValue="promotions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="promotions" className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Plan Promo Historique</span>
              </TabsTrigger>
              <TabsTrigger value="prices" className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Évolution Prix</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="promotions" className="space-y-6">
              <div className="flex items-center space-x-4 mb-4">
                <label className="text-sm font-medium text-gray-700">Concurrents:</label>
                <div className="flex space-x-2 flex-wrap">
                  {availableCompetitors.map((competitor) => (
                    <Button
                      key={competitor}
                      variant={selectedCompetitors.includes(competitor) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleCompetitor(competitor)}
                      className="text-xs"
                      style={
                        selectedCompetitors.includes(competitor)
                          ? {
                              backgroundColor: chartConfig[competitor]?.color,
                              borderColor: chartConfig[competitor]?.color,
                            }
                          : {}
                      }
                    >
                      {competitor}
                    </Button>
                  ))}
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Calendrier des Promotions par Source</CardTitle>
                  <p className="text-sm text-gray-600">Périodes promotionnelles par magasin et sous-famille</p>
                </CardHeader>
                <CardContent>
                  <div className="relative" style={{ minHeight: `${Math.max(allSources.length * 120, 400)}px` }}>
                    {/* Month labels */}
                    <div className="flex mb-4 pl-48">
                      {["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"].map(
                        (month, idx) => (
                          <div
                            key={idx}
                            className="flex-1 text-center text-xs font-medium text-gray-600 border-l border-gray-200"
                          >
                            {month}
                          </div>
                        ),
                      )}
                    </div>

                    {/* Timeline rows for each source */}
                    {allSources.map((source) => {
                      const sourceEvents = promoEvents.filter((event) => event.source === source)
                      const subFamilies = [...new Set(sourceEvents.map((e) => e.subFamily))].sort()

                      return (
                        <div key={source} className="mb-8">
                          <div className="flex items-start">
                            {/* Source label */}
                            <div className="w-48 pr-4 pt-2">
                              <div className="text-sm font-bold text-gray-900 bg-blue-50 px-3 py-2 rounded border-l-4 border-blue-500">
                                {source}
                              </div>
                            </div>

                            <div className="flex-1">
                              {subFamilies.map((subFamily) => {
                                const sfEvents = sourceEvents.filter((e) => e.subFamily === subFamily)

                                return (
                                  <div key={`${source}-${subFamily}`} className="mb-3">
                                    <div className="flex items-center mb-1">
                                      <div className="w-full">
                                        <div className="text-xs font-medium text-gray-700 mb-1 px-2">
                                          {subFamily}
                                        </div>
                                        {/* Timeline grid */}
                                        <div className="relative h-8 border border-gray-200 rounded bg-gray-50">
                                          {/* Month dividers */}
                                          {[...Array(12)].map((_, idx) => (
                                            <div
                                              key={idx}
                                              className="absolute top-0 bottom-0 border-l border-gray-200"
                                              style={{ left: `${(idx / 12) * 100}%` }}
                                            />
                                          ))}

                                          {sfEvents.map((event, eventIdx) => {
                                            // Calculate position based on day of year
                                            const yearStart = new Date(event.startDate.getFullYear(), 0, 1)
                                            const totalDays = 365

                                            const startDayOfYear = Math.floor(
                                              (event.startDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
                                            )
                                            const endDayOfYear = Math.floor(
                                              (event.endDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
                                            )

                                            const startPos = (startDayOfYear / totalDays) * 100
                                            const endPos = (endDayOfYear / totalDays) * 100
                                            const width = Math.max(endPos - startPos, 0.5)

                                            const color = chartConfig[event.competitor]?.color || "#gray"

                                            return (
                                              <div
                                                key={`${event.competitor}-${eventIdx}`}
                                                className="absolute top-0.5 bottom-0.5 rounded px-1 text-xs text-white font-medium flex items-center justify-center overflow-hidden shadow-sm cursor-pointer hover:opacity-100 transition-opacity"
                                                style={{
                                                  left: `${startPos}%`,
                                                  width: `${width}%`,
                                                  backgroundColor: color,
                                                  opacity: 0.9,
                                                }}
                                                title={`${event.competitor} - ${event.subFamily}\n${event.startDate.toLocaleDateString("fr-FR")} - ${event.endDate.toLocaleDateString("fr-FR")}\n${event.product}`}
                                              >
                                                <span className="truncate text-[10px] font-semibold">
                                                  {event.competitor}
                                                </span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t flex flex-wrap gap-3 justify-center">
                      {selectedCompetitors.map((competitor) => (
                        <div key={competitor} className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: chartConfig[competitor]?.color }}
                          />
                          <span className="text-sm font-medium text-gray-700">{competitor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedCompetitors.map((competitor) => {
                  const competitorPromos = promoEvents.filter((e) => e.competitor === competitor)
                  const subFamilyData = generateSubFamilyData(competitor, data || [])

                  return (
                    <Card
                      key={competitor}
                      className="border-l-4"
                      style={{ borderLeftColor: chartConfig[competitor]?.color }}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">{competitor}</h4>
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold" style={{ color: chartConfig[competitor]?.color }}>
                              {competitorPromos.length}
                            </p>
                            <p className="text-xs text-gray-500">Total annuel</p>
                          </div>
                          <div>
                            <p className="text-lg font-medium text-gray-700">
                              {Math.round(competitorPromos.length / 12)}
                            </p>
                            <p className="text-xs text-gray-500">Moyenne mensuelle</p>
                          </div>
                          {subFamilyData.length > 0 && (
                            <div className="border-t pt-3">
                              <p className="text-xs font-medium text-gray-700 mb-2">Détail par sous-famille:</p>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {subFamilyData.map((item) => (
                                  <div key={item.subFamily} className="flex justify-between text-xs">
                                    <span className="text-gray-600 truncate">{item.subFamily}</span>
                                    <span className="font-medium ml-2">{item.promos} promos</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="prices" className="space-y-6">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Concurrents:</label>
                <div className="flex space-x-2 flex-wrap">
                  {availableCompetitors.map((competitor) => (
                    <Button
                      key={competitor}
                      variant={selectedCompetitors.includes(competitor) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleCompetitor(competitor)}
                      className="text-xs"
                      style={
                        selectedCompetitors.includes(competitor)
                          ? {
                              backgroundColor: chartConfig[competitor]?.color,
                              borderColor: chartConfig[competitor]?.color,
                            }
                          : {}
                      }
                    >
                      {competitor}
                    </Button>
                  ))}
                </div>
              </div>

              <ChartContainer config={chartConfig} className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      label={{ value: "Prix (TND)", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                              <p className="font-medium mb-2">{label}</p>
                              {payload.map((entry: any) => (
                                <p key={entry.name} style={{ color: entry.color }}>
                                  {entry.name}: {entry.value} TND
                                </p>
                              ))}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend />
                    {selectedCompetitors.map((competitor) => (
                      <Line
                        key={competitor}
                        type="monotone"
                        dataKey={competitor}
                        stroke={chartConfig[competitor]?.color}
                        strokeWidth={3}
                        dot={{ fill: chartConfig[competitor]?.color, r: 5, strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 7 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <DollarSign className="w-5 h-5" />
                      <span>Statistiques Prix</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {calculatePriceStats().map((stat) => (
                        <div
                          key={stat.competitor}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: chartConfig[stat.competitor]?.color }}
                            />
                            <span className="font-medium">{stat.competitor}</span>
                          </div>
                          <div className="text-right text-sm">
                            <div>
                              Moy: <span className="font-semibold">{stat.avg} TND</span>
                            </div>
                            <div className="text-gray-600">
                              Min: {stat.min} TND | Max: {stat.max} TND
                            </div>
                            <div className="text-orange-600">Volatilité: {stat.volatility}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Analyse Saisonnière</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Période de Promotions Intenses</h4>
                        <p className="text-sm text-blue-700">
                          Juillet-Août et Novembre-Décembre montrent les plus fortes baisses de prix, indiquant des
                          périodes promotionnelles saisonnières.
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Stabilité des Prix</h4>
                        <p className="text-sm text-green-700">
                          Mars-Mai présente généralement les prix les plus stables avec moins de variations
                          promotionnelles.
                        </p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <h4 className="font-semibold text-orange-800 mb-2">Compétitivité</h4>
                        <p className="text-sm text-orange-700">
                          Les prix varient selon les concurrents, avec des écarts significatifs durant les périodes
                          promotionnelles.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}