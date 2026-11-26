const sumArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) {
        return null;
    }
    for (const val of arr) {
        if (typeof val !== 'number' || Number.isNaN(val)) {
            return null;
        }
    }
    return arr.reduce((acc, cur) => acc + cur, 0);
};

const evaluateAssessment = ({ phq9Answers, gad7Answers, pss10Answers }) => {
    const phq9 = sumArray(phq9Answers);
    const gad7 = sumArray(gad7Answers);
    const pss10 = sumArray(pss10Answers);

    if (phq9 === null || gad7 === null || pss10 === null) {
        return { error: 'phq9Answers, gad7Answers, and pss10Answers must be non-empty arrays of numbers' };
    }

    if (phq9 < 0 || phq9 > 27 || gad7 < 0 || gad7 > 21 || pss10 < 0 || pss10 > 40) {
        return { error: 'Calculated scores are outside valid clinical ranges' };
    }

    // Question 9 (index 8) on PHQ-9 relates to self-harm/suicidal ideation
    const crisisFlag = Array.isArray(phq9Answers) && phq9Answers.length >= 9 && phq9Answers[8] > 0;

    let severityTier = 'LOW';

    if (crisisFlag || phq9 >= 20 || gad7 >= 15 || pss10 >= 27) {
        severityTier = 'CRITICAL';
    } else if (phq9 >= 15 || gad7 >= 10 || pss10 >= 20) {
        severityTier = 'HIGH';
    } else if (phq9 >= 10 || gad7 >= 5 || pss10 >= 14) {
        severityTier = 'MODERATE';
    }

    return {
        scores: { phq9, gad7, pss10 },
        severityTier,
        crisisFlag,
    };
};

module.exports = { evaluateAssessment };