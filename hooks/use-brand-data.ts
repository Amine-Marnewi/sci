"use client"

import { useState, useEffect } from "react"
import type { Product } from "@/app/dashboard/page"
import { dataManager, type DataSource } from "@/lib/data-manager"
import { useBrand } from "@/contexts/brand-context"
import { getBrandConfiguration } from "@/lib/data-generator"

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

      const brandConfig = getBrandConfiguration(brandInfo.brandName)
      let filteredData = result.data

      if (brandConfig && brandConfig.competitors && brandConfig.competitors.length > 0) {
        // Include user's brand + selected competitors only
        const allowedBrands = [brandInfo.brandName, ...brandConfig.competitors]
        filteredData = result.data.filter((product) =>
          allowedBrands.some((brand) => brand.toLowerCase().trim() === product.Brand.toLowerCase().trim()),
        )
        console.log("[v0] Filtering data by selected competitors:", brandConfig.competitors)
        console.log("[v0] Filtered data from", result.data.length, "to", filteredData.length, "products")
      } else {
        console.log("[v0] No competitor filter applied - showing all data")
      }

      setData(filteredData)
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

      const brandConfig = getBrandConfiguration(brandInfo.brandName)
      let filteredData = csvData

      if (brandConfig && brandConfig.competitors && brandConfig.competitors.length > 0) {
        const allowedBrands = [brandInfo.brandName, ...brandConfig.competitors]
        filteredData = csvData.filter((product) =>
          allowedBrands.some((brand) => brand.toLowerCase().trim() === product.Brand.toLowerCase().trim()),
        )
        console.log("[v0] Applied competitor filter to imported CSV data")
      }

      setData(filteredData)
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

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `brand-config-${brandInfo.brandName}` && e.newValue) {
        console.log("[v0] Brand configuration changed, reloading data with new competitor filter")
        loadData(true)
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Also listen for custom events from the same tab
    const handleConfigChange = () => {
      console.log("[v0] Brand configuration updated, reloading data")
      loadData(true)
    }

    window.addEventListener("brandConfigUpdated", handleConfigChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("brandConfigUpdated", handleConfigChange)
    }
  }, [brandInfo.brandName])

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
