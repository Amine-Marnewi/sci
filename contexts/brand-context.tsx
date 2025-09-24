// "use client"

// import type React from "react"
// import { createContext, useContext, useEffect, useState } from "react"

// export interface BrandInfo {
//   brandName: string
//   companyName: string
//   industry: string
//   email: string
//   loginTime: string
//   isLoggedIn: boolean
// }

// interface BrandContextType {
//   brandInfo: BrandInfo
//   setBrandInfo: (info: Partial<BrandInfo>) => void
//   updateBrandInfo: (updates: Partial<BrandInfo>) => void
//   logout: () => void
//   isAuthenticated: boolean
// }

// const defaultBrandInfo: BrandInfo = {
//   brandName: "",
//   companyName: "",
//   industry: "",
//   email: "",
//   loginTime: "",
//   isLoggedIn: false,
// }

// const BrandContext = createContext<BrandContextType | undefined>(undefined)

// export function BrandProvider({ children }: { children: React.ReactNode }) {
//   const [brandInfo, setBrandInfoState] = useState<BrandInfo>(defaultBrandInfo)
//   const [isLoaded, setIsLoaded] = useState(false)

//   // Load brand info from localStorage on mount
//   useEffect(() => {
//     const stored = localStorage.getItem("brandInfo")
//     if (stored) {
//       try {
//         const parsedInfo = JSON.parse(stored)
//         setBrandInfoState({
//           ...parsedInfo,
//           isLoggedIn: true,
//         })
//       } catch (error) {
//         console.error("Error parsing stored brand info:", error)
//         localStorage.removeItem("brandInfo")
//       }
//     }
//     setIsLoaded(true)
//   }, [])

//   // Save to localStorage whenever brandInfo changes
//   useEffect(() => {
//     if (isLoaded && brandInfo.isLoggedIn) {
//       localStorage.setItem("brandInfo", JSON.stringify(brandInfo))
//     }
//   }, [brandInfo, isLoaded])

//   const setBrandInfo = (info: Partial<BrandInfo>) => {
//     const newBrandInfo = {
//       ...defaultBrandInfo,
//       ...info,
//       isLoggedIn: true,
//       loginTime: new Date().toISOString(),
//     }
//     setBrandInfoState(newBrandInfo)
//   }

//   const updateBrandInfo = (updates: Partial<BrandInfo>) => {
//     setBrandInfoState((prev) => ({
//       ...prev,
//       ...updates,
//     }))
//   }

//   const logout = () => {
//     setBrandInfoState(defaultBrandInfo)
//     localStorage.removeItem("brandInfo")
//   }

//   const value: BrandContextType = {
//     brandInfo,
//     setBrandInfo,
//     updateBrandInfo,
//     logout,
//     isAuthenticated: brandInfo.isLoggedIn,
//   }

//   return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
// }

// export function useBrand() {
//   const context = useContext(BrandContext)
//   if (context === undefined) {
//     throw new Error("useBrand must be used within a BrandProvider")
//   }
//   return context
// }

// // Helper hook for brand-specific styling and theming
// export function useBrandTheme() {
//   const { brandInfo } = useBrand()

//   // Generate brand-specific colors based on brand name
//   const getBrandColors = (brandName: string) => {
//     const colors = {
//       SAÏDA: {
//         primary: "from-yellow-400 to-green-500",
//         accent: "yellow-400",
//         secondary: "green-500",
//       },
//       LBM: {
//         primary: "from-blue-400 to-purple-500",
//         accent: "blue-400",
//         secondary: "purple-500",
//       },
//       SICAM: {
//         primary: "from-red-400 to-orange-500",
//         accent: "red-400",
//         secondary: "orange-500",
//       },
//       GOULETTE: {
//         primary: "from-teal-400 to-cyan-500",
//         accent: "teal-400",
//         secondary: "cyan-500",
//       },
//       default: {
//         primary: "from-gray-400 to-slate-500",
//         accent: "gray-400",
//         secondary: "slate-500",
//       },
//     }

//     return colors[brandName as keyof typeof colors] || colors.default
//   }

//   const brandColors = getBrandColors(brandInfo.brandName)

//   return {
//     brandColors,
//     brandName: brandInfo.brandName || "Votre Marque",
//     companyName: brandInfo.companyName || "Votre Entreprise",
//     industry: brandInfo.industry || "Votre Secteur",
//   }
// }


"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

export interface BrandInfo {
  brandName: string
  companyName: string
  industry: string
  email: string
  loginTime: string
  isLoggedIn: boolean
}

interface BrandContextType {
  brandInfo: BrandInfo
  setBrandInfo: (info: Partial<BrandInfo>) => void
  updateBrandInfo: (updates: Partial<BrandInfo>) => void
  logout: () => void
  isAuthenticated: boolean
  formattedBrandName: string // Nouvelle propriété ajoutée
}

const defaultBrandInfo: BrandInfo = {
  brandName: "",
  companyName: "",
  industry: "",
  email: "",
  loginTime: "",
  isLoggedIn: false,
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brandInfo, setBrandInfoState] = useState<BrandInfo>(defaultBrandInfo)
  const [isLoaded, setIsLoaded] = useState(false)

  // Formater le nom de la marque pour les comparaisons
  const formattedBrandName = brandInfo.brandName.toLowerCase().trim()

  // Load brand info from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("brandInfo")
    if (stored) {
      try {
        const parsedInfo = JSON.parse(stored)
        setBrandInfoState({
          ...parsedInfo,
          isLoggedIn: true,
        })
      } catch (error) {
        console.error("Error parsing stored brand info:", error)
        localStorage.removeItem("brandInfo")
      }
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever brandInfo changes
  useEffect(() => {
    if (isLoaded && brandInfo.isLoggedIn) {
      localStorage.setItem("brandInfo", JSON.stringify(brandInfo))
    }
  }, [brandInfo, isLoaded])

  const setBrandInfo = (info: Partial<BrandInfo>) => {
    const newBrandInfo = {
      ...defaultBrandInfo,
      ...info,
      isLoggedIn: true,
      loginTime: new Date().toISOString(),
    }
    setBrandInfoState(newBrandInfo)
  }

  const updateBrandInfo = (updates: Partial<BrandInfo>) => {
    setBrandInfoState((prev) => ({
      ...prev,
      ...updates,
    }))
  }

  const logout = () => {
    setBrandInfoState(defaultBrandInfo)
    localStorage.removeItem("brandInfo")
  }

  const value: BrandContextType = {
    brandInfo,
    setBrandInfo,
    updateBrandInfo,
    logout,
    isAuthenticated: brandInfo.isLoggedIn,
    formattedBrandName, // Ajout de la propriété formatée
  }

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand() {
  const context = useContext(BrandContext)
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider")
  }
  return context
}

// Helper hook for brand-specific styling and theming
export function useBrandTheme() {
  const { brandInfo, formattedBrandName } = useBrand()

  // Generate brand-specific colors based on brand name
  const getBrandColors = (brandName: string) => {
    const colors = {
      saïda: { // Notez le format en minuscules
        primary: "from-yellow-400 to-green-500",
        accent: "yellow-400",
        secondary: "green-500",
      },
      lbm: {
        primary: "from-blue-400 to-purple-500",
        accent: "blue-400",
        secondary: "purple-500",
      },
      sicam: {
        primary: "from-red-400 to-orange-500",
        accent: "red-400",
        secondary: "orange-500",
      },
      goulette: {
        primary: "from-teal-400 to-cyan-500",
        accent: "teal-400",
        secondary: "cyan-500",
      },
      default: {
        primary: "from-gray-400 to-slate-500",
        accent: "gray-400",
        secondary: "slate-500",
      },
    }

    return colors[brandName as keyof typeof colors] || colors.default
  }

  // Utilisez le nom formaté pour la sélection des couleurs
  const brandColors = getBrandColors(formattedBrandName)

  return {
    brandColors,
    brandName: brandInfo.brandName || "Votre Marque",
    companyName: brandInfo.companyName || "Votre Entreprise",
    industry: brandInfo.industry || "Votre Secteur",
  }
}