import { PromptTemplate } from '@langchain/core/prompts'
import { llmClient } from '../llmClient.js'
import { Logger } from '../../utils/logger.js'

const logger = new Logger('ReportChain')

class ReportChain {
  async analyzeReport(reportData) {
    try {
      logger.info('Analyzing medical report')

      const prompt = PromptTemplate.fromTemplate(`
You are a medical assistant analyzing PCOS lab reports.

Extracted Lab Values:
{labValues}

Patient Profile:
Age: {age}
Gender: Female
Diagnosed PCOS: {diagnosedPCOS}

TASK:
Provide a clear, structured analysis in plain text format.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

## Lab Analysis

[For each lab value, write one line with the format:]
- [Value Name]: [Value] [Unit] [Status: Normal/Elevated/Low] - [Brief explanation]

## Key Findings

- [Finding 1]
- [Finding 2]
- [Finding 3]

## Recommended Actions

- [Actionable recommendation 1]
- [Actionable recommendation 2]
- [Actionable recommendation 3]

## When to Consult Doctor

- [Red flag 1 if any]
- [Red flag 2 if any]

IMPORTANT:
- Use simple language
- Be encouraging and supportive
- Highlight what's normal too
- Mark abnormal values with ⚠️
- This is EDUCATIONAL only, not medical diagnosis
`)

      // LLMChain is deprecated — format the prompt and call the LLM client directly.
      const formattedPrompt = await prompt.format({
        labValues: this.formatLabValues(reportData.labValues),
        age: reportData.age,
        diagnosedPCOS: reportData.diagnosedPCOS ? 'Yes' : 'No'
      })

      const raw = await llmClient.invoke(formattedPrompt)
      const analysisText = typeof raw === 'string' ? raw : raw?.text ?? raw?.output_text ?? JSON.stringify(raw)

      logger.info('Report analysis completed')

      return {
        analysis: analysisText,
        timestamp: new Date().toISOString(),
        reportDate: reportData.reportDate
      }
    } catch (error) {
      logger.error('Report analysis failed', { error: error.message })
      throw error
    }
  }

  formatLabValues(labValues) {
    if (!labValues || Object.keys(labValues).length === 0) {
      return 'No lab values detected in report'
    }

    return Object.entries(labValues)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}: ${value.value} ${value.unit || ''}`
        }
        return `${key}: ${value}`
      })
      .join('\n')
  }
}

export const reportChain = new ReportChain()
export default reportChain