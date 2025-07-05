import { DataTypes, Model } from 'sequelize';
import db from '../config/db';
import { Asset } from './Asset';
import { Issue } from './Issue';


export interface AssetTypeMembers {
  id: bigint;
  asset_category_id: bigint;
  name: string;
  ifp: number;
  kyan: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class AssetType extends Model<AssetTypeMembers>{
 //
}

AssetType.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    asset_category_id: {
      type: DataTypes.BIGINT,
      // defaultValue: null
    },
    name: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    ifp: {
      type: DataTypes.TINYINT,
      defaultValue: null
    },
    kyan: {
      type: DataTypes.TINYINT,
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
    tableName: "asset_types",
  }

)
Asset.belongsTo(AssetType, { foreignKey: 'asset_type_id' })
Issue.belongsTo(AssetType, { foreignKey: 'asset_type_id' })

AssetType.hasMany(Asset, { foreignKey: "asset_type_id" })
AssetType.hasMany(Issue, { foreignKey: "asset_type_id" })






