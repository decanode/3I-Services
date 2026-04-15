const counterService = require('../services/counter');

exports.getStats = async (_req, res) => {
    try {
        const stats = await counterService.getCounter();
        res.json({ stats });
    } catch (e) {
        console.error('[counter] getStats error:', e);
        res.status(500).json({ message: 'Failed to fetch counter stats', error: e.message });
    }
};
