const jwt = require('jsonwebtoken');
const { sbAuth, sbAdmin } = require('../../auth-service/lib/supabaseClient');
const { register, login } = require('../../auth-service/controllers/authController');

jest.mock('jsonwebtoken', () => ({ sign: jest.fn() }));
jest.mock('shared-auth', () => ({ verifyJwt: jest.fn() }));
jest.mock('../../auth-service/lib/supabaseClient', () => ({
  sbAuth: { auth: { signUp: jest.fn(), signInWithPassword: jest.fn() } },
  sbAdmin: { from: jest.fn() },
}));

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('registration and approval boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sbAdmin.from.mockImplementation((table) => {
      if (table !== 'users') throw new Error('Unexpected table: ' + table);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
        insert: jest.fn((payload) => ({
          select: () => ({
            single: async () => ({
              data: { id: payload.id, role: payload.role, approved: payload.approved },
              error: null,
            }),
          }),
        })),
      };
    });
  });

  it('ignores a malicious administrator role in public registration', async () => {
    sbAuth.auth.signUp.mockResolvedValue({
      data: { user: { id: 'test-user', email: 'test@example.com' } },
      error: null,
    });
    const req = { body: { email: 'test@example.com', password: 'secret123', role: 'admin' } };
    const res = response();
    await register(req, res);

    expect(sbAuth.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret123',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    const insertProfile = sbAdmin.from.mock.results.at(-1).value.insert;
    expect(insertProfile).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'project_user', approved: false }),
    );
    expect(res.json.mock.calls[0][0].message).toMatch(/approve/i);
  });

  it('denies login when the profile is pending approval', async () => {
    sbAuth.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'pending-user', email: 'pending@example.com' } },
      error: null,
    });
    sbAdmin.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { id: 'pending-user', role: 'staff', approved: false }, error: null }),
        }),
      }),
    });
    const res = response();
    await login({ body: { email: 'pending@example.com', password: 'secret123' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
