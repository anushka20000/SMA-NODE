import { DataTypes, Model } from 'sequelize';
import db from '../config/db';
import { Grievance } from './Grievance';

export interface AssetMembers {
  id: bigint;
  school_id: bigint;
  asset_type_id: bigint;
  added_on: Date;
  model: string;
  serial_no: string;
  image: string;
  warrenty: string;
  electrification: number;
  installation_date: Date;
  project:number;
  date: Date;
  type:number;
  start:Date;
  end:Date;
  last_seen:Date;
  total_hours:number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Asset extends Model<AssetMembers>{
 //
}

Asset.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    school_id: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    asset_type_id: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    added_on: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: db.literal('CURRENT_TIMESTAMP')
    },
    model: {
      type: DataTypes.STRING,
    },
    serial_no: {
      type: DataTypes.STRING,
    },
    image: {
      type: DataTypes.STRING,
    },
    warrenty: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    installation_date: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    electrification: {
      type: DataTypes.TINYINT,
      defaultValue: null
    },
    project: {
      type: DataTypes.TINYINT,
      defaultValue: null
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    start: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    end: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    type: {
      type: DataTypes.TINYINT,
      defaultValue: null
    },
    last_seen: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    total_hours: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    tableName: "assets",
  }

)


Grievance.belongsTo(Asset, { foreignKey: 'asset_id' })

Asset.hasMany(Grievance, { foreignKey: "asset_id" })







