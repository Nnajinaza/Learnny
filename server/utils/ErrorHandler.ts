import { Module } from "module";

export class ErrorHandler extends Error {
    statusCode: Number;

    constructor(message: any, statusCode: Number) {
        super(message);
        this.statusCode = statusCode;

        Error.captureStackTrace(this, this.constructor)
    }
}
// module.exports = ErrorHandler;