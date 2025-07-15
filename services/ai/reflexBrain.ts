// Reflex Brain - Fast decision filter using Groq
import { Groq } from 'groq-sdk';

export class ReflexBrain {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || ''
    });
  }

  async analyze(quantResult: any, analystResult: any, indicators: any) {
    try {
      // Quick confluence check
      if (quantResult.direction !== analystResult.direction) {
        console.log('⚡ Reflex Brain: REJECTED - Brains disagree on direction');
        return {
          approved: false,
          reason: 'Quant and Analyst brains disagree on direction',
          confidence: 0,
          final_decision: 'REJECT'
        };
      }

      // Build quick decision prompt
      const prompt = `
You are a rapid decision filter for trading signals. Two AI systems have analyzed the market:

QUANT BRAIN: ${quantResult.direction} (${Math.round(quantResult.confidence * 100)}%)
ANALYST BRAIN: ${analystResult.direction} (${Math.round(analystResult.confidence * 100)}%)

MARKET CONDITIONS:
- RSI: ${indicators.rsi.toFixed(1)}
- MACD: ${indicators.macd.macd > indicators.macd.signal ? 'Bullish' : 'Bearish'}
- Price vs EMA20: ${indicators.ema.ema20 ? 'Above' : 'Below'}
- Volatility: ${indicators.volatility.toFixed(1)}%

ANALYST REASONING: ${analystResult.explanation}

Your job: APPROVE or REJECT this signal based on:
1. Do both brains agree? (They do)
2. Is the confidence reasonable? (>70% combined)
3. Are market conditions favorable?
4. Any major red flags?

Respond with: APPROVE or REJECT
Reason: [brief explanation]
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a risk management filter. Be decisive and fast. Only approve high-conviction signals."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-70b-8192",
        temperature: 0.1,
        max_tokens: 100,
        top_p: 0.9
      });

      const response = completion.choices[0]?.message?.content || '';
      
      const approved = response.toUpperCase().includes('APPROVE');
      const reasonMatch = response.match(/Reason:\s*(.+)/i);
      const reason = reasonMatch ? reasonMatch[1].trim() : 'No specific reason provided';

      // Additional safety checks
      const avgConfidence = (quantResult.confidence + analystResult.confidence) / 2;
      const safetyApproved = approved && avgConfidence >= 0.70;

      console.log(`⚡ Reflex Brain: ${safetyApproved ? 'APPROVED' : 'REJECTED'} - ${reason}`);
      console.log(`🎯 Combined confidence: ${Math.round(avgConfidence * 100)}%`);

      return {
        approved: safetyApproved,
        reason,
        confidence: avgConfidence,
        final_decision: safetyApproved ? 'APPROVE' : 'REJECT',
        raw_response: response
      };

    } catch (error) {
      console.error('❌ Reflex Brain error:', error);
      
      // Fallback: only approve if both brains agree and confidence is high
      const avgConfidence = (quantResult.confidence + analystResult.confidence) / 2;
      const fallbackApproved = quantResult.direction === analystResult.direction && avgConfidence >= 0.75;
      
      return {
        approved: fallbackApproved,
        reason: 'Fallback decision due to AI service unavailability',
        confidence: avgConfidence,
        final_decision: fallbackApproved ? 'APPROVE' : 'REJECT',
        raw_response: 'AI service temporarily unavailable'
      };
    }
  }
}