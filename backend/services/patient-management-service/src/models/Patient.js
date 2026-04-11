import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Patient extends Model {}

Patient.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  full_name: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.first_name} ${this.last_name}`;
    },
    set(value) {
      throw new Error('Do not try to set the `full_name` value!');
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  blood_group: {
    type: DataTypes.STRING
  },
  allergies: {
    type: DataTypes.TEXT
  },
  emergency_contact_name: {
    type: DataTypes.STRING
  },
  emergency_contact_phone: {
    type: DataTypes.STRING
  },
  profile_image: {
    type: DataTypes.TEXT('long'), // Using TEXT('long') to support Base64 strings for now, can be changed to STRING for URL later
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Patient',
  tableName: 'patients',
  underscored: true,
  timestamps: true
});

export default Patient;