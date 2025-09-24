"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, FileText, Loader2 } from "lucide-react"

interface PDFUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: any[]) => void
}

export function PDFUploadModal({ isOpen, onClose, onSuccess }: PDFUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes("pdf")) {
      alert("Veuillez sélectionner un fichier PDF")
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("pdf", file)

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        onSuccess(result.data)
        onClose()
      } else {
        alert(`Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Erreur lors du traitement du PDF")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Télécharger un Catalogue PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-600" />
                <p className="text-sm text-gray-600">Traitement du PDF en cours...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileText className="w-8 h-8 mx-auto text-gray-400" />
                <p className="text-sm text-gray-600">
                  Glissez-déposez votre fichier PDF ici ou cliquez pour sélectionner
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <label htmlFor="pdf-upload">
              <Button variant="outline" disabled={isUploading} className="cursor-pointer bg-transparent" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner un PDF
                </span>
              </Button>
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
