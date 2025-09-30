import type { Product } from "@/app/dashboard/page"

export interface BrandConfig {
  name: string
  industry: string
  competitors: string[]
  productCategories: ProductCategory[]
  priceRange: { min: number; max: number }
  promotionRate: number
}

export interface ProductCategory {
  rayon: string
  famille: string
  sousFamilles: string[]
  products: ProductTemplate[]
}

export interface ProductTemplate {
  name: string
  grammageOptions: number[]
  basePrice: number
  priceVariation: number
}

// Predefined brand configurations
export const BRAND_CONFIGURATIONS: Record<string, BrandConfig> = {
  SAÏDA: {
    name: "SAÏDA",
    industry: "Agroalimentaire",
    competitors: [],
    productCategories: [
      {
        rayon: "Épicerie",
        famille: "Huiles",
        sousFamilles: ["Huile d'olive", "Huile de tournesol", "Huile de maïs"],
        products: [
          {
            name: "Huile d'olive extra vierge",
            grammageOptions: [250, 500, 1000],
            basePrice: 8.5,
            priceVariation: 0.3,
          },
          { name: "Huile d'olive vierge", grammageOptions: [500, 1000], basePrice: 6.2, priceVariation: 0.25 },
          { name: "Huile de tournesol", grammageOptions: [500, 1000], basePrice: 4.8, priceVariation: 0.2 },
        ],
      },
      {
        rayon: "Épicerie",
        famille: "Conserves",
        sousFamilles: ["Tomates", "Poissons", "Légumes"],
        products: [
          { name: "Concentré de tomate", grammageOptions: [200, 400, 800], basePrice: 2.1, priceVariation: 0.4 },
          { name: "Thon à l'huile", grammageOptions: [160, 320], basePrice: 4.2, priceVariation: 0.3 },
          { name: "Sardines à l'huile", grammageOptions: [125, 250], basePrice: 3.1, priceVariation: 0.25 },
        ],
      },
    ],
    priceRange: { min: 1.5, max: 15.0 },
    promotionRate: 0.25,
  },
  CARTHAGE: {
    name: "CARTHAGE",
    industry: "Agroalimentaire",
    competitors: ["SAÏDA", "SICAM", "GOULETTE", "DELICE"],
    productCategories: [
      {
        rayon: "Épicerie",
        famille: "Huiles",
        sousFamilles: ["Huile d'olive", "Huile végétale"],
        products: [
          { name: "Huile d'olive premium", grammageOptions: [500, 1000], basePrice: 9.2, priceVariation: 0.2 },
          { name: "Huile végétale", grammageOptions: [1000], basePrice: 5.5, priceVariation: 0.15 },
        ],
      },
    ],
    priceRange: { min: 2.0, max: 18.0 },
    promotionRate: 0.15,
  },
  SICAM: {
    name: "SICAM",
    industry: "Agroalimentaire",
    competitors: ["SAÏDA", "CARTHAGE", "GOULETTE"],
    productCategories: [
      {
        rayon: "Épicerie",
        famille: "Conserves",
        sousFamilles: ["Tomates", "Poissons"],
        products: [
          { name: "Concentré de tomate double", grammageOptions: [400, 800], basePrice: 2.8, priceVariation: 0.3 },
          { name: "Thon naturel", grammageOptions: [160], basePrice: 5.1, priceVariation: 0.2 },
        ],
      },
    ],
    priceRange: { min: 1.8, max: 12.0 },
    promotionRate: 0.2,
  },
}

// Industry-specific configurations
export const INDUSTRY_CONFIGURATIONS: Record<string, Partial<BrandConfig>> = {
  Agroalimentaire: {
    productCategories: [
      {
        rayon: "Épicerie",
        famille: "Huiles",
        sousFamilles: ["Huile d'olive", "Huile de tournesol", "Huile de maïs"],
        products: [
          { name: "Huile d'olive", grammageOptions: [250, 500, 1000], basePrice: 7.5, priceVariation: 0.4 },
          { name: "Huile de tournesol", grammageOptions: [500, 1000], basePrice: 4.5, priceVariation: 0.3 },
        ],
      },
      {
        rayon: "Épicerie",
        famille: "Conserves",
        sousFamilles: ["Tomates", "Poissons", "Légumes"],
        products: [
          { name: "Concentré de tomate", grammageOptions: [200, 400], basePrice: 2.2, priceVariation: 0.5 },
          { name: "Thon", grammageOptions: [160, 320], basePrice: 4.0, priceVariation: 0.4 },
        ],
      },
    ],
    priceRange: { min: 1.0, max: 20.0 },
    promotionRate: 0.2,
  },
  Cosmétique: {
    productCategories: [
      {
        rayon: "Beauté",
        famille: "Soins visage",
        sousFamilles: ["Crèmes", "Nettoyants", "Sérums"],
        products: [
          { name: "Crème hydratante", grammageOptions: [50, 100], basePrice: 25.0, priceVariation: 0.6 },
          { name: "Nettoyant visage", grammageOptions: [150, 250], basePrice: 18.0, priceVariation: 0.4 },
        ],
      },
    ],
    priceRange: { min: 8.0, max: 80.0 },
    promotionRate: 0.3,
  },
}

export function generateDynamicData(
  userBrand: string,
  industry?: string,
  competitors?: string[],
  productCount = 50,
): Product[] {
  const products: Product[] = []

  let brandConfig = BRAND_CONFIGURATIONS[userBrand]

  if (!brandConfig && industry) {
    const industryConfig = INDUSTRY_CONFIGURATIONS[industry]
    if (industryConfig) {
      brandConfig = {
        name: userBrand,
        industry,
        competitors: competitors || ["CONCURRENT_A", "CONCURRENT_B", "CONCURRENT_C"],
        productCategories: industryConfig.productCategories || [],
        priceRange: industryConfig.priceRange || { min: 5.0, max: 50.0 },
        promotionRate: industryConfig.promotionRate || 0.2,
      }
    }
  }

  if (!brandConfig) {
    brandConfig = {
      name: userBrand,
      industry: industry || "Général",
      competitors: competitors || ["CONCURRENT_A", "CONCURRENT_B", "CONCURRENT_C"],
      productCategories: INDUSTRY_CONFIGURATIONS["Agroalimentaire"].productCategories || [],
      priceRange: { min: 2.0, max: 25.0 },
      promotionRate: 0.2,
    }
  }

  const allBrands = [userBrand, ...brandConfig.competitors]
  const possibleSources = ["Carrefour", "Aziza", "Géant", "Monoprix", "Magasin Général"]

  allBrands.forEach((brand) => {
    const isUserBrand = brand === userBrand
    const brandProductCount = isUserBrand
      ? Math.ceil(productCount * 0.4)
      : Math.ceil((productCount * 0.6) / brandConfig.competitors.length)

    for (let i = 0; i < brandProductCount; i++) {
      const category = brandConfig.productCategories[Math.floor(Math.random() * brandConfig.productCategories.length)]
      const productTemplate = category.products[Math.floor(Math.random() * category.products.length)]
      const sousFamille = category.sousFamilles[Math.floor(Math.random() * category.sousFamilles.length)]
      const grammage = productTemplate.grammageOptions[Math.floor(Math.random() * productTemplate.grammageOptions.length)]

      const priceVariation = (Math.random() - 0.5) * 2 * productTemplate.priceVariation
      const basePrice = productTemplate.basePrice * (grammage / 500)
      const priceBefore = Math.max(1, basePrice + basePrice * priceVariation)

      const hasPromo = Math.random() < brandConfig.promotionRate
      const discountRate = hasPromo ? 0.1 + Math.random() * 0.3 : 0
      const priceAfter = hasPromo ? priceBefore * (1 - discountRate) : priceBefore

      const source = possibleSources[Math.floor(Math.random() * possibleSources.length)]

      let promoDateDebut = ""
      let promoDateFin = ""
      if (hasPromo) {
        const startMonth = Math.floor(Math.random() * 12)
        const startDay = Math.floor(Math.random() * 28) + 1
        const duration = Math.floor(Math.random() * 30) + 7
        const startDate = new Date(2024, startMonth, startDay)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + duration)

        // Format as DD/MM/YYYY
        promoDateDebut = `${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`
        promoDateFin = `${String(endDate.getDate()).padStart(2, '0')}/${String(endDate.getMonth() + 1).padStart(2, '0')}/${endDate.getFullYear()}`
      }

      const product: Product = {
        Product: `${productTemplate.name} ${grammage}${grammage < 1000 ? "ml" : "g"}`,
        Brand: brand,
        Source: source,
        Rayon: category.rayon,
        Famille: category.famille,
        "Sous-famille": sousFamille,
        Grammage: grammage,
        "Price Before (TND)": Math.round(priceBefore * 100) / 100,
        "Price After (TND)": Math.round(priceAfter * 100) / 100,
        URL: `https://example.com/${brand.toLowerCase()}-${productTemplate.name.toLowerCase().replace(/\s+/g, "-")}`,
        promo_date_debut: promoDateDebut,
        promo_date_fin: promoDateFin,
      }

      products.push(product)
    }
  })

  return products
}

export function getBrandConfiguration(brandName: string): BrandConfig | null {
  return BRAND_CONFIGURATIONS[brandName] || null
}

export function getIndustryConfiguration(industry: string): Partial<BrandConfig> | null {
  return INDUSTRY_CONFIGURATIONS[industry] || null
}

export function addCustomBrandConfiguration(config: BrandConfig): void {
  BRAND_CONFIGURATIONS[config.name] = config
}