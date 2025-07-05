import { DataTypes, Model } from "sequelize";
import db from "../config/db";
import { GrievanceTimeline } from "./GrievanceTimeline";
import { SchoolVisit } from "./SchoolVisit";

export interface GrievanceMembers {
  id: bigint;
  asset_id: bigint;
  school_id: bigint;
  issue_id: string;
  oem_id: bigint;
  code: string;
  support_type: number;
  name: string;
  description: string;
  file: string;
  service_engineer: bigint;
  status: number;
  visit_date: Date;
  raised_by: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Grievance extends Model<GrievanceMembers> {
  //
}

Grievance.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    asset_id: {
      type: DataTypes.BIGINT,
    },
    school_id: {
      type: DataTypes.BIGINT,
    },
    issue_id: {
      type: DataTypes.BIGINT,
    },
    oem_id: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    service_engineer: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    support_type: {
      type: DataTypes.TINYINT,
    },
    code: {
      type: DataTypes.STRING,
    },
    name: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    description: {
      type: DataTypes.TEXT,
    },
    file: {
      type: DataTypes.STRING,
    },
    raised_by: {
      type: DataTypes.STRING,
      defaultValue: null

    },
    visit_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: db.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: db.literal("CURRENT_TIMESTAMP"),
    },
    deletedAt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    sequelize: db,
    tableName: "grievances",
  }
);

GrievanceTimeline.belongsTo(Grievance, { foreignKey: 'grievance_id' })
SchoolVisit.belongsTo(Grievance, { foreignKey: 'grievance_id' })

Grievance.hasMany(SchoolVisit, { foreignKey: "grievance_id" })
Grievance.hasMany(GrievanceTimeline, { foreignKey: "grievance_id" })
