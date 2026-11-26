const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: 'v1beta' },
});

const generateAssessmentReport = async ({ scores, severityTier, crisisFlag, resources }) => {
    const validResourceIds = resources.map((r) => String(r._id));

    const compactResources = resources.map((r) => ({
        id: String(r._id),
        title: r.title,
        type: r.type,
        tags: r.tags,
    }));

    const prompt = `
You are a supportive wellness assistant inside a psychological screening platform (DPIS).
You do NOT diagnose medical or mental health conditions. Screening scores are preliminary indicators only.

Assessment data:
- Scores: PHQ-9 = ${scores.phq9}/27, GAD-7 = ${scores.gad7}/21, PSS-10 = ${scores.pss10}/40
- Severity Tier: ${severityTier}
- Crisis Flag: ${crisisFlag}

Available curated resources (choose up to 3 IDs strictly from this list):
${JSON.stringify(compactResources)}

Tasks:
1. Write a clear, empathetic, non-diagnostic "aiSummary" (3-4 sentences) explaining what these screening scores generally suggest. If crisisFlag is true or severityTier is CRITICAL, gently encourage reaching out to a qualified clinician or crisis support line immediately.
2. Pick up to 3 "recommendedResourceIds" from the available resources list whose tags best match the user's scores. Only use exact IDs from the provided list.
3. Provide 3 practical, small "actionableSteps" for the next week.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    aiSummary: { type: Type.STRING },
                    recommendedResourceIds: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                    actionableSteps: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                },
                required: ['aiSummary', 'recommendedResourceIds', 'actionableSteps'],
            },
        },
    });

    const parsed = JSON.parse(response.text);

    // Filter out any IDs that aren't in our actual database list
    const safeResourceIds = Array.isArray(parsed.recommendedResourceIds)
        ? parsed.recommendedResourceIds.filter((id) => validResourceIds.includes(String(id)))
        : [];

    const safeSteps = Array.isArray(parsed.actionableSteps)
        ? parsed.actionableSteps.slice(0, 5)
        : [];

    return {
        aiSummary: parsed.aiSummary || 'Preliminary screening results recorded.',
        recommendedResourceIds: safeResourceIds,
        actionableSteps: safeSteps,
    };
};

module.exports = { generateAssessmentReport };

const generateAdminAnalyticsSummary = async ({ orgName, totalAssessments, severityCounts, averageScores, month }) => {
    const prompt = `
You are an organizational well-being analyst assisting an administrator at "${orgName}" for period "${month || 'all-time'}".
Data is strictly anonymized and aggregated across employees or students.

Metrics:
- Total Assessments: ${totalAssessments}
- Severity Counts: ${JSON.stringify(severityCounts)}
- Average Scores: PHQ-9 = ${averageScores.phq9}, GAD-7 = ${averageScores.gad7}, PSS-10 = ${averageScores.pss10}

Task:
Return 4 to 5 concise, actionable executive bullet points highlighting overall trends, elevated risk tiers, and non-clinical organizational support suggestions. Do not speculate about individual identities.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    bulletPoints: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                },
                required: ['bulletPoints'],
            },
        },
    });

    const parsed = JSON.parse(response.text);
    return Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [];
};

module.exports = { generateAssessmentReport, generateAdminAnalyticsSummary };