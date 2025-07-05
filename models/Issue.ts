import { DataTypes, Model } from 'sequelize';
import db from '../config/db';
import { Grievance } from './Grievance';

export interface IssueMembers {
  id: bigint;
  asset_type_id: bigint;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Issue extends Model<IssueMembers>{
 //
}

Issue.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    asset_type_id: {
      type: DataTypes.BIGINT,
      defaultValue: null
    },
    description: {
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
    tableName: "issues",
  }

)
Grievance.belongsTo(Issue, { foreignKey: 'issue_id' })

Issue.hasMany(Grievance, { foreignKey: "issue_id" })





