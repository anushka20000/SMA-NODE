import { RequestHandler } from "express";
import Express, { Request, Response } from "express";
import { SchoolVisitRepository } from "../repositories/SchoolVisitRepository";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { School } from "../models/School";
import { SchoolVisit, SchoolVisitMembers } from "../models/SchoolVisit";
import { Attendance } from "../models/Attendance";
import { Grievance } from "../models/Grievance";
import { Asset } from "../models/Asset";
import { AssetType } from "../models/AssetType";
import moment from "moment";
import { literal } from "sequelize";
import { DistrictRepository } from "../repositories/DistrictRepository";
import { DistrictMembers } from "../models/District";
const parse = require("csv-parser");
const fs = require("fs");
const repo = new DistrictRepository();
export const getDistricts: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.getAll();
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const exportDistrict: RequestHandler = async (req, res, next) => {
  try {
    // const filePath = "./i";
    fs.createReadStream("./import/districts.csv")
      .pipe(
        parse({
          delimiter: ",",
          headers: ['id','name','state'],
        })
      )
      .on("data", async (row: any) => {
        const {id, name, state}: DistrictMembers = row;

          const schoolArray: any = await School.findAll({where: {district_id: {[Op.eq]: null},district: {[Op.ne]: null}, deletedAt: {[Op.eq]: null}}})
    if(schoolArray.length > 0) {
      console.log(schoolArray.length)
      schoolArray.map(async(data:any) =>{
        console.log(data.dataValues?.district)

        if(data.dataValues?.district == name){
          // console.log(name)
          await School.update({district_id: id},{where: {id: data.dataValues?.id}})
        }
      })
    }
      
      
      })
      .on("end", () => {
        console.log("CSV file successfully processed.");
        
      });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
