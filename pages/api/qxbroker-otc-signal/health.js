/**
 * QXBroker OTC Signal Generator Health Check API
 * 
 * Provides health status information about the QXBroker OTC signal generator
 */

import { healthCheck } from '../qxbroker-otc-signal';

export default async function handler(req, res) {
  return healthCheck(req, res);
}