/* ++++++++++ AUTHORIZATION ++++++++++ */
import useAuth from '../../authorization/useAuth';

const Logout = () => {
  const { logout } = useAuth();

  // Handle logout
  const handleLogout = async () => {
    await logout(); // Call the logout function from AuthContext
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-neon rounded-md text-white px-4 py-2 hover:scale-[1.1] duration-[300ms]"
    >
      Logout
    </button>
  );
};

export default Logout;
