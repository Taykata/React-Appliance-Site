import { Routes, Route } from 'react-router-dom';

import { AuthProvider } from './contexts/authContext';

import Navigation from './components/Navigation/Navigation';
import Home from './components/Home/Home';
import AllAppliances from './components/MainAppliances/AllAppliances/AllAppliances';
import AddAppliance from './components/MainAppliances/AddAppliance/AddAppliance';
import MyProfile from './components/MyProfile/MyProfile';
import Logout from './components/auth/Logout/Logout';
import Login from './components/auth/Login/Login';
import Register from './components/auth/Register/Register';
import Footer from './components/Footer/Footer';
import ApplianceDetails from './components/MainAppliances/ApplianceDetails/ApplianceDetails';
import NotFound from './components/NotFound/NotFound';
import EditAppliance from './components/MainAppliances/EditAppliance/EditAppliance';

export default function App() {
    return (
        <AuthProvider>
            <Navigation />

            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/all-appliances' element={<AllAppliances />} />
                <Route path='/add-appliance' element={<AddAppliance />} />
                <Route path='/details' element={<ApplianceDetails />} />
                <Route path='/edit/:applianceId' element={<EditAppliance />} />
                <Route path='/my-profile' element={<MyProfile />} />
                <Route path='/logout' element={<Logout />} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
                <Route path='*' element={<NotFound />} />
            </Routes>

            <Footer />
        </AuthProvider>
    )
}