

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function categorizeExpense(description) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', // Updated to supported active model
            contents: `Categorize the following expense description into exactly one category (e.g., Food, Transport, Shopping, Bills, Entertainment, Health, Fuel, Groceries, Miscellaneous): "${description}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, description: "The predicted category" }
                    },
                    required: ["category"]
                }
            }
        });

        const data = JSON.parse(response.text);
        return data.category || 'Miscellaneous';
    } catch (err) {
        console.error('AI Categorization Error:', err);
        return 'Miscellaneous';
    }
}

async function generateSpendingInsights(expenses) {
    try {
        const summary = expenses.map(e => `${e.category}: ₹${e.amount} (${e.description})`).join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', // Updated to supported active model
            contents: `Analyze the following user expenses and provide 3 concise, actionable financial advice tips:\n\n${summary}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        insights: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["insights"]
                }
            }
        });

        return JSON.parse(response.text).insights;
    } catch (err) {
        console.error('AI Insights Error:', err);
        return ['Keep tracking your expenses daily to stay within budget.'];
    }
}

module.exports = { categorizeExpense, generateSpendingInsights };