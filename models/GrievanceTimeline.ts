import { DataTypes, Model } from 'sequelize';
import db from '../config/db';

export interface GrievanceTimelineMembers {
  id: bigint;
  grievance_id: bigint;
  to: bigint;
  by: bigint;
  description: string;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class GrievanceTimeline extends Model<GrievanceTimelineMembers>{
 //
}

GrievanceTimeline.init(
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
    to: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    by: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    status: {
      type: DataTypes.TINYINT,
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
    tableName: "grievance_timeline",
  }

)









