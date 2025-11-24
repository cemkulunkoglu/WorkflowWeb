import { Navigate, useLocation } from 'react-router-dom';
import { TOKEN_KEY } from '../../config/apiConfig';

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const location = useLocation();

  if (!token) {
    // Token yoksa Login sayfasına şutla, ama geldiği yeri de hatırla
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;