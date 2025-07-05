import { DataTypes, Model } from "sequelize";
import db from "../config/db";
import { School } from "./School";
import { Grievance } from "./Grievance";
import { GrievanceTimeline } from "./GrievanceTimeline";
import { SchoolVisit } from "./SchoolVisit";

export interface UserMember {
  id: bigint;
  school_id: bigint; //
  user_name: string; //
  password: string;
  phone: string; //
  email: string; //
  role: string;
  address: string;
  user_type: number;
  gender: string;
  district: string;
  project: number;
  otp: string;
  profile_picture: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class User extends Model<UserMember> {
  //
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    school_id: {
      type: DataTypes.BIGINT,
      defaultValue: null,
    },
    user_name: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
    },
    phone: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.STRING,
    },
    user_type: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
    },
    gender: {
      type: DataTypes.STRING,
    },
    district: {
      type: DataTypes.STRING,
    },
    project: {
      type: DataTypes.TINYINT,
    },
    otp: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    profile_picture: {
      type: DataTypes.STRING,
      defaultValue: null,
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
    tableName: "users",
  }
);

Grievance.belongsTo(User, {
  foreignKey: "service_engineer",
  as: "service_engineer_data",
});
GrievanceTimeline.belongsTo(User, { foreignKey: "to", as: "toUser" });
GrievanceTimeline.belongsTo(User, { foreignKey: "by", as: "byUser" });
Grievance.belongsTo(User, { foreignKey: "oem_id", as: "oemID" });
SchoolVisit.belongsTo(User, { foreignKey: "service_engineer" });

User.hasMany(Grievance, { foreignKey: "oem_id" });
User.hasMany(GrievanceTimeline, { foreignKey: "by" });
User.hasMany(GrievanceTimeline, { foreignKey: "to" });
User.hasMany(Grievance, { foreignKey: "service_engineer" });
User.hasMany(SchoolVisit, { foreignKey: "service_engineer" });
School.belongsTo(User, { foreignKey: "service_engineer" });
User.hasMany(School, { foreignKey: "service_engineer" });
