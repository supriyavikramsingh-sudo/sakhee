import { PromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'
import { llmClient } from '../llmClient.js'
import { Logger } from '../../utils/logger.js'

const logger = new Logger('MealPlanChain')

class MealPlanChain {
  async generateMealPlan(preferences) {
    try {
      logger.info('Generating meal plan', preferences)

      const prompt = PromptTemplate.fromTemplate(`
You are a nutritionist specializing in PCOS-friendly Indian meal planning.

Generate a detailed 7-day meal plan based on these preferences:
- Region: {region}
- Diet Type: {dietType}
- Budget per day: ₹{budget}
- Allergies/Restrictions: {restrictions}
- Preferred cuisines: {cuisines}
- Meals per day: {mealsPerDay}

REQUIREMENTS:
1. All meals should be PCOS-friendly (low GI, anti-inflammatory)
2. Use Indian ingredients and local measures (katori, tbsp, etc.)
3. Include macro breakdown (Protein, Carbs, Fats)
4. Provide cooking tips for each meal
5. Suggest budget-friendly substitutions
6. Ensure no meals exceed the daily budget
7. Provide grocery list with approximate costs

FORMAT: JSON with the following structure:
{{
  "dayNumber": 1,
  "meals": [
    {{
      "mealType": "Breakfast",
      "name": "Dish name",
      "ingredients": ["..."],
      "macros": {{"protein": 20, "carbs": 30, "fats": 10}},
      "glycemicIndex": "Low",
      "cookingTime": "15 mins",
      "tip": "..."
    }}
  ],
  "dailyBudget": "₹XX",
  "groceryList": ["..."]
}}

Generate the complete 7-day plan now.
`)

      const chain = new LLMChain({
        llm: llmClient.getModel(),
        prompt
      })

      const result = await chain.call({
        region: preferences.region,
        dietType: preferences.dietType,
        budget: preferences.budget,
        restrictions: preferences.restrictions?.join(', ') || 'None',
        cuisines: preferences.cuisines?.join(', ') || 'Indian',
        mealsPerDay: preferences.mealsPerDay || 3
      })

      logger.info('Meal plan generated successfully')

      // Parse JSON response
      try {
        return JSON.parse(result.text)
      } catch (e) {
        logger.warn('Could not parse JSON response, returning raw text')
        return { rawPlan: result.text }
      }
    } catch (error) {
      logger.error('Meal plan generation failed', { error: error.message })
      throw error
    }
  }
}

export const mealPlanChain = new MealPlanChain()
export default mealPlanChain