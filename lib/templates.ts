export interface CodeTemplate {
  value: string
  label: string
  judge0Id: number
  description: string
  defaultCode: string
  exampleInput: string
  exampleOutput: string
}

export async function loadTemplate(language: string): Promise<CodeTemplate | null> {
  try {
    const response = await fetch(`/templates/${language}.json`)
    if (!response.ok) {
      console.error(`Failed to fetch template: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to load template for ${language}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error loading template for ${language}:`, error)
    return null
  }
}

export async function loadAllTemplates(): Promise<CodeTemplate[]> {
  const languages = ["javascript", "python", "java", "cpp", "csharp", "go"]
  const templates: CodeTemplate[] = []

  for (const lang of languages) {
    const template = await loadTemplate(lang)
    if (template) {
      templates.push(template)
    }
  }

  return templates
}
