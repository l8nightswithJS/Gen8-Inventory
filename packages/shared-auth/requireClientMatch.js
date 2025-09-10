// In packages/shared-auth/requireClientMatch.js (Corrected and Secure)

function requireClientMatch(req, res, next) {
  // Get the list of client IDs the user is allowed to see from their token.
  const allowedClients = req.user?.client_ids;

  if (!Array.isArray(allowedClients)) {
    return res
      .status(403)
      .json({ error: 'Forbidden: Missing client scope in token.' });
  }

  // Find the client ID from the request, whether it's in the URL path, query, or body.
  const requestedClientIdStr =
    req.params.clientId ||
    req.params.id ||
    req.query.client_id ||
    req.body.client_id;

  // If the request isn't for a specific client (e.g., getting a list), let it pass.
  // The controller will be responsible for filtering the results.
  if (!requestedClientIdStr) {
    return next();
  }

  const requestedClientId = parseInt(requestedClientIdStr, 10);

  if (isNaN(requestedClientId)) {
    return res
      .status(400)
      .json({ error: 'Invalid client ID format in request.' });
  }

  // This is the core security check.
  if (allowedClients.includes(requestedClientId)) {
    return next(); // Success: The user is authorized for this client.
  } else {
    // Failure: The user is trying to access a client they are not assigned to.
    return res
      .status(403)
      .json({ error: 'Forbidden: You do not have access to this client.' });
  }
}

module.exports = requireClientMatch;
