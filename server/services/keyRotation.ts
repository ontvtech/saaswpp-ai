import { Router } from 'express';
import { rotateApiKey } from '../routes/admin'; // Import from admin routes

export const keyRotationService = {
  rotate: rotateApiKey,
};
