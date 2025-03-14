import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavigationBar from './components/NavigationBar.jsx';
import LoginScreen from './pages/LoginScreen.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useAuth } from '../AuthContext.jsx';
import Reports from './pages/Maintenance Reports/Reports.jsx';
import HomeScreen from './pages/Home.jsx';
import Sample from './pages/Maintenance Reports/Sample.jsx';
import AdminDashboard from './pages/Maintenance Reports/AdminDashboard.jsx';
import Sidebar from './components/Sidebar.jsx';
import AdminLostAndFound from './pages/LostAndFound/LostAndFound.jsx';
import { NavigationProvider } from './components/SidebarContext.jsx';
import Notifications from './pages/Notifications.jsx';
import LostAndFoundDashboard from './pages/LostAndFound/Dashboard.jsx';
import ReportScreen from './pages/Student/pages/ReportScreen.jsx';
import ListScreen from './pages/Student/pages/ListScreen.jsx';
function App() {
    const { isAuthenticated, isLoading, role } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    if (isLoading) return <div>Loading...</div>;

    return (
        <Router>
            {isAuthenticated ? (
                <NavigationProvider>
                    <NavigationBar />
                    <div className="d-flex vh-100">
                        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                        <div className="main-content">
                            <Routes>
                                {role === 'admin' && (
                                    <>
                                        <Route path="/home" element={<HomeScreen />} />
                                        <Route path="/dashboard" element={<AdminDashboard />} />
                                        <Route path="/reports" element={<Reports />} />
                                        <Route path="/lf-dashboard" element={<LostAndFoundDashboard />} />
                                        <Route path="/lostandfound" element={<AdminLostAndFound />} />
                                        <Route path="/maintenance-requests" element={<Sample />} />
                                        <Route path='/notifications' element={<Notifications />} />
                                        <Route path="*" element={<Navigate to="/home" replace />} />
                                    </>
                                )}
                                {role === 'student' && (
                                    <>
                                       <Route path="/home" element={<HomeScreen />} />
                                       <Route path="/reports-screen" element={<ReportScreen />} />
                                       <Route path="/list-screen" element={<ListScreen />} />
                                       <Route path='/notifications' element={<Notifications />} />
                                    </>
                                )}
                            </Routes>
                        </div>
                    </div>
                </NavigationProvider>
            ) : (
                <Routes>
                    <Route path="*" element={<LoginScreen />} />
                </Routes>
            )}
        </Router>
    );
}

export default App;