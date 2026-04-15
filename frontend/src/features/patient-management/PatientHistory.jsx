import React, { useState, useEffect } from 'react';
import { generateMedicalRecordPDF, generateAllMedicalRecordsPDF } from '../../utils/medicalRecordPDF';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function PatientHistory({ navigate }) {
  const [historyEntries, setHistoryEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    condition_name: '',
    diagnosed_on: '',
    status: 'active',
    remarks: ''
  });
  
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Get patient ID and token from local/session storage
  const patientId = localStorage.getItem('patientId');
  const token = sessionStorage.getItem('accessToken');

  // Patient data for PDF export
  const [patientData, setPatientData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 000-0000',
    dob: '1990-01-15',
    gender: 'Male',
    bloodGroup: 'O Positive',
    address: '123 Health Street, Medical City, MC 12345',
    allergies: 'Peanuts, Penicillin'
  });

  // Fetch medical history on component mount
  useEffect(() => {
    if (patientId && token) {
      fetchMedicalHistory();
    }
  }, [patientId, token]);

  const fetchMedicalHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-history`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch medical history');

      const data = await response.json();
      setHistoryEntries(data.history || data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching medical history:', err);
      setError('Failed to load medical history');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (entry = null) => {
    if (entry) {
      // Edit mode: pre-fill form with entry data
      setEditingId(entry.history_id);
      setFormData({
        condition_name: entry.condition_name,
        diagnosed_on: entry.diagnosed_on,
        status: entry.status,
        remarks: entry.remarks
      });
    } else {
      // Add mode: clear form
      setEditingId(null);
      setFormData({
        condition_name: '',
        diagnosed_on: '',
        status: 'active',
        remarks: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Update existing entry via API
        const response = await fetch(
          `/api/v1/patients/${editingId}/medical-history-entry`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(formData)
          }
        );

        if (!response.ok) throw new Error('Failed to update entry');
        
        // Update local state
        setHistoryEntries(historyEntries.map(entry =>
          entry.history_id === editingId
            ? { ...entry, ...formData }
            : entry
        ));
      } else {
        // Add new entry via API
        const response = await fetch(
          `/api/v1/patients/${patientId}/medical-history`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(formData)
          }
        );

        if (!response.ok) throw new Error('Failed to create entry');
        
        const newEntry = await response.json();
        setHistoryEntries([newEntry.data || newEntry, ...historyEntries]);
      }
      
      handleCloseModal();
    } catch (err) {
      console.error('Error submitting entry:', err);
      alert('Failed to save entry. Please try again.');
    }
  };

  const handleDeleteEntry = async (historyId) => {
    if (window.confirm('Are you sure you want to remove this record?')) {
      try {
        const response = await fetch(
          `/api/v1/patients/${historyId}/medical-history-entry`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!response.ok) throw new Error('Failed to delete entry');
        
        setHistoryEntries(historyEntries.filter(entry => entry.history_id !== historyId));
      } catch (err) {
        console.error('Error deleting entry:', err);
        alert('Failed to delete entry. Please try again.');
      }
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getStatusStyles = (status) => {
    const styles = {
      'active': {
        icon: 'emergency_home',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-600',
        borderColor: 'border-orange-300',
        badgeBg: 'bg-orange-100',
        badgeBorder: 'border-orange-300',
        badgeText: 'text-orange-700'
      },
      'under_treatment': {
        icon: 'healing',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-300',
        badgeBg: 'bg-blue-100',
        badgeBorder: 'border-blue-300',
        badgeText: 'text-blue-700'
      },
      'chronic': {
        icon: 'heart_plus',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600',
        borderColor: 'border-purple-300',
        badgeBg: 'bg-purple-100',
        badgeBorder: 'border-purple-300',
        badgeText: 'text-purple-700'
      },
      'resolved': {
        icon: 'check_circle',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
        borderColor: 'border-green-300',
        badgeBg: 'bg-green-100',
        badgeBorder: 'border-green-300',
        badgeText: 'text-green-700'
      },
      'inactive': {
        icon: 'disabled_by_default',
        bgColor: 'bg-slate-200',
        textColor: 'text-slate-600',
        borderColor: 'border-slate-300',
        badgeBg: 'bg-slate-100',
        badgeBorder: 'border-slate-300',
        badgeText: 'text-slate-700'
      }
    };
    return styles[status] || styles['inactive'];
  };

  const getStatusLabel = (status) => {
    const labels = {
      'active': 'Active',
      'under_treatment': 'Under Treatment',
      'chronic': 'Chronic',
      'resolved': 'Resolved',
      'inactive': 'Inactive'
    };
    return labels[status] || status;
  };

  const getFilteredEntries = () => {
    let filtered = historyEntries;

    // Apply status filter
    if (statusFilter !== 'All') {
      const statusMap = {
        'Active': 'active',
        'Under Treatment': 'under_treatment',
        'Chronic': 'chronic',
        'Resolved': 'resolved',
        'Inactive': 'inactive'
      };
      const statusValue = statusMap[statusFilter] || statusFilter.toLowerCase();
      filtered = filtered.filter(entry => entry.status === statusValue);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.condition_name.toLowerCase().includes(query) ||
        entry.remarks.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  return (
    <DashboardLayout navigate={navigate} pageName="Medical History">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Medical History</h1>
            <p className="text-slate-600">Manage conditions, diagnoses, and your healthcare journey.</p>
          </div>
          <button 
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Add Medical Entry
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Stats / Overview Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm font-bold tracking-widest uppercase">analytics</span> 
                Summary
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Active Conditions</p>
                  <p className="text-2xl font-black text-orange-500">
                    {historyEntries.filter(e => ['active', 'under_treatment', 'chronic'].includes(e.status)).length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Total Records</p>
                  <p className="text-2xl font-black text-blue-500">{historyEntries.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm font-bold tracking-widest uppercase">filter_alt</span> 
                Status Filter
              </h3>
              <div className="space-y-2">
                {['All', 'Active', 'Under Treatment', 'Chronic', 'Resolved', 'Inactive'].map((filter) => (
                  <button 
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all font-medium flex items-center justify-between ${
                      statusFilter === filter
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    {filter}
                    <span className="material-symbols-outlined text-sm">{statusFilter === filter ? 'check_circle' : 'chevron_right'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline of Records */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-center">
                <span className="text-slate-500">Loading medical history...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-red-700">
                {error}
              </div>
            ) : (
              <>
                <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">search</span>
                      <h3 className="font-bold text-slate-900">Search</h3>
                    </div>
                    <button
                      onClick={() => generateAllMedicalRecordsPDF(historyEntries, patientData)}
                      disabled={historyEntries.length === 0}
                      className="py-2 px-4 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      Download All
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by condition..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">Search in condition names and remarks</p>
                </div>

                {getFilteredEntries().length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 display-block mb-4">search_off</span>
                    <h3 className="font-bold text-slate-900 text-lg mb-2">No records found</h3>
                    <p className="text-slate-600 text-sm mb-6">
                      {searchQuery.trim() || statusFilter !== 'All' 
                        ? 'Try adjusting your search or filter criteria' 
                        : 'No medical history records yet'}
                    </p>
                    {(searchQuery.trim() || statusFilter !== 'All') && (
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('All');
                        }}
                        className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {getFilteredEntries().map((entry) => (
                      <div key={entry.history_id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-slate-300 transition-all group">
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className={`size-12 rounded-xl flex items-center justify-center ${getStatusStyles(entry.status).bgColor} ${getStatusStyles(entry.status).textColor} border ${getStatusStyles(entry.status).borderColor}`}>
                            <span className="material-symbols-outlined text-2xl">
                              {getStatusStyles(entry.status).icon}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-bold text-slate-900 text-lg">{entry.condition_name}</h4>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(entry.status).badgeBorder} ${getStatusStyles(entry.status).badgeText} ${getStatusStyles(entry.status).badgeBg}`}>
                                {getStatusLabel(entry.status)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                              <span className="material-symbols-outlined text-xs">calendar_today</span>
                              Diagnosed on: {new Date(entry.diagnosed_on).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            
                            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm leading-relaxed">
                              <p className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs">notes</span> Doctor Remarks
                              </p>
                              {entry.remarks}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 shrink-0">
                          <button 
                            onClick={() => generateMedicalRecordPDF(entry, patientData)}
                            className="flex-1 md:w-28 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-xs">download</span> Download
                          </button>
                          <button 
                            onClick={() => handleOpenModal(entry)}
                            className="flex-1 md:w-28 py-2 bg-slate-200 text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-xs">edit</span> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteEntry(entry.history_id)}
                            className="flex-1 md:w-28 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-xs">delete</span> Remove
                          </button>
                        </div>
                      </div>
                  </div>
                </div>
              ))}
              </div>
            )}
            </>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{editingId ? 'Edit Medical History Entry' : 'Add Medical History Entry'}</h3>
              <button onClick={handleCloseModal} className="text-slate-500 hover:text-slate-700"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">CONDITION / DIAGNOSIS NAME *</label>
                <input 
                  required
                  name="condition_name"
                  value={formData.condition_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Type 2 Diabetes"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">DIAGNOSED ON *</label>
                  <input 
                    type="date"
                    required
                    name="diagnosed_on"
                    value={formData.diagnosed_on}
                    onChange={handleInputChange}
                    max={getTodayDate()}
                    disabled={!!editingId}
                    className={`w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all ${editingId ? 'bg-slate-50 opacity-70 cursor-not-allowed' : ''}`}
                  />
                  {!editingId && <p className="text-xs text-slate-500 mt-1">Cannot select future dates</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">STATUS *</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="under_treatment">Under Treatment</option>
                    <option value="chronic">Chronic</option>
                    <option value="resolved">Resolved</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">MEDICAL REMARKS / NOTES (Optional)</label>
                <textarea 
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all">Cancel</button>
                <button type="submit" className="flex-[2] py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">{editingId ? 'Update Entry' : 'Add Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

