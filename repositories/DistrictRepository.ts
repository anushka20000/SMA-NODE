import { School } from "../models/School";
import { District } from "../models/District";
const { Op } = require("sequelize");

class DistrictRepository {
  async getAll() {
    try {
      
        const data = await District.findAll({order: [['name', 'ASC']]});
        return data;
      
    } catch (e: any) {
      return { error: e };
    }
  }

 
}

export { DistrictRepository };
