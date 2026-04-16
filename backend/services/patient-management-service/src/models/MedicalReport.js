import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class MedicalReport extends Model {}

MedicalReport.init({
  report_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  report_name: {
    type: DataTypes.STRING
  },
  file_url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  file_type: {
    type: DataTypes.STRING
  },
  file_size: {
    type: DataTypes.INTEGER
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  uploaded_by: {
    type: DataTypes.INTEGER
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  sequelize,
  modelName: 'MedicalReport',
  tableName: 'medical_reports',
  underscored: true,
  timestamps: true
});

export default MedicalReport;