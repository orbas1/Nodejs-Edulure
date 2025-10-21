const allowedRoles = ['instructor', 'admin'];

const allowedRoleSet = new Set(allowedRoles);

export const INSTRUCTOR_ALLOWED_ROLES = Object.freeze([...allowedRoles]);

export const INSTRUCTOR_ACCESS_DENIED_STATE = Object.freeze({
  title: 'Instructor Learnspace required',
  description: 'Switch to an instructor Learnspace or ask an admin to extend the proper permissions.'
});

export const INSTRUCTOR_ACCESS_LOADING_STATE = Object.freeze({
  title: 'Checking workspace permissions',
  description: 'We are confirming your Learnspace access. Refresh if this message persists.'
});

export function isInstructorRole(role) {
  return typeof role === 'string' && allowedRoleSet.has(role);
}

export function resolveInstructorAccess(role) {
  if (role == null) {
    return {
      granted: false,
      message: {
        variant: 'loading',
        ...INSTRUCTOR_ACCESS_LOADING_STATE
      }
    };
  }

  if (!isInstructorRole(role)) {
    return {
      granted: false,
      message: {
        variant: 'error',
        ...INSTRUCTOR_ACCESS_DENIED_STATE
      }
    };
  }

  return {
    granted: true,
    message: null
  };
}
