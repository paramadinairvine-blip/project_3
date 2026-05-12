import useAuthStore from '../stores/authStore';
import { ROLES } from '../utils/constants';

const useAuth = () => {
  const store = useAuthStore();

  const role = store.user?.role;
  const isAdmin = role === ROLES.ADMIN;
  const isOperator = role === ROLES.OPERATOR;
  const isViewer = role === ROLES.VIEWER;

  const checkPermission = (allowedRoles) => {
    if (!role) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(role);
  };

  return {
    ...store,
    role,
    isAdmin,
    isOperator,
    isViewer,
    checkPermission,
  };
};

export default useAuth;
