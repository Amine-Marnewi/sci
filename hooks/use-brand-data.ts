"use client"

import { useState, useEffect } from "react"
import type { Product } from "@/app/dashboard/page"
import { dataManager, type DataSource } from "@/lib/data-manager"
import { useBrand } from "@/contexts/brand-context"

export function useBrandData() {
  const { brandInfo } = useBrand()
  const [data, setData] = useState<Product[]>([])
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (forceRefresh = false) => {
    if (!brandInfo.brandName) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await dataManager.getDataForBrand(brandInfo.brandName, brandInfo.industry, undefined, forceRefresh)

      setData(result.data)
      setDataSource(result.source)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
      console.error("Error loading brand data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = () => loadData(true)

  const importCSV = async (csvData: Product[]) => {
    try {
      const userBrandName = brandInfo.brandName
      if (!userBrandName) {
        throw new Error("Aucune marque sélectionnée. Veuillez vous connecter d'abord.")
      }

      const normalizedUserBrand = userBrandName.toLowerCase().trim()
      const userBrandProducts = csvData.filter(
        (product) => product.Brand && product.Brand.toLowerCase().trim() === normalizedUserBrand,
      )

      const allBrands = [...new Set(csvData.map((p) => p.Brand).filter((brand): brand is string => !!brand))]
      const competitors = allBrands.filter((brand) => brand.toLowerCase().trim() !== normalizedUserBrand)

      console.log(`Found ${userBrandProducts.length} products for brand "${userBrandName}"`)
      console.log(`Identified ${competitors.length} competitors:`, competitors)

      await dataManager.importCSVData(userBrandName, csvData, userBrandProducts, competitors)

      setData(csvData)
      setDataSource("upload")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import CSV data"
      setError(errorMessage)
      console.error("Import error:", err)
      throw new Error(errorMessage)
    }
  }

  const clearCache = () => {
    if (brandInfo.brandName) {
      dataManager.clearCache(brandInfo.brandName)
      setData([])
      setDataSource(null)
      loadData(true)
    }
  }

  useEffect(() => {
    if (brandInfo.brandName) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [brandInfo.brandName, brandInfo.industry])

  return {
    data,
    dataSource,
    isLoading,
    error,
    refreshData,
    importCSV,
    clearCache,
    hasData: data.length > 0,
  }
}
