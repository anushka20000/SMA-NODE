import { DataTypes, Model } from 'sequelize';
import db from '../config/db';

export interface DeviceAttributes {
  id: bigint;
  school_name: string;
  serial_no: string;
  district: string;
  block: string;
  last_seen: Date;
  connection_status: number;
  hm_name: string;
  hm_number: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Device extends Model<DeviceAttributes> {}

Device.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    school_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    hm_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hm_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    serial_no: {
      type: DataTypes.STRING,
      allowNull: false
    },
    district: {
      type: DataTypes.STRING,
      allowNull: false
    },
    block: {
      type: DataTypes.STRING,
      // allowNull: false
    },
    last_seen: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    connection_status: {
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
    tableName: "devices",
  }
);
