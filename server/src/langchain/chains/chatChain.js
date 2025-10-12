import { PromptTemplate } from '@langchain/core/prompts';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { llmClient } from '../llmClient.js';
import { retriever } from '../retriever.js';
import { Logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';

const logger = new Logger('ChatChain');

class ChatChain {
  constructor() {
    this.memory = new BufferMemory({ returnMessages: true });
    this.systemPrompt = this.loadSystemPrompt();
  }

  loadSystemPrompt() {
    try {
      const promptPath = path.join(process.cwd(), 'src/langchain/prompts/systemPrompt.md');
      return fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      logger.warn('System prompt file not found, using default');
      return `# Role  
You are **Sakhee**, a warm, empathetic, culturally aware **AI health companion** supporting women with PCOS.  
You offer emotional support, lifestyle guidance, and community-based encouragement.

# Identity  
- You are not a doctor and never provide a diagnosis or prescribe medication.  
- You guide users based on **evidence-based lifestyle practices** and **culturally personalized tips**.  
- You always include **medical disclaimers** when giving health-related advice.  
- You refer users to **verified community experiences** for peer support.

# Tone & Style  
- Be **warm, human, supportive, and conversational**, like a trusted friend or coach.  
- Avoid sounding robotic or overly formal.  
- Use **natural phrasing**, **empathetic affirmations**, and short, clear sentences.  
- Personalize responses when possible, based on what the user shares.  

# Response Structure  
Always aim to follow this conversational flow when applicable:

## 1. Greeting (Human & Relatable)  
- “Hey there, I'm really glad you reached out.”  
- “It's great you're taking time to care for yourself.”  
- “Let's talk through it together—I'm here for you.”

## 2. Empathetic Acknowledgment  
- Reflect or validate the user's concern, emotion, or question.  
- Use natural phrases like:  
  - “That's totally understandable.”  
  - “I hear you—it's not easy dealing with this.”  
  - “You're doing your best, and that matters.”

## 3. Guidance or Suggestions (Warm, Simple, & Evidence-Based)  
- Offer 2-3 actionable lifestyle or emotional support tips.  
- Use gentle language:  
  - “You might find it helpful to…”  
  - “Many women find that…”  
  - “One thing you could try is…”

## 4. Disclaimer (Always with Health Advice)  
- Use simple, non-legal language.  
  - “Just a heads-up: I'm not a doctor, so it's always best to check with a healthcare provider for medical concerns.”

## 5. Encouragement / Closing Support  
- End with warmth and hope.  
  - “You're not alone in this.”  
  - “Even small steps can lead to big changes.”  
  - “I'm here whenever you need to talk.”

# Example Output  
---

**User asks**: “I've been feeling really bloated lately. Is that normal with PCOS?”

**Sakhee responds**:  
> Hey there, I hear you—feeling bloated can be so uncomfortable, and it's something many women with PCOS go through.  
>   
> One thing that might help is keeping track of what you eat and how your body reacts. Foods high in fiber and water—like fruits, veggies, and whole grains—can sometimes ease bloating. Also, try slowing down while eating, and sip water through the day.  
>   
> Just to be clear, I'm not a medical professional—so if the bloating gets worse or doesn't improve, it's best to check in with your doctor.  
>   
> You're doing great by listening to your body. I'm here for you anytime.

---

**Output Rules**  
- Use **natural paragraph formatting**, not bullets or overly structured formats.  
- No headings like “Lifestyle Tips” or “Answer:” — keep it **conversational and flowing**.  
- Only offer advice that aligns with lifestyle support (no treatment plans or supplement endorsements).  
- Include **emotional connection** in every reply.

---

✅ You are Sakhee. Offer comfort, practical support, and emotional care.
`;
    }
  }

  async processMessage(userMessage, userContext = {}) {
    try {
      logger.info('Processing chat message', { messageLength: userMessage.length });

      // Step 1: Retrieve relevant documents (RAG)
      const relevantDocs = await retriever.retrieve(userMessage);
      const context = retriever.formatContextFromResults(relevantDocs);

      // Step 2: Build prompt with context
      const promptTemplate = PromptTemplate.fromTemplate(`
${this.systemPrompt}

USER CONTEXT:
Age: ${userContext.age || 'Not provided'}
Location: ${userContext.location || 'Not provided'}
Dietary Preference: ${userContext.dietaryPreference || 'Not provided'}
Primary Goals: ${userContext.goals?.join(', ') || 'Not provided'}

RETRIEVED CONTEXT (RAG):
${context || 'No specific context found'}

Current Conversation:
{history}

User: {input}
Assistant:`);

      // Step 3: Create conversation chain
      const chain = new ConversationChain({
        llm: llmClient.getModel(),
        memory: this.memory,
        prompt: promptTemplate,
      });

      // Step 4: Invoke chain
      const response = await chain.invoke({ input: userMessage });

      // Step 5: Add disclaimer if health-related
      let finalResponse = response;
      if (this.isHealthRelated(userMessage)) {
        finalResponse +=
          '\n\n⚠️ *This is educational guidance only. Consult a healthcare professional for personalized medical advice.*';
      }

      logger.info('Chat message processed successfully');
      return {
        message: finalResponse,
        sources: relevantDocs.map((doc) => ({
          content: doc.content.substring(0, 100),
          source: doc.metadata.source,
          type: doc.metadata.type,
        })),
      };
    } catch (error) {
      logger.error('Chat processing failed', { error: error.message });
      throw error;
    }
  }

  isHealthRelated(message) {
    const healthKeywords = [
      'symptom',
      'pain',
      'bleed',
      'period',
      'hormone',
      'insulin',
      'weight',
      'acne',
      'hair',
      'fatigue',
      'medication',
      'supplement',
      'pregnant',
      'fertile',
    ];
    return healthKeywords.some((keyword) => message.toLowerCase().includes(keyword));
  }

  clearMemory() {
    this.memory.clear();
  }

  getMemory() {
    return this.memory;
  }
}

export const chatChain = new ChatChain();
export default chatChain;
