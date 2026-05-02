import {
  getIntegrations,
  getProfessionalProfile,
  getUserPreferences,
  saveProfessionalProfile,
  saveUserPreferences
} from '../services/premiumPersistence.js';

export async function getAccountPreferences(req, res, next) {
  try {
    const data = await getUserPreferences(req.user.id);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function updateAccountPreferences(req, res, next) {
  try {
    const data = await saveUserPreferences(req.user.id, req.body || {});
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function getAccountIntegrations(req, res, next) {
  try {
    const data = await getIntegrations(req.user.id);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function getAccountProfile(req, res, next) {
  try {
    const data = await getProfessionalProfile(req.user.id);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function updateAccountProfile(req, res, next) {
  try {
    const data = await saveProfessionalProfile(req.user.id, req.body || {});
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}
