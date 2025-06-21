export interface ExecutionResult {
  stdout?: string
  stderr?: string
  compile_output?: string
  status: {
    id: number
    description: string
  }
  time?: string
  memory?: number
}

export class Judge0Service {
  private apiKey: string
  private apiHost: string
  private apiUrl: string

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_JUDGE0_API_KEY || ""
    this.apiHost = process.env.NEXT_PUBLIC_JUDGE0_API_HOST || ""
    this.apiUrl = process.env.NEXT_PUBLIC_JUDGE0_API_URL || ""

    if (!this.apiKey) {
      console.warn("Judge0 API key not found. Please set NEXT_PUBLIC_JUDGE0_API_KEY in your .env.local file")
    }
  }

  // Helper function to properly encode to base64
  private encodeBase64(str: string): string {
    try {
      // Handle UTF-8 characters properly
      return btoa(unescape(encodeURIComponent(str)))
    } catch (error) {
      console.error("Error encoding to base64:", error)
      // Fallback to simple btoa
      return btoa(str)
    }
  }

  // Helper function to properly decode from base64
  private decodeBase64(str: string): string {
    try {
      // Handle UTF-8 characters properly
      return decodeURIComponent(escape(atob(str)))
    } catch (error) {
      console.error("Error decoding from base64:", error)
      // Fallback to simple atob
      return atob(str)
    }
  }

  async submitCode(languageId: number, sourceCode: string, stdin = ""): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Judge0 API key not configured. Please check your .env.local file.")
    }

    try {
      const requestBody = {
        language_id: languageId,
        source_code: this.encodeBase64(sourceCode),
        stdin: stdin ? this.encodeBase64(stdin) : "",
      }

      console.log("Submitting code with:", {
        languageId,
        sourceCodeLength: sourceCode.length,
        hasStdin: !!stdin,
        sourceCodePreview: sourceCode.substring(0, 100) + (sourceCode.length > 100 ? "..." : ""),
      })

      const response = await fetch(`${this.apiUrl}/submissions?base64_encoded=true&wait=false`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": this.apiHost,
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      console.log("Submit response status:", response.status)

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.error) {
            errorMessage += ` - ${errorData.error}`
          }
          if (errorData.message) {
            errorMessage += ` - ${errorData.message}`
          }
        } catch (e) {
          errorMessage += ` - ${responseText}`
        }
        throw new Error(errorMessage)
      }

      const result = JSON.parse(responseText)
      if (!result.token) {
        throw new Error("No token received from Judge0 API")
      }

      console.log("Received token:", result.token)
      return result.token
    } catch (error) {
      console.error("Error in submitCode:", error)
      throw error
    }
  }

  async getResult(token: string): Promise<ExecutionResult> {
    if (!this.apiKey) {
      throw new Error("Judge0 API key not configured. Please check your .env.local file.")
    }

    try {
      const response = await fetch(`${this.apiUrl}/submissions/${token}?base64_encoded=true&fields=*`, {
        headers: {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": this.apiHost,
        },
      })

      const responseText = await response.text()

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${responseText}`)
      }

      return JSON.parse(responseText)
    } catch (error) {
      console.error("Error in getResult:", error)
      throw error
    }
  }

  async executeCode(languageId: number, sourceCode: string, stdin = ""): Promise<string> {
    try {
      // Submit code
      const token = await this.submitCode(languageId, sourceCode, stdin)

      // Poll for result
      let attempts = 0
      const maxAttempts = 30

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const result = await this.getResult(token)
        console.log("Poll attempt", attempts + 1, "Status:", result.status.description)

        if (result.status.id <= 2) {
          // Still processing (In Queue = 1, Processing = 2)
          attempts++
          continue
        }

        // Execution completed
        return this.formatOutput(result)
      }

      return "Error: Code execution timed out after 30 seconds"
    } catch (error) {
      console.error("Error executing code:", error)

      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          return "Error: Invalid API key. Please check your Judge0 API configuration."
        } else if (error.message.includes("403")) {
          return "Error: API access forbidden. Please check your Judge0 subscription."
        } else if (error.message.includes("429")) {
          return "Error: Rate limit exceeded. Please try again later."
        } else if (error.message.includes("API key not configured")) {
          return "Error: Judge0 API key not configured. Please add NEXT_PUBLIC_JUDGE0_API_KEY to your .env.local file."
        }
      }

      throw error
    }
  }

  private formatOutput(result: ExecutionResult): string {
    let output = ""

    // Handle different status codes
    if (result.status.id === 3) {
      // Accepted
      if (result.stdout) {
        output += "Output:\n" + this.decodeBase64(result.stdout)
      } else {
        output = "Code executed successfully (no output)"
      }
    } else if (result.status.id === 4) {
      // Wrong Answer
      output += "Wrong Answer\n"
      if (result.stdout) {
        output += "Output:\n" + this.decodeBase64(result.stdout)
      }
    } else if (result.status.id === 5) {
      // Time Limit Exceeded
      output += "Time Limit Exceeded\n"
    } else if (result.status.id === 6) {
      // Compilation Error
      output += "Compilation Error:\n"
      if (result.compile_output) {
        output += this.decodeBase64(result.compile_output)
      }
    } else if (result.status.id === 7) {
      // Runtime Error (SIGSEGV)
      output += "Runtime Error (Segmentation Fault)\n"
      if (result.stderr) {
        output += "Error Details:\n" + this.decodeBase64(result.stderr)
      }
    } else if (result.status.id === 8) {
      // Runtime Error (SIGXFSZ)
      output += "Runtime Error (File Size Limit Exceeded)\n"
    } else if (result.status.id === 9) {
      // Runtime Error (SIGFPE)
      output += "Runtime Error (Floating Point Exception)\n"
    } else if (result.status.id === 10) {
      // Runtime Error (SIGABRT)
      output += "Runtime Error (Aborted)\n"
    } else if (result.status.id === 11) {
      // Runtime Error (NZEC)
      output += "Runtime Error (Non-zero Exit Code)\n"
      if (result.stderr) {
        output += "Error Details:\n" + this.decodeBase64(result.stderr)
      }
    } else if (result.status.id === 12) {
      // Runtime Error (Other)
      output += "Runtime Error\n"
      if (result.stderr) {
        output += "Error Details:\n" + this.decodeBase64(result.stderr)
      }
    } else if (result.status.id === 13) {
      // Internal Error
      output += "Internal Error: Please try again later\n"
    } else if (result.status.id === 14) {
      // Exec Format Error
      output += "Execution Format Error\n"
    } else {
      // Unknown status
      output += `Unknown Status (${result.status.id}): ${result.status.description}\n`

      if (result.stdout) {
        output += "\nOutput:\n" + this.decodeBase64(result.stdout)
      }

      if (result.stderr) {
        output += "\nErrors:\n" + this.decodeBase64(result.stderr)
      }

      if (result.compile_output) {
        output += "\nCompilation:\n" + this.decodeBase64(result.compile_output)
      }
    }

    // Add execution info
    output += "\n\n--- Execution Info ---"
    output += `\nStatus: ${result.status.description} (${result.status.id})`
    output += `\nTime: ${result.time || "N/A"}s`
    output += `\nMemory: ${result.memory || "N/A"} KB`

    return output
  }
}
