import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Notification extends Model {}

Notification.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  recipient_user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  channel: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['email', 'sms', 'in-app', 'push']]
    }
  },
  template_code: {
    type: DataTypes.STRING
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payload_json: {
    type: DataTypes.JSONB
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'PENDING'
  },
  priority: {
    type: DataTypes.STRING(10),
    defaultValue: 'normal'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  underscored: true,
  timestamps: true
});

export default Notification;