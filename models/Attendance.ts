import { DataTypes, Model } from 'sequelize';
import db from '../config/db';

export interface AttendanceMembers {
  id: bigint;
  visit_id: bigint;
  check_in: string;
  check_out: string;
  feedback: string;
  status : number;
  verification_method: number;
  sign: string;
  file: string;
  photo:string;
  lat: string;
  long: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Attendance extends Model<AttendanceMembers>{
 //
}

Attendance.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    visit_id: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    check_in: {
      type: DataTypes.TIME,
      defaultValue: null
    },
    check_out: {
      type: DataTypes.TIME,
      defaultValue: null
    },
    feedback: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    sign: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    },
    verification_method: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    },
    file: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    photo: {
          type: DataTypes.STRING,
          defaultValue: null
    },
    lat:{
      type: DataTypes.STRING,
    
    },
    long:{
      type: DataTypes.STRING,
   
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
    tableName: "attendances",
  }

)








