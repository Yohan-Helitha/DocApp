import React, { useEffect, useState } from "react";
import Header from "./layouts/Header";
import Footer from "./layouts/Footer";
import Home from "./pages/Home";
import RegisterPatient from "./features/auth/Register";
import RegisterDoctor from "./features/auth/RegisterDoctor";
import Login from "./features/auth/Login";
import SuccessPatient from "./features/auth/SuccessPatient";
import SuccessDoctor from "./features/auth/SuccessDoctor";
import SuccessAdmin from "./features/auth/SuccessAdmin";
import BrowseDoctors from "./pages/BrowseDoctors";
import DoctorProfile from "./pages/DoctorProfile";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments from "./pages/MyAppointments";
import DoctorAvailability from "./pages/DoctorAvailability";
import DoctorAppointments from "./pages/DoctorAppointments";
import PrescriptionEditor from "./pages/PrescriptionEditor";
import Telemedicine from './features/telemedicine/Telemedicine'

export default function App() {
  const [route, setRoute] = useState(
    window.location.hash.replace("#", "") || "/",
  );

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace("#", "") || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  // parse path without query string for route matching
  const path = route.split("?")[0];

  let Page = Home;
  if (path.startsWith("/register/patient"))
    Page = () => <RegisterPatient navigate={navigate} />;
  else if (path.startsWith("/register/doctor"))
    Page = () => <RegisterDoctor navigate={navigate} />;
  else if (path.startsWith("/login"))
    Page = () => <Login navigate={navigate} />;
  else if (path.startsWith("/success/patient"))
    Page = () => <SuccessPatient navigate={navigate} />;
  else if (path.startsWith("/success/doctor"))
    Page = () => <SuccessDoctor navigate={navigate} />;
  else if (path.startsWith("/success/admin"))
    Page = () => <SuccessAdmin navigate={navigate} />;
  else if (path.startsWith("/doctors/"))
    Page = () => <DoctorProfile navigate={navigate} />;
  else if (path === "/doctors")
    Page = () => <BrowseDoctors navigate={navigate} />;
  else if (path.startsWith("/book"))
    Page = () => <BookAppointment navigate={navigate} />;
  else if (path === "/appointments")
    Page = () => <MyAppointments navigate={navigate} />;
  else if (path === "/doctor/availability")
    Page = () => <DoctorAvailability navigate={navigate} />;
  else if (path === "/doctor/appointments")
    Page = () => <DoctorAppointments navigate={navigate} />;
  else if (path.startsWith("/doctor/prescriptions"))
    Page = () => <PrescriptionEditor navigate={navigate} />;
  else if(route.startsWith('/telemedicine')) 
    Page = ()=> <Telemedicine navigate={navigate} />

  return (
    <div className="min-h-screen flex flex-col">
      <Header navigate={navigate} />
      <main className="flex-1">
        <Page />
      </main>
      <Footer />
    </div>
  );
}
