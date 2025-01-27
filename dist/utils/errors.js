"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedError = exports.BadRequestError = exports.CustomError = void 0;
class CustomError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
class BadRequestError extends CustomError {
    constructor(message = 'Bad request') {
        super(message, 400, 'BAD_REQUEST');
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends CustomError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
