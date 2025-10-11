import { PromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'
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
1. Identify abnormal values (mark with ⚠️)
2. Explain what each value means in the context of PCOS
3. Highlight correlations between values
4. Suggest lifestyle interventions
5. Identify if doctor consultation is needed (mark with 🚨)
6. Provide educational context without diagnosis

FORMAT YOUR RESPONSE AS:
## Lab Analysis
- [Value Name]: [Value] [Normal Range] - [Explanation]

## Key Findings
- Finding 1
- Finding 2

## Recommended Actions
- Action 1
- Action 2

## When to Consult Doctor
- [Red flags if any]

Remember: Provide EDUCATIONAL analysis only, not medical diagnosis.
`)

      const chain = new LLMChain({
        llm: llmClient.getModel(),
        prompt
      })

      const result = await chain.call({
        labValues: this.formatLabValues(reportData.labValues),
        age: reportData.age,
        diagnosedPCOS: reportData.diagnosedPCOS ? 'Yes' : 'No'
      })

      logger.info('Report analysis completed')

      return {
        analysis: result.text,
        timestamp: new Date().toISOString(),
        reportDate: reportData.reportDate
      }
    } catch (error) {
      logger.error('Report analysis failed', { error: error.message })
      throw error
    }
  }

  formatLabValues(labValues) {
    return Object.entries(labValues)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
  }
}

export const reportChain = new ReportChain()
export default reportChain