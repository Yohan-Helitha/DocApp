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
import PaymentCheckout from "./pages/PaymentCheckout";
import PaymentReturn from "./pages/PaymentReturn";
import PaymentCancel from "./pages/PaymentCancel";
import PatientPrescriptions from "./pages/PatientPrescriptions";
import SymptomCheckerChat from "./features/AI/pages/SymptomCheckerChat";
import PatientProfile from './features/patient-management/PatientProfile'
import PatientHistory from './features/patient-management/PatientHistory'
import PatientMedicalReports from './features/patient-management/PatientMedicalReports'
import Notifications from './features/notifications/Notifications'
import TelemedicineGuard from "./features/auth/TelemedicineGuard";

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
  else if (path === "/dashboard")
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
  else if (path === "/prescriptions")
    Page = () => <PatientPrescriptions navigate={navigate} />;
  else if (path === "/symptom-checker")
    Page = () => <SymptomCheckerChat navigate={navigate} />;
  else if (route.startsWith("/telemedicine"))
    Page = () => <TelemedicineGuard navigate={navigate} />;
  else if (path.startsWith("/payments/checkout"))
    Page = () => <PaymentCheckout navigate={navigate} />;
  else if (path.startsWith("/payments/return"))
    Page = () => <PaymentReturn navigate={navigate} />;
  else if (path.startsWith("/payments/cancel"))
    Page = () => <PaymentCancel navigate={navigate} />;
  else if(route.startsWith('/patient/profile')) Page = ()=> <PatientProfile navigate={navigate} />
  else if(route.startsWith('/patient/history')) Page = ()=> <PatientHistory navigate={navigate} />
  else if(route.startsWith('/patient/medical-reports')) Page = ()=> <PatientMedicalReports navigate={navigate} />
  else if(route.startsWith('/notifications')) Page = ()=> <Notifications navigate={navigate} />
    
  const isDashboard = route.startsWith('/patient/') || 
                      route.startsWith('/success/') || 
                      route.startsWith('/notifications') ||
                      route.startsWith('/appointments') ||
                      route.startsWith('/doctors') ||
                      route.startsWith('/symptom-checker');

  const hidePublicChrome =
    route.startsWith("/success/admin") ||
    path === "/dashboard" ||
    route.startsWith("/success/patient") ||
    route.startsWith("/success/doctor") ||
    path === "/appointments" ||
    path === "/prescriptions" ||
    path === "/symptom-checker" ||
    path === "/telemedicine" ||
    path === "/doctors" ||
    path.startsWith("/doctors/") ||
    path.startsWith("/book") ||
    path.startsWith("/doctor/");

  if (hidePublicChrome) {
    // These pages provide their own dashboards/layouts, so we intentionally do NOT
    // render the public Header/Footer here.
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Page />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isDashboard && <Header navigate={navigate} />}
      <main className="flex-1">
        <Page />
      </main>
      {!isDashboard && <Footer />}
    </div>
  );
}
