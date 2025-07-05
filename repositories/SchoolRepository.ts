import { School, SchoolMembers } from "../models/School";
import { User, UserMember } from "../models/User";
import jwt from "jsonwebtoken";
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
class SchoolRepository {
  //GET
  async list(req: any) {
    try {
      let user;
      let decodedToken: any;
      // console.log(req)
      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      // console.log(user)

      
      if (user) {
        if (user.dataValues.user_type == 3) {
          const data = await School.findAll({
            where: { id: user.dataValues.school_id, name: { [Op.ne]: "" } },
            attributes: [
              "id",
              "name",
              "service_engineer",
              "master_name",
              "master_number",
              "district",
              "address",
            ],
            order: [["name", "ASC"]],
            include: [{ model: User, attributes: ["id", "user_name"] }],
          });
          console.log(data);
          return data;
        }
         else {
          const data = await School.findAll({
            where: { name: { [Op.ne]: "" } },
            attributes: [
              "id",
              "name",
              "service_engineer",
              "master_name",
              "master_number",
              "district",
              "address",
              "block"
            ],
            order: [["name", "ASC"]],
            include: [{ model: User, attributes: ["id", "user_name"] }],
          });
          return data;
        }
      }
    } catch (e: any) {
      return { error: e };
    }
  }
  async fetchSchoolName(req: any) {
    try {
      let user;
      let decodedToken: any;

      if (req.headers.authorization) {
        const jwtString = req.headers.authorization.split(" ")[1];
        decodedToken = jwt.decode(jwtString);
        user = await User.findOne({ where: { id: decodedToken.id } });
      }
      if (user) {
        const data = await School.findOne({
          where: { id: req.params.id },
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
        const res = await School.create(post);
        await School.update(
          {
            name: post.name
              ?.toLowerCase()
              .replace(/(^|\s)\S/g, (match: any) => match.toUpperCase()),
            contact_person: req.body.contact_person
              ?.toLowerCase()
              .replace(/(^|\s)\S/g, (match: any) => match.toUpperCase()),
            master_name: req.body.master_name
              ?.toLowerCase()
              .replace(/(^|\s)\S/g, (match: any) => match.toUpperCase()),
          },
          { where: { id: res.dataValues.id } }
        );
        return { res };
      } catch (e: any) {
        return { error: e };
      }
    }
  }
  async storeSchoolUser(req: any) {
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
        const res: any = await School.findAll({
          where: { id: { [Op.gt]: 1616 } },
        });
        res.map(async (val: any) => {
          const salt = await bcrypt.genSalt(10);
          const pass = val.master_number;
          const hashedPassword = await bcrypt.hash(pass, salt);
          const obj: any = {
            school_id: val.id,
            user_name: val.master_name,
            email: val.name.replace(/ /g, "_") + "@gmail.com",
            phone: val.master_number,
            password: hashedPassword,
            user_type: 3,
            project: val.project,
          };
          console.log(obj);
          await User.create(obj);
        });
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
      try {
        await School.update(
          {
            school_type: req.body.school_type,
            name: req.body.name,
            code: req.body.code,
            UDISE_code: req.body.UDISE_code,
            contact_person: req.body.contact_person,
            contact_person_designation: req.body.contact_person_designation,
            contact_person_number: req.body.contact_person_number,
            master_name: req.body.master_name,
            master_number: req.body.master_number,
            address: req.body.address,
            pincode: req.body.pincode,
            service_engineer: req.body.service_engineer,
            district: req.body.district,
            ifp: (req.body.ifp == true || req.body.ifp == 1) ? 1 : 0,
            kyan: (req.body.kyan == true || req.body.kyan == 1) ? 1 : 0,


          },
          { where: { id: req.params.id} }
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
        const res = await School.findOne({ where: { id: req.params.id } , include: {model: User, attributes: ['id', 'user_name', "phone"]}});
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
      const val = await School.findOne({ where: { id: req.params.id } });
      if (!val) {
        throw new Error("id not found");
      } else {
        try {
          const res = await School.destroy({ where: { id: req.params.id } });
          return { res };
        } catch (e: any) {
          return { error: e };
        }
      }
    }
  }
}

export { SchoolRepository };
