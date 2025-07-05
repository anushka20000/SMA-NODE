import { DataTypes, Model } from 'sequelize';
import db from '../config/db';
import { School } from './School';

export interface DistrictMembers {
  id: bigint;
  name: string;
  state: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class District extends Model<DistrictMembers>{
 //
}

District.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
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
    tableName: "districts",
  }

)
School.belongsTo(District, { foreignKey: "district_id" });

District.hasMany(School, { foreignKey: "district_id" });









