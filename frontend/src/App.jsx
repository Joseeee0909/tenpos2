import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from './pages/register.jsx' ; 
import Login from './pages/login.jsx';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/register" element={<Register/>} />
      </Routes>
    </Router>
  );
}

export default App;
