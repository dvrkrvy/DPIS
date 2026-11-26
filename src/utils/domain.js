const normalizeEmailDomain = (value) => {
    if (!value || typeof value !== 'string') return '';
    let cleaned = value.trim().toLowerCase();
    if (cleaned.includes('@')) {
        cleaned = cleaned.split('@').pop() || '';
    }
    cleaned = cleaned.replace(/^@+/, '').trim();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) {
        return '';
    }
    return cleaned;
};

module.exports = { normalizeEmailDomain };
