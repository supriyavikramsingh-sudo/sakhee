// Set minimal dummy env vars so module imports that check process.env won't crash during local debug
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'debug-openai-key';
process.env.SERP_API_KEY = process.env.SERP_API_KEY || 'debug-serp-key';
process.env.REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || 'debug-reddit-id';
process.env.REDDIT_CLIENT_SEC = process.env.REDDIT_CLIENT_SEC || 'debug-reddit-sec';
process.env.REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || 'debug-reddit-secret';

(async () => {
  try {
    const { default: chain } = await import('./server/src/langchain/chains/mealPlanChain.js');

    const examples = [
      // 1. Proper JSON
      '{"days":[{"dayNumber":1,"meals":[]}] }',

      // 2. Unquoted keys
      '{ days: [ { dayNumber: 1, meals: [] } ] }',

      // 3. Markdown fenced
      '```json\n{ "days": [ { "dayNumber":1, "meals": [] } ] }\n```',

      // 4. Top-level array
      '[ { days: [ { dayNumber:1, meals: [] } ] } ]',

      // 5. With comments
      '// header\n{ days: [ { dayNumber:1, meals: [] } ] }',

      // 6. Missing commas
      '{ days: [ { dayNumber:1 meals: [] } ] }',

      // 7. Multiple JSON blocks
      'Example:\n{ "meta": "info" }\n{ days: [ { dayNumber: 1, meals: [] } ] }\nEnd',
      // 8. Real failing LLM sample (contains smart quotes and fullwidth punctuation)
      '{\n  "days": [\n    {\n      "dayNumber": 1,\n      "meals": [\n        {\n          "mealType": "Breakfast",\n          "name": "Besan Chilla",\n          "ingredients": ["100g besan", "1 onion", "spices"],\n          "protein": 15,\n          "carbs": 20,\n          "fats": 5,\n          "gi": "Low",\n          "time": "15 mins",\n          "tip": "Add vegetables"\n        },\n        {\n          "mealType": "Lunch",\n          "name": "Quinoa Salad",\n          "ingredients": ["100g quinoa", "50g cucumber", "50g tomato", "lemon juice"],\n          "protein": 10,\n          "carbs": 30,\n          "fats": 5,\n          "gi": "Low",\n          "time": "20 mins",\n          "tip": "Use fresh herbs"\n        },\n        {\n          "mealType": "Dinner",\n          "name": “Moong Dal with Brown Rice”,\n          “ingredients”: [“100g moong dal”, “150g brown rice”, “spices”],\n          “protein”: 20,\n          “carbs”: 60,\n          “fats”: 2,\n          “gi”: “Medium”,\n           “time”: “30 mins”,\n           “tip”: “Soak dal overnight”\n        }\n      ]\n    },\n    {\n      “dayNumber”: 2,\n      “meals”: [\n        {\n           ”mealType”: ”Breakfast”,\n           ”name”: ”Oats Porridge”,\n           ”ingredients”: [“50g oats”,“200ml almond milk”,“fruits”],\n           ”protein”: 8,\n           ”carbs”: 30,\n           ”fats”: 4,\n           ”gi”: ”Low”,\n           ”time”: ”10 mins”,\n           ”tip”: ”Add nuts for crunch”\n         },\n         {\n            ”mealType”: ”Lunch”,\n            ”name”: ”Chickpea Curry with Roti”,\n            ”ingredients”: [“100g chickpeas”,“2 whole wheat rotis”,“spices”],\n            ”protein”: 18,\n            ”carbs”: 45, \n            ”fats”: 6, \n            ”gi”："Medium" ,\n            　"time" :　"30 mins" ,\n            　"tip" :　"Serve with salad"\n         },\n         {\n            　"mealType" :　"Dinner" ,\n            　"name" :　"Lentil Soup with Vegetables" ,\n            　"ingredients" :　["100g lentils","mixed vegetables","spices"] ,\n            　"protein" :　15 ,\n           ',
    ];

    for (const e of examples) {
      console.log('\n=== INPUT ===');
      console.log(e);
      const res = chain.parseRobustly(e);
      console.log('=== OUTPUT ===');
      console.log(JSON.stringify(res, null, 2));
    }

    // Extra diagnostic for the last example (real failing sample)
    const last = examples[examples.length - 1];
    console.log('\n=== DIAGNOSTIC FOR LAST EXAMPLE ===');
    const cleaned = chain.cleanJSON(last);
    console.log('CLEANED (first 2000 chars):');
    console.log(cleaned.slice(0, 2000));
    try {
      JSON.parse(cleaned);
      console.log('JSON.parse succeeded on cleaned text');
    } catch (err) {
      console.log('JSON.parse ERROR:', err.message);
      const m = ((err && err.message) || '').match(/position\s*(\d+)/i);
      if (m) {
        const pos = parseInt(m[1], 10);
        const start = Math.max(0, pos - 40);
        const end = Math.min(cleaned.length, pos + 40);
        console.log('Around error (cleaned substring):');
        console.log(JSON.stringify(cleaned.slice(start, end)));
        // print code points around the error
        const codes = [];
        for (let i = start; i < end; i++) {
          const ch = cleaned[i];
          codes.push({ i, ch, code: ch.charCodeAt(0), hex: ch.charCodeAt(0).toString(16) });
        }
        console.log('Char codes around error:', codes);
        // analyze bracket/brace balance up to the error position
        const analyze = (s, p) => {
          let brace = 0,
            bracket = 0,
            inString = false,
            escape = false,
            stringChar = null;
          let lastOpen = null;
          for (let i = 0; i < Math.min(s.length, p); i++) {
            const ch = s[i];
            if (escape) {
              escape = false;
              continue;
            }
            if (ch === '\\') {
              escape = true;
              continue;
            }
            if (inString) {
              if (ch === stringChar) {
                inString = false;
                stringChar = null;
              }
              continue;
            }
            if (ch === '"' || ch === "'") {
              inString = true;
              stringChar = ch;
              continue;
            }
            if (ch === '{') {
              brace++;
              lastOpen = { char: '{', pos: i };
            } else if (ch === '}') {
              brace--;
            } else if (ch === '[') {
              bracket++;
              lastOpen = { char: '[', pos: i };
            } else if (ch === ']') {
              bracket--;
            }
          }
          return { brace, bracket, lastOpen, snippetBefore: s.slice(Math.max(0, p - 200), p) };
        };
        console.log('Balance analysis up to error pos:', analyze(cleaned, Math.max(0, pos)));
      }
      // Try json5 explicitly and show result/error
      try {
        const JSON5 = require('json5');
        try {
          const p = JSON5.parse(cleaned);
          console.log(
            'JSON5.parse succeeded — found days?',
            !!p && !!(p.days || (Array.isArray(p) && p.some((el) => el && el.days)))
          );
        } catch (e) {
          console.log('JSON5.parse ERROR:', e.message);
        }
      } catch (e) {
        console.log('json5 not installed');
      }
    }
  } catch (err) {
    console.error('ERROR running debug:', err);
    process.exit(1);
  }
})();
