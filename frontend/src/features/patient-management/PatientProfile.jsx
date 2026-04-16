import React, { useState, useEffect } from 'react';
import { generatePatientProfilePDF } from '../../utils/patientProfilePDF';
import DashboardLayout from '../../layouts/DashboardLayout';

// Helper function to display "-" if value is empty
const displayValue = (value) => {
  return value && value.toString().trim() !== '' ? value : '-';
};

export default function PatientProfile({ navigate }) {
  console.log('PatientProfile VERSION: 2.0');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileCompletionRequired, setIsProfileCompletionRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [patientData, setPatientData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    bloodGroup: '',
    address: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    profileImage: null,
    id: null
  });

  const token = sessionStorage.getItem('accessToken');
  
  // Extract patientId from JWT token (if not in localStorage)
  let patientId = localStorage.getItem('patientId');
  if (!patientId && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      patientId = payload.sub; // 'sub' is the user ID (UUID) in the JWT
      console.log('Extracted patientId from JWT:', patientId);
      if (patientId) {
        localStorage.setItem('patientId', patientId);
      }
    } catch (e) {
      console.error('Failed to extract patientId from token:', e);
    }
  }

  const [formData, setFormData] = useState({ ...patientData });
  const [previewImage, setPreviewImage] = useState(null);

  // Check if profile completion is required
  useEffect(() => {
    const requiresCompletion = localStorage.getItem('requiresProfileCompletion') === 'true';
    setIsProfileCompletionRequired(requiresCompletion);
    
    if (requiresCompletion) {
      // If profile completion is required, open the form immediately
      setIsNewPatient(true);
      setIsModalOpen(true);
    }
  }, []);

  // Block navigation if profile completion is required
  useEffect(() => {
    if (isProfileCompletionRequired) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };

      const handlePopState = (e) => {
        // Prevent navigation away from this page
        window.history.pushState(null, null, window.location.href);
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      window.history.pushState(null, null, window.location.href);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isProfileCompletionRequired]);

  // Fetch patient data on mount
  useEffect(() => {
    if (patientId && token) {
      fetchPatientData();
    }
  }, [patientId, token]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        console.error('No access token found');
        setError('Access token missing. Please login again.');
        setLoading(false);
        return;
      }

      if (!patientId) {
        console.error('No patient ID found');
        setError('Patient ID missing. Please login again.');
        setLoading(false);
        return;
      }

      console.log('Fetching patient data for ID:', patientId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `/api/v1/patients/${patientId}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      console.log('Patient fetch response status:', response.status);

      // Check if patient record doesn't exist (404)
      if (response.status === 404) {
        console.log('Patient record not found (404) - treating as new patient');
        setIsNewPatient(true);
        setIsProfileCompletionRequired(true);
        setIsModalOpen(true);
        // Patient record not found - this is a new patient
        setPatientData({
          firstName: '',
          lastName: '',
          fullName: '',
          email: '',
          phone: '',
          dob: '',
          gender: '',
          bloodGroup: '',
          address: '',
          allergies: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          profileImage: null,
        });
        setFormData({
          firstName: '',
          lastName: '',
          fullName: '',
          email: '',
          phone: '',
          dob: '',
          gender: '',
          bloodGroup: '',
          address: '',
          allergies: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          profileImage: null,
        });
        setIsProfileCompletionRequired(true);
        setIsModalOpen(true);
        setError(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch patient data (${response.status})`);
      }

      const data = await response.json();
      console.log('Patient data received:', data);
      
      const patient = data.data || data.patient || data;

      // Map backend fields to frontend model
      const mappedData = {
        firstName: patient.first_name || '',
        lastName: patient.last_name || '',
        fullName: patient.full_name || `${patient.first_name} ${patient.last_name}`,
        email: patient.email || '',
        phone: patient.phone || '',
        dob: patient.dob || '',
        gender: patient.gender || '',
        bloodGroup: patient.blood_group || '',
        address: patient.address || '',
        allergies: patient.allergies || '',
        emergencyContactName: patient.emergency_contact_name || '',
        emergencyContactPhone: patient.emergency_contact_phone || '',
        profileImage: patient.profile_image || null,
        id: patient.id || null
      };

      // Check if patient is new (profile is empty)
      const isNewPatient = !mappedData.firstName && !mappedData.lastName && !mappedData.phone && !mappedData.dob;
      
      setPatientData(mappedData);
      setFormData(mappedData);
      setPreviewImage(mappedData.profileImage);
      setError(null);
      
      // Auto-open modal for new patients
      if (isNewPatient) {
        console.log('Patient has empty profile - opening modal');
        setIsNewPatient(true);
        setIsProfileCompletionRequired(true);
        setIsModalOpen(true);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('Fetch timeout after 10 seconds');
        setError('Request timeout. Backend service may be unavailable.');
      } else {
        console.error('Error fetching patient data:', err);
        setError('Failed to load patient data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setFormData({ ...patientData });
    setPreviewImage(patientData.profileImage);
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData(prev => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || 
        !formData.dob || !formData.gender || !formData.bloodGroup || !formData.address || 
        !formData.allergies || !formData.emergencyContactName || !formData.emergencyContactPhone) {
      alert('All fields are mandatory. Please complete all fields before saving.');
      return;
    }

    // Validate phone numbers (+94XXXXXXXXX)
    const phoneRegex = /^\+94\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert('Primary phone number must be in the format +94XXXXXXXXX');
      return;
    }
    if (!phoneRegex.test(formData.emergencyContactPhone)) {
      alert('Emergency contact phone must be in the format +94XXXXXXXXX');
      return;
    }

    // Validate DOB (Cannot be in the future, can be today)
    const dobDate = new Date(formData.dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dobDate.setHours(0, 0, 0, 0);
    
    if (dobDate > today) {
      alert('Date of Birth cannot be in the future.');
      return;
    }
    
    try {
      setSubmittingForm(true);
      // Map frontend fields to backend fields
      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        blood_group: formData.bloodGroup,
        address: formData.address,
        allergies: formData.allergies,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        user_id: patientId,
        profile_image: formData.profileImage
      };

      const url = isNewPatient
      ? `/api/v1/patients`
      : `/api/v1/patients/${patientId}`;

      const method = isNewPatient ? 'POST' : 'PUT';

      const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          alert('Conflict: This email is already registered to another patient account.');
          return;
        }
        throw new Error(responseData.error || responseData.message || 'Failed to update patient data');
      }

      setIsModalOpen(false);
      setIsNewPatient(false);
      setIsProfileCompletionRequired(false);
      fetchPatientData();
    } catch (err) {
      console.error('Error updating patient data:', err);
      alert(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSubmittingForm(false);
    }
  };

  return (
    <DashboardLayout navigate={navigate} pageName="Patient Profile">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Patient Profile</h1>
          <p className="text-slate-600">View and manage your personal healthcare information.</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-center">
            <span className="text-slate-500">Loading patient profile...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-red-700">
            {error}
          </div>
        ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="size-28 rounded-full ring-4 ring-primary/20 bg-slate-100 overflow-hidden flex items-center justify-center text-primary relative shadow-2xl">
                    {patientData.profileImage ? (
                      <img 
                        src={patientData.profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-6xl">person</span>
                    )}
                  </div>
                  
                  <label className="absolute bottom-1 right-1 size-9 bg-primary text-white rounded-full border-4 border-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-all hover:scale-110 shadow-lg active:scale-95 group-hover:ring-4 ring-primary/10">
                    <span className="material-symbols-outlined text-xl">camera_alt</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64Image = reader.result;
                            // Optimistically update UI
                            setPatientData(prev => ({ ...prev, profileImage: base64Image }));
                            setPreviewImage(base64Image);
                            
                            // Auto-save to backend
                            try {
                              console.log('Auto-saving profile image...');
                              const method = isNewPatient ? 'POST' : 'PUT';
                              const url = isNewPatient ? '/api/v1/patients' : `/api/v1/patients/${patientId}`;
                              
                              const response = await fetch(url, {
                                method,
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  ...patientData,
                                  user_id: patientId,
                                  profile_image: base64Image,
                                  // Ensure required fields are present if it's a new patient
                                  first_name: patientData.firstName || 'New',
                                  last_name: patientData.lastName || 'Patient',
                                  email: patientData.email || 'pending@example.com',
                                  phone: patientData.phone || '0000000000',
                                  dob: patientData.dob || '2000-01-01',
                                  gender: patientData.gender || 'Other',
                                  address: patientData.address || 'Pending Address'
                                })
                              });
                              
                              if (!response.ok) throw new Error('Failed to auto-save image');
                              console.log('Image auto-saved successfully');
                              fetchPatientData(); // Refresh data
                            } catch (err) {
                              console.error('Error auto-saving image:', err);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-4">{patientData.firstName} {patientData.lastName}</h2>
                <p className="text-sm text-slate-500 font-medium">Patient ID: #PT{patientData.id || '9999'}</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleEditClick}
                    className="py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary/20"
                  >
                    <span className="material-symbols-outlined">edit</span> Edit
                  </button>
                  <button 
                    onClick={() => generatePatientProfilePDF(patientData)}
                    className="py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary/20"
                  >
                    <span className="material-symbols-outlined">download</span> Download
                  </button>
                </div>
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <span className="material-symbols-outlined text-sm">mail</span>
                    <span className="text-sm">{displayValue(patientData.email)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span className="text-sm">{displayValue(patientData.phone)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-900">Personal Information</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">First Name</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.firstName)}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Last Name</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.lastName)}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date of Birth</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.dob)}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Gender</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.gender)}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Blood Group</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.bloodGroup)}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Address</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.address)}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Allergies</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.allergies)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-900">Emergency Contact</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Name</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.emergencyContactName)}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone</label>
                  <p className="text-slate-900 font-medium">{displayValue(patientData.emergencyContactPhone)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isProfileCompletionRequired ? 'Complete Your Profile' : 'Update Profile Info'}
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  {isProfileCompletionRequired 
                    ? 'Please fill in your healthcare information to get started.'
                    : 'Adjust your personal details and emergency contact information.'
                  }
                </p>
              </div>
              {/* Only show close button if profile completion is not required */}
              {!isProfileCompletionRequired && (
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="size-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-primary text-xs font-black uppercase tracking-widest pb-2 border-b border-slate-200">Basic Details</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">First Name</label>
                    <input 
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Last Name</label>
                    <input 
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Date of Birth</label>
                    <input 
                      name="dob"
                      type="date"
                      value={formData.dob}
                      onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Gender</label>
                    <select 
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Column 2: Contact & Medical */}
                <div className="space-y-4">
                  <h4 className="text-primary text-xs font-black uppercase tracking-widest pb-2 border-b border-slate-200">Contact & Medical</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Email Address</label>
                    <input 
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Phone Number</label>
                    <input 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+94XXXXXXXXX"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Blood Group</label>
                    <select 
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Allergies</label>
                    <input 
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Column 3: Emergency & Location */}
                <div className="space-y-4">
                  <h4 className="text-primary text-xs font-black uppercase tracking-widest pb-2 border-b border-slate-200">Emergency & Address</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Emergency Name</label>
                    <input 
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Emergency Phone</label>
                    <input 
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Full Address</label>
                    <textarea 
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows="3"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-10 flex gap-4 border-t border-slate-200 pt-8">
                {/* Only show discard button if profile completion is not required */}
                {!isProfileCompletionRequired && (
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submittingForm}
                    className="px-8 py-3.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Discard
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={submittingForm}
                  className={`${isProfileCompletionRequired ? 'w-full' : 'flex-1'} py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all active:scale-[0.98] uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {submittingForm ? (
                    <>
                      <span className="animate-spin material-symbols-outlined">refresh</span>
                      Saving...
                    </>
                  ) : (
                    'Save Profile Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

