"use client"

import type { Product } from "@/app/dashboard/page"

export type DataSource = "cache" | "upload" | "api" | null

interface DataResult {
  data: Product[]
  source: DataSource
}

interface CachedData {
  data: Product[]
  timestamp: number
  brandName: string
  industry?: string
}

class DataManager {
  private cache = new Map<string, CachedData>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  private getCacheKey(brandName: string, industry?: string): string {
    return `${brandName.toLowerCase().trim()}_${industry || "default"}`
  }

  private isCacheValid(cached: CachedData): boolean {
    return Date.now() - cached.timestamp < this.CACHE_DURATION
  }

  private saveToLocalStorage(brandName: string, data: Product[]): void {
    try {
      const key = `csv-data-${brandName.toLowerCase().trim()}`
      localStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
          brandName,
        }),
      )
    } catch (error) {
      console.error("Failed to save CSV data to localStorage:", error)
    }
  }

  private loadFromLocalStorage(brandName: string): Product[] | null {
    try {
      const key = `csv-data-${brandName.toLowerCase().trim()}`
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Check if data is not too old (24 hours)
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data
        }
      }
    } catch (error) {
      console.error("Failed to load CSV data from localStorage:", error)
    }
    return null
  }

  async getDataForBrand(
    brandName: string,
    industry?: string,
    csvData?: Product[],
    forceRefresh = false,
  ): Promise<DataResult> {
    const cacheKey = this.getCacheKey(brandName, industry)
    const cached = this.cache.get(cacheKey)

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cached && this.isCacheValid(cached)) {
      return {
        data: cached.data,
        source: "cache",
      }
    }

    // If CSV data is provided, use it
    if (csvData && csvData.length > 0) {
      const result = {
        data: csvData,
        source: "upload" as DataSource,
      }

      // Cache the data
      this.cache.set(cacheKey, {
        data: csvData,
        timestamp: Date.now(),
        brandName,
        industry,
      })

      this.saveToLocalStorage(brandName, csvData)

      return result
    }

    const storedData = this.loadFromLocalStorage(brandName)
    if (storedData && storedData.length > 0) {
      // Update cache with stored data
      this.cache.set(cacheKey, {
        data: storedData,
        timestamp: Date.now(),
        brandName,
        industry,
      })

      return {
        data: storedData,
        source: "upload",
      }
    }

    // Return cached data even if expired, or empty array
    if (cached) {
      return {
        data: cached.data,
        source: "cache",
      }
    }

    return {
      data: [],
      source: null,
    }
  }

  async importCSVData(
    brandName: string,
    allData: Product[],
    userBrandProducts: Product[],
    competitors: string[],
  ): Promise<void> {
    try {
      // Store the complete dataset in cache
      const cacheKey = this.getCacheKey(brandName)
      this.cache.set(cacheKey, {
        data: allData,
        timestamp: Date.now(),
        brandName,
      })

      this.saveToLocalStorage(brandName, allData)

      console.log(`Imported ${allData.length} products for brand analysis`)
      console.log(`User brand products: ${userBrandProducts.length}`)
      console.log(`Competitors: ${competitors.join(", ")}`)
    } catch (error) {
      console.error("Error importing CSV data:", error)
      throw error
    }
  }

  clearCache(brandName?: string): void {
    if (brandName) {
      // Clear specific brand cache
      const keysToDelete = Array.from(this.cache.keys()).filter((key) => key.startsWith(brandName.toLowerCase().trim()))
      keysToDelete.forEach((key) => this.cache.delete(key))

      try {
        const key = `csv-data-${brandName.toLowerCase().trim()}`
        localStorage.removeItem(key)
      } catch (error) {
        console.error("Failed to clear localStorage:", error)
      }
    } else {
      // Clear all cache
      this.cache.clear()

      try {
        const keys = Object.keys(localStorage).filter((key) => key.startsWith("csv-data-"))
        keys.forEach((key) => localStorage.removeItem(key))
      } catch (error) {
        console.error("Failed to clear localStorage:", error)
      }
    }
  }

  getCacheInfo(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Export singleton instance
export const dataManager = new DataManager()
