import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class MedicalHistoryEntry extends Model {}

MedicalHistoryEntry.init({
  history_id: {
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
  condition_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  diagnosed_on: {
    type: DataTypes.DATEONLY
  },
  status: {
    type: DataTypes.ENUM(
    'active',
    'resolved',
    'chronic',
    'under_treatment',
    'inactive'
  ),
    defaultValue: 'active'
  },
  remarks: {
    type: DataTypes.TEXT
  }
}, {
  sequelize,
  modelName: 'MedicalHistoryEntry',
  tableName: 'medical_history_entries',
  underscored: true,
  timestamps: true
});

export default MedicalHistoryEntry;
