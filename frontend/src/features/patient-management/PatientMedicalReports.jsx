import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function PatientMedicalReports({ navigate }) {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('all');

  const [uploadForm, setUploadForm] = useState({
    file: null,
    file_type: 'other',
    notes: ''
  });

  const patientId = localStorage.getItem('patientId');
  const token = sessionStorage.getItem('accessToken');

  useEffect(() => {
    if (patientId && token) {
      fetchReports();
    }
  }, [patientId, token]);

  useEffect(() => {
    applyFilters();
  }, [reports, searchQuery, selectedFileType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-reports`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.reports || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load medical reports');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (selectedFileType !== 'all') {
      filtered = filtered.filter(r => r.file_type === selectedFileType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.file_type.toLowerCase().includes(query) ||
        (r.notes && r.notes.toLowerCase().includes(query))
      );
    }

    setFilteredReports(filtered);
  };

  const handleFileChange = (e) => {
    setUploadForm({ ...uploadForm, file: e.target.files[0] });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      alert('Please select a file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('file_type', uploadForm.file_type);
      if (uploadForm.notes) {
        formData.append('notes', uploadForm.notes);
      }

      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-reports`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
      );

      if (!response.ok) throw new Error('Failed to upload report');

      setUploadForm({ file: null, file_type: 'other', notes: '' });
      setShowUploadModal(false);
      fetchReports();
    } catch (err) {
      console.error('Error uploading report:', err);
      alert('Failed to upload report');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-reports/${reportId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to delete report');
      fetchReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Failed to delete report');
    }
  };

  const handleUpdateReport = async (reportId) => {
    try {
      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-reports/${reportId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: editingNotes })
        }
      );

      if (!response.ok) throw new Error('Failed to update report');
      setEditingReportId(null);
      setEditingNotes('');
      fetchReports();
    } catch (err) {
      console.error('Error updating report:', err);
      alert('Failed to update report');
    }
  };

  const getFileTypeIcon = (fileType) => {
    const iconMap = {
      'lab_result': 'science',
      'scan': 'image',
      'blood_work': 'bloodtype',
      'xray': 'radiology',
      'ultrasound': 'settings_remote',
      'other': 'description'
    };
    return iconMap[fileType] || 'description';
  };

  const getFileTypeColor = (fileType) => {
    const colorMap = {
      'lab_result': 'bg-blue-100 text-blue-700',
      'scan': 'bg-purple-100 text-purple-700',
      'blood_work': 'bg-red-100 text-red-700',
      'xray': 'bg-yellow-100 text-yellow-700',
      'ultrasound': 'bg-green-100 text-green-700',
      'other': 'bg-slate-200 text-slate-700'
    };
    return colorMap[fileType] || colorMap['other'];
  };

  return (
    <DashboardLayout navigate={navigate} pageName="Medical Reports">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Medical Reports</h1>
            <p className="text-slate-600">Upload and manage your medical documents and reports.</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">upload</span>
            Upload Report
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-primary hover:bg-primary/90 transition-colors rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">description</span> Total Reports
              </h3>
              <p className="text-4xl font-black mb-1">{reports.length}</p>
              <p className="text-sm opacity-80">Medical documents uploaded</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">filter_list</span> File Type
              </h3>
              <div className="space-y-2">
                {['all', 'lab_result', 'scan', 'blood_work', 'xray', 'ultrasound', 'other'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedFileType(type)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      selectedFileType === type
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'all' ? 'All Types' : type.replace('_', ' ')} ({reports.filter(r => type === 'all' || r.file_type === type).length})
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Report Types</h3>
              <p className="text-xs text-slate-500 mb-4 font-black uppercase tracking-wider">Supported Formats</p>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Lab Results</p>
                <p>• Medical Scans</p>
                <p>• X-Rays</p>
                <p>• Blood Work</p>
                <p>• Ultrasound</p>
                <p>• Other Documents</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">search</span>
                  <h3 className="font-bold text-slate-900">Search</h3>
                </div>
              </div>
              <input
                type="text"
                placeholder="Search by report type or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">Search in report types and notes</p>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-center">
                <span className="text-slate-500">Loading reports...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-red-700">
                {error}
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="flex justify-center mb-4">
                  <span className="material-symbols-outlined text-5xl text-slate-300">description</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">No reports yet</h3>
                <p className="text-slate-500 mb-6">Start by uploading your first medical report</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">upload</span>
                  Upload Now
                </button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="flex justify-center mb-4">
                  <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">No matching reports</h3>
                <p className="text-slate-500 mb-6">Try adjusting your search or filter criteria</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedFileType('all'); }}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div key={report.report_id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className={`size-12 rounded-xl flex items-center justify-center ${getFileTypeColor(report.file_type)}`}>
                              <span className="material-symbols-outlined text-2xl">{getFileTypeIcon(report.file_type)}</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900 text-lg capitalize mb-1">
                                {report.file_type.replace('_', ' ')}
                              </h4>
                              <p className="text-sm text-slate-500 font-medium mb-3">
                                Uploaded on {new Date(report.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>

                              {editingReportId === report.report_id ? (
                                <div className="mt-4 space-y-2">
                                  <textarea
                                    value={editingNotes}
                                    onChange={(e) => setEditingNotes(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                    rows="3"
                                    placeholder="Add notes..."
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleUpdateReport(report.report_id)}
                                      className="px-3 py-1 bg-primary text-white rounded text-sm font-bold hover:bg-primary/90"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingReportId(null)}
                                      className="px-3 py-1 border border-slate-300 text-slate-600 rounded text-sm font-bold hover:bg-slate-100"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {report.notes && (
                                    <p className="text-sm text-slate-600 italic">
                                      {report.notes}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[100px]">
                          <a
                            href={report.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors text-center"
                          >
                            Download
                          </a>
                          <button
                            onClick={() => {
                              setEditingReportId(report.report_id);
                              setEditingNotes(report.notes || '');
                            }}
                            className="w-full py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.report_id)}
                            className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Upload Medical Report</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">File Type</label>
                <select
                  value={uploadForm.file_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, file_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  <option value="lab_result">Lab Result</option>
                  <option value="scan">Medical Scan</option>
                  <option value="blood_work">Blood Work</option>
                  <option value="xray">X-Ray</option>
                  <option value="ultrasound">Ultrasound</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Select File</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <p className="text-xs text-slate-500 mt-1">Supported: PDF, JPG, PNG, DOC, DOCX</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Notes (Optional)</label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  rows="3"
                  placeholder="Add any relevant notes about this report..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
