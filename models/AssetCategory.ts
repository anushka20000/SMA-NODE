import { DataTypes, Model } from 'sequelize';
import db from '../config/db';
import { Asset } from './Asset';
import { Issue } from './Issue';
import { AssetType } from './AssetType';


export interface AssetCategoryMembers {
  id: bigint;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class AssetCategory extends Model<AssetCategoryMembers>{
 //
}

AssetCategory.init(
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
    tableName: "asset_categories",
  }

)
AssetType.belongsTo(AssetCategory, { foreignKey: 'asset_category_id' })

AssetCategory.hasMany(AssetType, { foreignKey: "asset_category_id" })







