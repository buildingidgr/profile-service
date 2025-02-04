"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = void 0;
exports.corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.NEXT_PUBLIC_APP_URL,
            process.env.NEXT_PUBLIC_MARKETING_URL,
            'http://localhost:3000',
            'http://localhost:3001'
        ].filter(Boolean);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600
};
//# sourceMappingURL=cors.js.map