import { Asset } from "../models/Asset";
import { AssetType } from "../models/AssetType";
import { Issue } from "../models/Issue";
import { User } from "../models/User";
import jwt from "jsonwebtoken";
const { Op } = require("sequelize");

class IssueRepository {
   //GET
   async list(req: any) {
    try {
      let user;
      let decodedToken: any;
      const mobile = req.query.mobile === 'true';

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user){
        let data;
        if(mobile){
          data = await Asset.findAll({where: {id: req.params.id}, include:[{model: AssetType, include: [{model: Issue, attributes: ['id','description']}]}]});
        }else{
           data = await Issue.findAll({where: {asset_type_id: req.params.id}, attributes: ['id', 'description']});
        }

        return (data.length!= 0 ? data : "no issues found") ;
        
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

          const res = await Issue.create(post);
       
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
      // const IssueId: any = await Issue.findOne({where: {id: req.body.id, deletedAt: ''}})
        try {
          await Issue.update(
            {
              asset_type_id: req.body.asset_type_id,
              description: req.body.description
            },
            { where: { id: req.body.id} }
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
      if (user){
      const res = await Issue.findOne({ where: { id: req.body.id } });
      return  res ;
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
    const val = await Issue.findOne({ where: { id: req.params.id } });

    if (!val) {
      throw new Error("id not found");
    } else{
      try {
        const res = await Issue.destroy({ where: {id: req.params.id } });
        return { res };
      } catch (e: any) {
        return { error: e };
      }
    }
  }
  }
}

export { IssueRepository };
