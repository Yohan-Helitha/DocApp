import Patient from './Patient.js';
import MedicalReport from './MedicalReport.js';
import MedicalHistoryEntry from './MedicalHistoryEntry.js';
import PrescriptionSnapshot from './PrescriptionSnapshot.js';

// Relationships
Patient.hasMany(MedicalReport, { foreignKey: 'patient_id', as: 'medicalReports' });
MedicalReport.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Patient.hasMany(MedicalHistoryEntry, { foreignKey: 'patient_id', as: 'medicalHistory' });
MedicalHistoryEntry.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Patient.hasMany(PrescriptionSnapshot, { foreignKey: 'patient_id', as: 'prescriptions' });
PrescriptionSnapshot.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

export { Patient, MedicalReport, MedicalHistoryEntry, PrescriptionSnapshot };