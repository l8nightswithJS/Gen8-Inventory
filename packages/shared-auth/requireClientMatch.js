// In packages/shared-auth/requireClientMatch.js

function requireClientMatch(req, res, next) {
  // The JWT payload now contains 'client_ids', an array of numbers.
  const allowedClients = req.user?.client_ids;

  if (!Array.isArray(allowedClients)) {
    return res
      .status(403)
      .json({ error: 'Forbidden: Missing client scope in token.' });
  }

  // Get the requested client_id from the body or query params.
  const requestedClientId = parseInt(
    req.body?.client_id || req.query?.client_id,
    10,
  );

  // If the request is for a specific client, check if the user has access.
  if (requestedClientId) {
    if (allowedClients.includes(requestedClientId)) {
      return next(); // User has access, proceed.
    } else {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client.' });
    }
  }

  // If the request does not specify a client_id (e.g., fetching a list of all clients),
  // we can just proceed. The route can handle further filtering if needed.
  return next();
}

module.exports = requireClientMatch;
