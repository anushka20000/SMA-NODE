import { where } from "sequelize";
import { Asset } from "../models/Asset";
import { User } from "../models/User";
import jwt from "jsonwebtoken";
import { School } from "../models/School";
import { Grievance } from "../models/Grievance";
const { Op } = require("sequelize");

class AssetRepository {
  //GET
  async list(req: any) {
    try {
      let user;
      let decodedToken: any;
      let data;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        if (req.body.school_id && req.body.asset_type_id) {
          // console.log(req.body.asset_type_id)
          data = await Asset.findAll({where: {school_id: {[Op.eq] : null}, asset_type_id: req.body.asset_type_id}});
        } 
        // if (req.body.school_id) {
        //   console.log(req.body)
        //   data = await Asset.findAll({where: {school_id: {[Op.and]:{[Op.eq] : null, [Op.eq]: req.body.school_id}}}});
        // } 
        else {
          // console.log(user)
          data = await Asset.findAll();
        }
        return  data ;
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async store(req: any) {
    let post = req.body;
    let data;
    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      try {
        if(post.school_id != null){
          data = await Asset.update({
            school_id: post.school_id
          },{where: {id: post.id}});
        }else{
          data = await Asset.create(post);
        }
        return data;
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
      // const assetId: any = await Asset.findOne({where: {id: req.body.id, deletedAt: ''}})
      try {
        await Asset.update(
          {
            asset_type_id: req.body.asset_type_id,
            model: req.body.model,
            serial_no: req.body.serial_no,
            added_on: req.body.added_on,
            image: req.body.image,
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
        const res = await Asset.findOne({ where: { id: req.body.id } });
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
    if (user.dataValues.user_type == 1) {
      const val:any = await Asset.findOne({ where: { id: req.params.id }, include: [{model: School, attributes: ['id']},{model: Grievance, attributes: ['id']}]});

      if (!val) {
        throw new Error("id not found");
      } else {
        try {
          if(!(val.dataValues.School == null)){
            const obj:any = {school_id : null}
            await Asset.update(obj,{ where: { id: req.params.id } });
            if(val.dataValues.Grievances.length > 0){
              val.dataValues.Grievances.map((async (data) =>{
                await Grievance.destroy({where: {id: data.id}})
              }))
            }
          }
          const res = await Asset.destroy({ where: { id: req.params.id } });
          return { res };
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }

  async removeAssetFromSchool(req: any) {
    let user;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user.dataValues.user_type == 1) {
      const val:any = await Asset.findOne({ where: { id: req.params.id }, include: [{model: School, attributes: ['id']},{model: Grievance, attributes: ['id']}]});
      if (!val) {
        throw new Error("id not found");
      } else {
        try {
          if(!(val.dataValues.School == null)){
            const obj:any = {school_id : null}
            const res = await Asset.update(obj,{ where: { id: req.params.id } });
            if(val.dataValues.Grievances.length > 0){
              val.dataValues.Grievances.map((async (data) =>{
                await Grievance.destroy({where: {id: data.id}})
              }))
            }
            return { res };
          }
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }
}

export { AssetRepository };
