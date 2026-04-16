import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class PrescriptionSnapshot extends Model {}

PrescriptionSnapshot.init({
  prescription_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  doctor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  diagnosis: {
    type: DataTypes.TEXT
  },
  medication: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  dosage: {
    type: DataTypes.TEXT
  },
  frequency: {
    type: DataTypes.TEXT
  },
  duration: {
    type: DataTypes.TEXT
  },
  instructions: {
    type: DataTypes.TEXT
  },
  issued_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'PrescriptionSnapshot',
  tableName: 'prescriptions_snapshot',
  underscored: true,
  timestamps: true
});

export default PrescriptionSnapshot;
