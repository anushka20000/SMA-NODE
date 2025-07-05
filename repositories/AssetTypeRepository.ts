import { Asset } from "../models/Asset";
import { AssetCategory } from "../models/AssetCategory";
import { AssetType } from "../models/AssetType";
import { User } from "../models/User";
import jwt from "jsonwebtoken";
const { Op } = require("sequelize");

class AssetTypeRepository {
  //GET
  async list(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        let data;
        if (req.body.categoryId) {
          data = await AssetType.findAll({
            attributes: ["id", "name"],
            where:
              req.body.projectType == 1
                ? { asset_category_id: req.body.categoryId, ifp: 1 }
                : { asset_category_id: req.body.categoryId, kyan: 1 },
          });
        } else {
          data = await AssetType.findAll({ attributes: ["id", "name"] });
        }
        return data;
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async listCategories(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        const data: any = await AssetCategory.findAll({
          attributes: ["id", "name"],
         
        });
        
        return data;
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async store(req: any) {
    let post = req.body;

    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      try {
        const res = await AssetType.create(post);

        return { res };
      } catch (e: any) {
        return { error: e };
      }
    }
  }

  async update(req: any) {
    let user;
    let decodedToken: any;

    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      // const assetId: any = await AssetType.findOne({where: {id: req.body.id, deletedAt: ''}})
      try {
        await AssetType.update(
          {
            name: req.body.name,
          },
          { where: { id: req.body.id } }
        );
      } catch (e: any) {
        return { error: e };
      }
    }
  }
  async getById(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        const res = await AssetType.findOne({ where: { id: req.body.id } });
        return res;
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async delete(req: any) {
    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const val = await AssetType.findOne({ where: { id: req.params.id } });

      if (!val) {
        throw new Error("id not found");
      } else {
        try {
          const res = await AssetType.destroy({ where: { id: req.params.id } });
          return { res };
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }
}

export { AssetTypeRepository };
