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

    // Execute the Python OCR script
    const pythonScriptPath = path.join(process.cwd(), "scripts", "ocr.py")
    const pythonPath = "C:\\Users\\VM764NY\\Downloads\\saida_proj\\saida\\Scripts\\python.exe"

    console.log("Executing Python OCR script:", pythonPath, pythonScriptPath, filePath)

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

    pythonProcess.stdout.setEncoding('utf8')
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log("Python Output:", output.trim())
      stdout += output
    })

    pythonProcess.stderr.setEncoding('utf8')
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.error("Python Error:", output.trim())
      stderr += output
    })

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

      setTimeout(() => {
        pythonProcess.kill()
        reject(new Error("Python script timeout after 5 minutes"))
      }, 300000)
    })

    // Parse the JSON output from the OCR script
    let ocrOutput
    try {
      const output = JSON.parse(pythonResult.trim())

      if (!output.ok || !output.products) {
        throw new Error(output.error || "Unknown error from Python script")
      }
      
      ocrOutput = output.products
      console.log(`✅ OCR extracted ${ocrOutput.length} products`)
      
    } catch (parseError) {
      console.error("Failed to parse Python output:", parseError)
      console.error("Raw output:", pythonResult)
      return NextResponse.json({ error: "Failed to parse Python script output" }, { status: 500 })
    }

    // Insert into database
    const dbScriptPath = path.join(process.cwd(), "scripts", "create_table_catalog.py")
    
    console.log("Inserting into database...")
    
    const dbProcess = spawn(pythonPath, [
      dbScriptPath,
      JSON.stringify(ocrOutput),
      file.name
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'
      }
    })

    let dbStdout = ""
    let dbStderr = ""

    dbProcess.stdout.setEncoding('utf8')
    dbProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log("DB Script Output:", output.trim())
      dbStdout += output
    })

    dbProcess.stderr.setEncoding('utf8')
    dbProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.error("DB Script Error:", output.trim())
      dbStderr += output
    })

    const dbResult = await new Promise<string>((resolve, reject) => {
      dbProcess.on('close', (code) => {
        console.log(`DB process exited with code: ${code}`)
        
        if (code !== 0) {
          reject(new Error(`Database insertion failed: ${dbStderr}`))
        } else {
          resolve(dbStdout)
        }
      })

      dbProcess.on('error', (error) => {
        console.error("Failed to start DB process:", error)
        reject(error)
      })

      setTimeout(() => {
        dbProcess.kill()
        reject(new Error("Database insertion timeout after 30 seconds"))
      }, 30000)
    })

    // Parse database result
    let dbInfo
    try {
      dbInfo = JSON.parse(dbResult.trim())
      
      if (!dbInfo.success) {
        throw new Error(dbInfo.error || "Database insertion failed")
      }
      
      console.log(`✅ Database insertion successful: ${dbInfo.products_inserted} products inserted into table '${dbInfo.table_name}'`)
      
    } catch (parseError) {
      console.error("Failed to parse DB script output:", parseError)
      console.error("Raw DB output:", dbResult)
      return NextResponse.json({ 
        error: "Database insertion failed", 
        details: "Could not parse database response" 
      }, { status: 500 })
    }

    // Now fetch the data from database to return to frontend
    const fetchScriptPath = path.join(process.cwd(), "scripts", "fetch_catalog_data.py")
    
    console.log("Fetching data from database...")
    
    const fetchProcess = spawn(pythonPath, [
      fetchScriptPath,
      dbInfo.table_name
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'
      }
    })

    let fetchStdout = ""
    let fetchStderr = ""

    fetchProcess.stdout.setEncoding('utf8')
    fetchProcess.stdout.on('data', (data) => {
      fetchStdout += data.toString()
    })

    fetchProcess.stderr.setEncoding('utf8')
    fetchProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.error("Fetch Script Error:", output.trim())
      fetchStderr += output
    })

    const fetchResult = await new Promise<string>((resolve, reject) => {
      fetchProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to fetch data: ${fetchStderr}`))
        } else {
          resolve(fetchStdout)
        }
      })

      fetchProcess.on('error', (error) => {
        reject(error)
      })

      setTimeout(() => {
        fetchProcess.kill()
        reject(new Error("Fetch timeout"))
      }, 30000)
    })

    // Parse fetched data
    let fetchedData
    try {
      const output = JSON.parse(fetchResult.trim())
      
      if (!output.success) {
        throw new Error(output.error || "Failed to fetch data")
      }
      
      fetchedData = output.data
      console.log(`✅ Fetched ${fetchedData.length} products from database`)
      
    } catch (parseError) {
      console.error("Failed to parse fetched data:", parseError)
      // Fallback to OCR data if fetch fails
      console.log("⚠️ Falling back to OCR data")
      fetchedData = ocrOutput
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath)

    return NextResponse.json({
      success: true,
      data: fetchedData,
      metadata: {
        table_name: dbInfo.table_name,
        products_count: fetchedData.length,
        source_file: file.name
      }
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