import { DataTypes, Model } from 'sequelize';
import db from '../config/db';
import { Device } from './Device';

export interface ConnectionStatusAttributes {
    id: bigint;
    device_id: bigint;
    duration_in_seconds: number;
    availability_status: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }
  
  export class ConnectionStatus extends Model<ConnectionStatusAttributes> {}
  
  ConnectionStatus.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      device_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: Device,
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      duration_in_seconds: {
        type: DataTypes.INTEGER
      },
      availability_status: {
        type: DataTypes.TINYINT,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: db.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: db.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: DataTypes.DATE,
        defaultValue: null
      }
    },
    {
      timestamps: true,
      paranoid: true,
      sequelize: db,
      tableName: "connection_status",
    }
  );
  
  Device.hasMany(ConnectionStatus, { foreignKey: "device_id" });
  ConnectionStatus.belongsTo(Device, { foreignKey: "device_id" });