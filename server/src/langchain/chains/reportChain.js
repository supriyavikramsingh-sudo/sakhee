import { PromptTemplate } from '@langchain/core/prompts';
import { llmClient } from '../llmClient.js';
import { Logger } from '../../utils/logger.js';
import pcosLabRanges from '../../utils/labRanges.js';

const logger = new Logger('ReportChain');

class ReportChain {
  async analyzeReport(reportData) {
    try {
      logger.info('Analyzing medical report');

      const prompt = PromptTemplate.fromTemplate(`
You are a compassionate PCOS healthcare assistant analyzing lab reports for women with PCOS.

PATIENT PROFILE:
- Age: {age}
- Gender: Female
- Diagnosed PCOS: {diagnosedPCOS}

LAB VALUES DETECTED:
{labValues}

REFERENCE RANGES FOR INTERPRETATION:
{referenceRanges}

YOUR TASK:
Provide a warm, clear, structured analysis that helps the patient understand their results without causing panic.

ANALYSIS STRUCTURE:

**Summary**
Write 2-3 sentences giving an overall picture. Start with something positive if possible. Be honest but hopeful.

**Key Observations**
Group related findings together:
- Blood Sugar & Insulin: [If relevant, discuss glucose, insulin, HOMA-IR together]
- Hormones: [Discuss LH, FSH, testosterone, DHEAS together]
- Thyroid: [If relevant]
- Vitamins & Minerals: [If relevant]
- Lipids: [If relevant]

For each group, write 2-4 clear sentences explaining what the values mean and why they matter for PCOS.

**What This Means for You**
3-5 actionable, encouraging insights about how these results connect to PCOS management.

**Next Steps**
2-3 specific, achievable recommendations. Be practical and supportive.

**When to Reach Out to Your Doctor**
List any red flags that warrant medical attention (if any).

CRITICAL RULES:
1. **Be Accurate**: Use the reference ranges provided. Don't guess or hallucinate values.
2. **Be Kind**: Use phrases like "slightly elevated" instead of "abnormal", "working on" instead of "struggling with"
3. **Avoid Panic**: Never use alarming language. Frame elevated values as "something we can work on" not "dangerous"
4. **Be Specific**: Don't just say "abnormal" - explain what the value means practically
5. **Context Matters**: 
   - Estradiol and Progesterone VARY BY CYCLE PHASE - never call them abnormal, just note the value
   - PCOS ranges differ from general population - use PCOS-specific context
6. **No Medical Diagnosis**: Always remind this is educational, not a diagnosis
7. **Empowering Tone**: Use "you can", "your body", "we can work on" - make the patient feel in control

EXAMPLE GOOD PHRASES:
✅ "Your insulin levels are a bit higher than optimal, which is common with PCOS"
✅ "The good news is your thyroid function looks great"
✅ "Your testosterone is mildly elevated, which we can address through lifestyle changes"
✅ "These values give us helpful information about where to focus"

EXAMPLE BAD PHRASES:
❌ "Your results are abnormal"
❌ "This is critical/dangerous"
❌ "You need to fix this immediately"
❌ "Your levels are terrible"

Remember: You're talking to a real person who may feel anxious. Be the supportive, knowledgeable friend they need.
`);

      // Format the prompt with enhanced lab value formatting
      const formattedPrompt = await prompt.format({
        labValues: this.formatLabValuesWithSeverity(reportData.labValues),
        referenceRanges: this.formatReferenceRanges(reportData.labValues),
        age: reportData.age || 'Not provided',
        diagnosedPCOS: reportData.diagnosedPCOS ? 'Yes' : 'Not yet diagnosed',
      });

      const raw = await llmClient.invoke(formattedPrompt);
      const analysisText =
        typeof raw === 'string' ? raw : raw?.text ?? raw?.output_text ?? JSON.stringify(raw);

      logger.info('Report analysis completed');

      return {
        analysis: analysisText,
        timestamp: new Date().toISOString(),
        reportDate: reportData.reportDate,
      };
    } catch (error) {
      logger.error('Report analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Format lab values with severity and clinical context
   */
  formatLabValuesWithSeverity(labValues) {
    if (!labValues || Object.keys(labValues).length === 0) {
      return 'No lab values detected in report';
    }

    return Object.entries(labValues)
      .map(([key, data]) => {
        const value = typeof data === 'object' ? data.value : data;
        const unit = typeof data === 'object' ? data.unit : '';
        const severity = typeof data === 'object' ? data.severity : 'unknown';

        // Get the lab range info
        const ranges = pcosLabRanges[key];
        const description = ranges?.description || key;

        return `- ${description}: ${value} ${unit} [Status: ${severity}]`;
      })
      .join('\n');
  }

  /**
   * Format reference ranges for AI to understand normal/abnormal
   */
  formatReferenceRanges(labValues) {
    if (!labValues || Object.keys(labValues).length === 0) {
      return 'No reference ranges available';
    }

    const rangeDescriptions = [];

    Object.keys(labValues).forEach((key) => {
      const ranges = pcosLabRanges[key];
      if (!ranges) return;

      let rangeText = `${ranges.description || key} (${ranges.unit}):\n`;

      // Handle cycle-dependent hormones specially
      if (ranges.skipSeverity && ranges.cycleDependentNote) {
        rangeText += `  NOTE: This hormone varies by menstrual cycle phase. Do not label as abnormal.\n`;
        rangeText += `  ${ranges.cycleDependentNote}\n`;
      } else {
        // Normal range
        if (ranges.normal) {
          rangeText += `  Normal: ${ranges.normal.min}-${ranges.normal.max}\n`;
        }

        // Optimal range (if different)
        if (
          ranges.optimal &&
          (ranges.optimal.min !== ranges.normal?.min || ranges.optimal.max !== ranges.normal?.max)
        ) {
          rangeText += `  Optimal: ${ranges.optimal.min}-${ranges.optimal.max}\n`;
        }

        // PCOS-specific thresholds
        if (ranges.elevated) {
          rangeText += `  Elevated if >${ranges.elevated}\n`;
        }
        if (ranges.pcosHigh) {
          rangeText += `  PCOS-concerning: ${ranges.pcosHigh.min}-${ranges.pcosHigh.max}\n`;
        }
        if (ranges.high) {
          rangeText += `  High: >${ranges.high}\n`;
        }
        if (ranges.critical) {
          rangeText += `  Critical if >${ranges.critical}\n`;
        }

        // Low thresholds
        if (ranges.low) {
          rangeText += `  Low if <${
            typeof ranges.low === 'number' ? ranges.low : ranges.low.max
          }\n`;
        }
        if (ranges.deficient) {
          rangeText += `  Deficient if <${
            typeof ranges.deficient === 'number' ? ranges.deficient : ranges.deficient.max
          }\n`;
        }
      }

      rangeDescriptions.push(rangeText);
    });

    return rangeDescriptions.join('\n');
  }

  /**
   * Legacy method for simple formatting (kept for compatibility)
   */
  formatLabValues(labValues) {
    if (!labValues || Object.keys(labValues).length === 0) {
      return 'No lab values detected in report';
    }

    return Object.entries(labValues)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}: ${value.value} ${value.unit || ''}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
  }
}

export const reportChain = new ReportChain();
export default reportChain;
