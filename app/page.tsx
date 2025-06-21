"use client"

import { useState, useRef, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Play, Code, Terminal, FileInput, Loader2, Info } from "lucide-react"
import { type CodeTemplate, loadAllTemplates } from "@/lib/templates"
import { Judge0Service } from "@/lib/judge0"

export default function CodeEditor() {
  const [templates, setTemplates] = useState<CodeTemplate[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")
  const [currentTemplate, setCurrentTemplate] = useState<CodeTemplate | null>(null)
  const [code, setCode] = useState("")
  const [output, setOutput] = useState("Click 'Run Code' to see the output here...")
  const [input, setInput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const editorRef = useRef(null)
  const judge0Service = new Judge0Service()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await loadAllTemplates()
      setTemplates(loadedTemplates)

      if (loadedTemplates.length > 0) {
        const defaultTemplate = loadedTemplates[0]
        setCurrentTemplate(defaultTemplate)
        setCode(defaultTemplate.defaultCode)
        setInput(defaultTemplate.exampleInput)
      }
    } catch (error) {
      console.error("Error loading templates:", error)
      setOutput("Error: Failed to load code templates")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language)
    const template = templates.find((t) => t.value === language)
    if (template) {
      setCurrentTemplate(template)
      setCode(template.defaultCode)
      setInput(template.exampleInput)
      setOutput("Click 'Run Code' to see the output here...")
    }
  }

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
  }

  const runCode = async () => {
    if (!currentTemplate) {
      setOutput("Error: No template selected")
      return
    }

    setIsRunning(true)
    setOutput("Compiling and running code...")

    try {
      const result = await judge0Service.executeCode(currentTemplate.judge0Id, code, input)
      setOutput(result)
    } catch (error: any) {
      console.error("Error running code:", error)
      let errorMessage = `Error: ${error.message}`

      if (error.message.includes("API key not configured")) {
        errorMessage +=
          "\n\nSetup Instructions:\n1. Go to https://rapidapi.com/judge0-official/api/judge0-ce\n2. Subscribe to the free plan\n3. Get your API key\n4. Add NEXT_PUBLIC_JUDGE0_API_KEY=your_key_here to .env.local"
      }

      setOutput(errorMessage)
    } finally {
      setIsRunning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading code editor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-blue-400" />
              <h1 className="text-xl font-bold">AlgoPulse</h1>
              <Badge variant="secondary" className="bg-green-600 text-white">
                Free & Open
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {templates.map((template) => (
                    <SelectItem key={template.value} value={template.value} className="text-white hover:bg-gray-700">
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={runCode} disabled={isRunning} className="bg-green-600 hover:bg-green-700 text-white">
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Code
                  </>
                )}
              </Button>
            </div>
          </div>
          {currentTemplate && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-gray-400">
              <Info className="h-4 w-4" />
              <span>{currentTemplate.description}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-160px)]">
          {/* Code Editor */}
          <Card className="bg-gray-800 border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium">Editor</span>
                {currentTemplate && (
                  <Badge variant="outline" className="text-xs">
                    {currentTemplate.label}
                  </Badge>
                )}
              </div>
              <div className="flex space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            <div className="h-full">
              <Editor
                height="100%"
                language={selectedLanguage === "csharp" ? "csharp" : selectedLanguage}
                value={code}
                onChange={(value) => setCode(value || "")}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: "on",
                  lineNumbers: "on",
                  renderWhitespace: "selection",
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                  contextmenu: true,
                  mouseWheelZoom: true,
                }}
              />
            </div>
          </Card>

          {/* Output and Input */}
          <div className="flex flex-col gap-4">
            {/* Output */}
            <Card className="bg-gray-800 border-gray-700 overflow-hidden flex-1">
              <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium">Output</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOutput("")}
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  Clear
                </Button>
              </div>
              <div className="h-full p-4 overflow-auto">
                <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">{output}</pre>
              </div>
            </Card>

            {/* Input */}
            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
              <div className="flex items-center space-x-2 p-3 border-b border-gray-700 bg-gray-800/50">
                <FileInput className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium">Program Input</span>
                {currentTemplate && currentTemplate.exampleInput && (
                  <Badge variant="outline" className="text-xs">
                    Example: {currentTemplate.exampleInput}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter input for your program here..."
                  className="min-h-[100px] bg-gray-900 border-gray-600 text-white font-mono text-sm resize-none"
                />
                <p className="text-xs text-gray-400 mt-2">This input will be passed to your program via stdin</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
