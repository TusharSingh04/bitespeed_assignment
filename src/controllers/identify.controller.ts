import { Request, Response, NextFunction } from 'express';
import { identifyContact } from '../services/identify.service';
import { IdentifyRequest } from '../types';

/**
 * Controller for POST /identify endpoint
 * Handles the identity reconciliation request
 */
export async function identifyController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, phoneNumber } = req.body as IdentifyRequest;

    // Validate that at least one field is provided
    if (!email && !phoneNumber) {
      res.status(400).json({
        error: 'At least one of email or phoneNumber must be provided',
      });
      return;
    }

    // Call the identity service
    const result = await identifyContact({ email, phoneNumber });

    // Return the consolidated contact
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
