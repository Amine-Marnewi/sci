"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Bar, BarChart, Area, AreaChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, Calendar, DollarSign, BarChart3 } from "lucide-react"
import { getBrandConfiguration } from "@/lib/data-generator"
import { useBrand } from "@/contexts/brand-context"

interface PromotionTrendsChartProps {
  data?: any[]
}

const generatePromotionData = (data: any[], competitors: string[]) => {
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
  
  return months.map((month, monthIndex) => {
    const monthData: any = { month }
    competitors.forEach((competitor) => {
      const promos = data.filter((p) => {
        if (p.Brand !== competitor || !p.promo_date_debut) return false
        const promoMonth = new Date(p.promo_date_debut).getMonth()
        return promoMonth === monthIndex
      })
      monthData[competitor] = promos.length
    })
    return monthData
  })
}

const generatePriceData = (data: any[], competitors: string[]) => {
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
  
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
  const subFamilies = [...new Set(products.map((p) => p["Sous-famille"]))].filter(Boolean).slice(0, 5)
  
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

  const promotionData = generatePromotionData(data || [], availableCompetitors)
  const priceData = generatePriceData(data || [], availableCompetitors)

  const chartConfig = availableCompetitors.reduce((config, competitor, index) => {
    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]
    config[competitor] = { label: competitor, color: colors[index % colors.length] }
    return config
  }, {} as Record<string, { label: string; color: string }>)

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

  const totalPromotions = promotionData.reduce((sum, m) => 
    sum + selectedCompetitors.reduce((s, c) => s + (m[c] || 0), 0), 0)
  const averagePerMonth = totalPromotions > 0 ? Math.round(totalPromotions / 12) : 0
  const lastMonthSum = selectedCompetitors.reduce((s, c) => s + (promotionData[11]?.[c] || 0), 0)

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
                <p className="text-sm text-gray-600 mt-1">Tendances promotionnelles et évolution des prix par concurrent</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{lastMonthSum}</p>
                <p className="text-xs text-gray-500">Promos en Décembre</p>
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
                <span>Tendances Promos</span>
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
                    >
                      {competitor}
                    </Button>
                  ))}
                </div>
              </div>

              <ChartContainer config={chartConfig} className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={promotionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: "Nombre de Promotions", angle: -90, position: "insideLeft" }} />
                    <ChartTooltip content={<ChartTooltipContent />} labelFormatter={(label) => `Mois: ${label}`} />
                    <Legend />
                    {selectedCompetitors.map((competitor) => (
                      <Bar key={competitor} dataKey={competitor} fill={chartConfig[competitor]?.color} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedCompetitors.map((competitor) => {
                  const competitorData = promotionData.map((m) => m[competitor] || 0)
                  const total = competitorData.reduce((s, v) => s + v, 0)
                  const average = Math.round(total / 12)
                  const trend = competitorData[11] > competitorData[0] ? "up" : "down"
                  const subFamilyData = generateSubFamilyData(competitor, data || [])

                  return (
                    <Card key={competitor} className="border-l-4" style={{ borderLeftColor: chartConfig[competitor]?.color }}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">{competitor}</h4>
                            <TrendingUp className={`w-4 h-4 ${trend === "up" ? "text-green-500" : "text-red-500"}`} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold" style={{ color: chartConfig[competitor]?.color }}>{total}</p>
                            <p className="text-xs text-gray-500">Total annuel</p>
                          </div>
                          <div>
                            <p className="text-lg font-medium text-gray-700">{average}</p>
                            <p className="text-xs text-gray-500">Moyenne mensuelle</p>
                          </div>
                          {subFamilyData.length > 0 && (
                            <div className="border-t pt-3">
                              <p className="text-xs font-medium text-gray-700 mb-2">Détail par sous-famille:</p>
                              <div className="space-y-1">
                                {subFamilyData.map((item) => (
                                  <div key={item.subFamily} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{item.subFamily}</span>
                                    <span className="font-medium">{item.promos} promos</span>
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
                    >
                      {competitor}
                    </Button>
                  ))}
                </div>
              </div>

              <ChartContainer config={chartConfig} className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: "Prix (TND)", angle: -90, position: "insideLeft" }} />
                    <ChartTooltip content={<ChartTooltipContent />} labelFormatter={(label) => `Mois: ${label}`} formatter={(value: any) => [`${value} TND`, ""]} />
                    <Legend />
                    {selectedCompetitors.map((competitor) => (
                      <Area key={competitor} type="monotone" dataKey={competitor} stroke={chartConfig[competitor]?.color} fill={chartConfig[competitor]?.color} fillOpacity={0.3} strokeWidth={2} />
                    ))}
                  </AreaChart>
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
                        <div key={stat.competitor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartConfig[stat.competitor]?.color }} />
                            <span className="font-medium">{stat.competitor}</span>
                          </div>
                          <div className="text-right text-sm">
                            <div>Moy: <span className="font-semibold">{stat.avg} TND</span></div>
                            <div className="text-gray-600">Min: {stat.min} TND | Max: {stat.max} TND</div>
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
                        <p className="text-sm text-blue-700">Juillet-Août et Novembre-Décembre montrent les plus fortes baisses de prix, indiquant des périodes promotionnelles saisonnières.</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Stabilité des Prix</h4>
                        <p className="text-sm text-green-700">Mars-Mai présente généralement les prix les plus stables avec moins de variations promotionnelles.</p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <h4 className="font-semibold text-orange-800 mb-2">Compétitivité</h4>
                        <p className="text-sm text-orange-700">Les prix varient selon les concurrents, avec des écarts significatifs durant les périodes promotionnelles.</p>
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