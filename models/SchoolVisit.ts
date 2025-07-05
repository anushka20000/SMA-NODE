import { DataTypes, Model } from 'sequelize';
import db from '../config/db';
import { Attendance } from './Attendance';

export interface SchoolVisitMembers {
  id: bigint;
  school_id: bigint;
  grievance_id: bigint;
  service_engineer: bigint;
  arrival: string;
  departure: string;
  status : number;
  date: Date;
  visited_date: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class SchoolVisit extends Model<SchoolVisitMembers>{
 //
}

SchoolVisit.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    grievance_id: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    school_id: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    service_engineer: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    arrival: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    departure: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: null
    },
    
    date: {
      type: DataTypes.DATEONLY,
      defaultValue: null
    },
    visited_date: {
      type: DataTypes.DATE,
      defaultValue: null
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
    tableName: "school_visits",
  }

)

Attendance.belongsTo(SchoolVisit, { foreignKey: 'visit_id' })
  
SchoolVisit.hasMany(Attendance, { foreignKey: "visit_id" })








