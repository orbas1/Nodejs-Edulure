import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import InstructorRegister from './pages/InstructorRegister.jsx';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import Search from './pages/Search.jsx';
import Admin from './pages/Admin.jsx';
import ContentLibrary from './pages/ContentLibrary.jsx';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/instructor" element={<InstructorRegister />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/search" element={<Search />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/content" element={<ContentLibrary />} />
      </Route>
    </Routes>
  );
}

export default App;
