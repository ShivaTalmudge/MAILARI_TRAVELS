import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { searchLocations, reverseGeocode, calculateRoute } from '../services/location.service';

export const search = async (req: Request, res: Response): Promise<void> => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) { sendSuccess(res, []); return; }

  try {
    const results = await searchLocations(q);
    sendSuccess(res, results);
  } catch (err) {
    console.error('Location search failed:', err);
    sendError(res, 'Location search is temporarily unavailable. Please type the address manually.', 502);
  }
};

export const reverse = async (req: Request, res: Response): Promise<void> => {
  const lat = parseFloat(String(req.query.lat));
  const lon = parseFloat(String(req.query.lon));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    sendError(res, 'Valid lat and lon query parameters are required.', 400);
    return;
  }

  try {
    const displayName = await reverseGeocode(lat, lon);
    sendSuccess(res, { displayName, lat, lon });
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
    sendError(res, 'Could not resolve an address for this location.', 502);
  }
};

export const route = async (req: Request, res: Response): Promise<void> => {
  const { pickup, drop } = req.body || {};
  if (!pickup || !drop || !Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lon) || !Number.isFinite(drop.lat) || !Number.isFinite(drop.lon)) {
    sendError(res, 'pickup and drop coordinates ({ lat, lon }) are required.', 400);
    return;
  }

  try {
    const result = await calculateRoute(pickup, drop);
    sendSuccess(res, result);
  } catch (err) {
    console.error('Route calculation failed:', err);
    sendError(res, 'Could not calculate a route between these locations.', 502);
  }
};
