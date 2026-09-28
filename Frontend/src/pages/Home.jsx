import { useTheme } from '../context/ThemeContext';

function ExempleBouton() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <button onClick={toggleDarkMode}>
      {darkMode ? 'Mode clair' : 'Mode sombre'}
    </button>
  );
}