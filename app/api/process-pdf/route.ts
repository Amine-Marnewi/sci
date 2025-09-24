import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("pdf") as File

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded" }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads")
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Save the uploaded file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = path.join(uploadsDir, `${Date.now()}-${file.name}`)
    fs.writeFileSync(filePath, buffer)

    // Execute the Python script with streaming logs
    const pythonScriptPath = path.join(process.cwd(), "scripts", "ocr.py")
    const pythonPath = "C:\\Users\\VM764NY\\Downloads\\saida_proj\\saida\\Scripts\\python.exe"
    
    // const pythonScriptPath = path.join(process.cwd(), "scripts", "ocr.py")
    // const venvPath = "C:\\Users\\VM764NY\\Downloads\\saida_proj\\saida"
    // const pythonPath = path.join(venvPath, "Scripts", "python.exe")
    // const command = `"${pythonPath}" "${pythonScriptPath}" "${filePath}"`



    console.log("Executing Python script:", pythonPath, pythonScriptPath, filePath)

    const pythonProcess = spawn(pythonPath, [pythonScriptPath, filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'
      }
    })

    let stdout = ""
    let stderr = ""

    // Stream stdout with UTF-8 encoding
    pythonProcess.stdout.setEncoding('utf8')
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log("Python Output:", output.trim())
      stdout += output
    })

    // Stream stderr with UTF-8 encoding
    pythonProcess.stderr.setEncoding('utf8')
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.error("Python Error:", output.trim())
      stderr += output
    })

    // Wait for the Python process to complete
    const pythonResult = await new Promise<string>((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code: ${code}`)
        
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}. Error: ${stderr}`))
        } else {
          resolve(stdout)
        }
      })

      pythonProcess.on('error', (error) => {
        console.error("Failed to start Python process:", error)
        reject(error)
      })

      // Set timeout
      setTimeout(() => {
        pythonProcess.kill()
        reject(new Error("Python script timeout after 5 minutes"))
      }, 300000) // 5 minutes
    })

    // Parse the JSON output from the Python script
    let result
    try {
      const output = JSON.parse(pythonResult.trim())

      if (output.ok && output.products) {
        result = output.products
      } else {
        throw new Error(output.error || "Unknown error from Python script")
      }
    } catch (parseError) {
      console.error("Failed to parse Python output:", parseError)
      console.error("Raw output:", pythonResult)
      return NextResponse.json({ error: "Failed to parse Python script output" }, { status: 500 })
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error processing PDF:", error)
    return NextResponse.json(
      {
        error: "Failed to process PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}