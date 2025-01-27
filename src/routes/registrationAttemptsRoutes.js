"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrationAttemptsRoutes = void 0;
const express_1 = require("express");
const RegistrationAttemptsController_1 = require("../controllers/RegistrationAttemptsController");
exports.registrationAttemptsRoutes = (0, express_1.Router)();
const registrationAttemptsController = new RegistrationAttemptsController_1.RegistrationAttemptsController();
exports.registrationAttemptsRoutes.get('/', registrationAttemptsController.getRegistrationAttempts);
