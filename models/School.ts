import { DataTypes, Model } from "sequelize";
import db from "../config/db";
import { User } from "./User";
import { Grievance } from "./Grievance";
import { Asset } from "./Asset";
import { SchoolVisit } from "./SchoolVisit";

export interface SchoolMembers {
  id: bigint;
  school_type: number;
  kyan: number;
  ifp: number;
  block: string;
  name: string;
  code: string;
  UDISE_code: string;
  schoolnet_code: string;
  master_name: string;
  master_number: string;
  contact_person: string;
  contact_person_number: string;
  contact_person_designation: string;
  service_engineer: bigint;
  address: string;
  pincode: string;
  district: string;
  district_id: bigint;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class School extends Model<SchoolMembers> {
  //
}

School.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    school_type: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
    },
    name: {
      type: DataTypes.STRING,
    },
    block: {
      type: DataTypes.STRING,
    },
    code: {
      type: DataTypes.STRING,
    },
    UDISE_code: {
      type: DataTypes.STRING,
    },
    schoolnet_code: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    master_name: {
      type: DataTypes.STRING,
    },
    master_number: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    contact_person: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    contact_person_designation: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    contact_person_number: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    service_engineer: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    pincode: {
      type: DataTypes.STRING,
    },
    district: {
      type: DataTypes.STRING,
    },
    district_id: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    kyan: {
      type: DataTypes.TINYINT,
    },
    ifp: {
      type: DataTypes.TINYINT,
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
    tableName: "schools",
  }
);

Grievance.belongsTo(School, { foreignKey: 'school_id' })
Asset.belongsTo(School, { foreignKey: 'school_id' })
SchoolVisit.belongsTo(School, { foreignKey: 'school_id' })

School.hasMany(SchoolVisit, { foreignKey: "school_id" })
School.hasMany(Asset, { foreignKey: "school_id" })
School.hasMany(Grievance, { foreignKey: "school_id" })

if (User) {
  User.belongsTo(School, { foreignKey: 'school_id'});
  School.hasMany(User, { foreignKey: 'school_id'});
}

