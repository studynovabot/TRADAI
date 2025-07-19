/**
 * Health Check Endpoint for OTC Signal Generator
 */

async function handler(req, res) {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            components: {
                api: 'healthy',
                database: 'healthy',
                browser: 'not_initialized'
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        };

        return res.status(200).json(health);

    } catch (error) {
        return res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

export default handler;