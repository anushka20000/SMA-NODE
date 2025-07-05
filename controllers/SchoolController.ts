import { RequestHandler } from "express";
import { SchoolRepository } from "../repositories/SchoolRepository";
const { Op } = require("sequelize");
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { School } from "../models/School";
import { Asset } from "../models/Asset";
import moment from "moment";
import { Device, DeviceAttributes } from "../models/Device";
import { ConnectionStatus, ConnectionStatusAttributes } from "../models/DeviceConnectionStatus";
const axios = require("axios");
require("dotenv").config();
import cron from 'node-cron';
const apiKey = process.env.API_KEY;
const repo = new SchoolRepository();

export const getSchools: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.list(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const fetchSchoolName: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.fetchSchoolName(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const getSchoolById: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.getById(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(404)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const saveSchool: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.store(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const saveSchoolUser: RequestHandler = async (req, res, next) => {
  try {
    const data = await repo.storeSchoolUser(req);
    return res.json({ success: true, data: data });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not read data", e.message] });
  }
};
export const updateSchool: RequestHandler = async (req, res, next) => {
  try {
    await repo.update(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
export const destroySchool: RequestHandler = async (req, res, next) => {
  try {
    await repo.delete(req);
    return res.json({ success: true });
  } catch (e: any) {
    res
      .status(400)
      .json({ success: false, error: ["could not update data", e.message] });
  }
};
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// API 1: Device Availability
async function fetchDeviceAvailabilities() {
  const currentDate = moment(new Date()).format('YYYY-MM-DD');
  const apiUrl = 'https://api.scalefusion.com/api/v1/reports/device_availabilities.json?device_group_ids=149219&from_date='+currentDate + '&to_date='+currentDate;
  let page = 1;
  let hasMoreData = true;

  while (hasMoreData) {
    try {
      const params = { page };
      const response = await axios.get(apiUrl, {
        params,
        headers: {
          Authorization: `Token ${apiKey}`,
        },
        timeout: 20000,
      });

      const { devices, next_page } = response.data;
      console.log(`2 Fetched ${devices.length} devices from availability API.`);
      const deviceIdMap = new Map<number, number>();
  
      await Promise.all(
        devices.map(async (device: any) => {
          if (device.availability_status === 'active') {
            if (deviceIdMap.has(device.device_id)) {
              // If device_id exists, add the new duration to the existing one
              const existingDuration = deviceIdMap.get(device.device_id) || 0;
              const updatedDuration = existingDuration + device.duration_in_seconds;
              deviceIdMap.set(device.device_id, updatedDuration);
            } else {
              // If device_id doesn't exist, initialize the duration
              const duration = device.duration_in_seconds || 0;
              deviceIdMap.set(device.device_id, duration);
            }
          }
        })
      );
      const existingRecords = await ConnectionStatus.findAll({
        where: {
          createdAt: {
            [Op.gte]: new Date(`${currentDate}T00:00:00`),
            [Op.lt]: new Date(`${currentDate}T23:59:59`),
          },
        },
      });
    
      // Create a map of existing records for quick lookup
      const existingRecordsMap = new Map(
        existingRecords.map((record: any) => [record.device_id, record])
      );
    
      const updates = [];
      const inserts = [];
    
      for (const [device_id, duration_in_seconds] of deviceIdMap) {
        const existingRecord = existingRecordsMap.get(device_id);
        // console.log(existingRecord)
        if (existingRecord) {
          // Add to updates array
          updates.push({
            id: existingRecord.device_id,
            duration_in_seconds: existingRecord.duration_in_seconds + duration_in_seconds,
          });
        } else {
          // Add to inserts array
          inserts.push({
            device_id: device_id,
            availability_status: 1,
            duration_in_seconds: duration_in_seconds,
          });
        }
      }
    
      // Perform bulk updates
      if (updates.length > 0) {
        console.log(updates)
        await Promise.all(
          updates.map((update) =>
            ConnectionStatus.update(
              { duration_in_seconds: update.duration_in_seconds },
              { where: { id: update.id } }
            )
          )
        );
      }
    
      // Perform bulk inserts
      if (inserts.length > 0) {
        console.log(inserts)
        await ConnectionStatus.bulkCreate(inserts);
      }

      page = next_page;
      hasMoreData = !!page;
    } catch (error: any) {
      if (error.response?.status === 429) {
        const resetTime = error.response.headers['ratelimit-reset'];
        const currentTime = Math.floor(Date.now() / 1000);
        const waitTime = (resetTime - currentTime) * 1000;

        console.warn(`Rate limit exceeded. Retrying in ${waitTime / 1000} seconds...`);
        await delay(waitTime);
      } else {
        console.error('Error fetching device availabilities:', error.message);
        hasMoreData = false;
      }
    }
  }
}

// API 2: Device Details
async function fetchDeviceDetails() {
  const apiUrl = 'https://api.scalefusion.com/api/v2/devices.json?device_group_id=149219';
  let cursor = 1;
  let hasMoreData = true;

  while (hasMoreData) {
    try {
      const params = { cursor };
      const response = await axios.get(apiUrl, {
        params,
        headers: {
          Authorization: `Token ${apiKey}`,
        },
        timeout: 20000,
      });

      const { total_count, devices, next_cursor } = response.data;
      console.log(`1 Fetched ${devices.length} devices from details API.`);

      await Promise.all(
        devices.map(async (device: any) => {
          const existingDevice = await Device.findOne({ where: { id: device.device.id } });
          const data = {
            id: device.device.id,
            school_name: device.device.name,
            serial_no: device.device.serial_no,
            district: device.device.custom_properties[2]?.value == '' ? 'N/A': device.device.custom_properties[2]?.value,
            block: device.device.custom_properties[3]?.value,
            last_seen: device.device.last_seen_on,
            start: device.device.power_on_time,
            end: device.device.power_off_time,
            connection_status: device.device.connection_state === 'Active' ? 1 : 0,
            hm_name: device.device.custom_properties[1]?.value,
            hm_number: device.device.custom_properties[0]?.value,
          };
          const updateData = {
            // id: device.device.id,
            school_name: device.device.name,
            serial_no: device.device.serial_no,
            district: device.device.custom_properties[2]?.value == '' ? 'N/A': device.device.custom_properties[2]?.value,
            block: device.device.custom_properties[3]?.value,
            last_seen: device.device.last_seen_on,
            start: device.device.power_on_time,
            end: device.device.power_off_time,
            connection_status: device.device.connection_state === 'Active' ? 1 : 0,
            hm_name: device.device.custom_properties[1]?.value,
            hm_number: device.device.custom_properties[0]?.value,
          };
          if (existingDevice) {
            await Device.update(updateData, { where: { id: device.device.id } });
          } else {
            await Device.create(data);
          }
        })
      );

      cursor = next_cursor;
      hasMoreData = !!total_count;
    } catch (error: any) {
      if (error.response?.status === 429) {
        const resetTime = error.response.headers['ratelimit-reset'];
        const currentTime = Math.floor(Date.now() / 1000);
        const waitTime = (resetTime - currentTime) * 1000;

        console.warn(`Rate limit exceeded. Retrying in ${waitTime / 1000} seconds...`);
        await delay(waitTime);
      } else {
        console.error('Error fetching device details:', error.message);
        hasMoreData = false;
      }
    }
  }
}
export const getSchoolList: RequestHandler = async (req, res, next) => {
  // try {
  let user: any;
  let decodedToken: any;
  if (req.headers.authorization) {
    const jwtString = req.headers.authorization.split(" ")[1];
    decodedToken = jwt.decode(jwtString);
    user = await User.findOne({ where: { id: decodedToken.id } });
  }
  if (user && user.user_type != 2 && user.user_type != 4) {
    // console.log(user);
    const draw = req.body.draw;
    const start = parseInt(req.body.start as string, 10) || 0;
    const length = parseInt(req.body.length as string, 10) || 10;
    const searchValue = (req.body.search as any)?.value || "";

    // For ordering (sorting)
    const orderColumnIndex = (req.body.order as any)?.[0]?.column;
    const orderDir = (req.body.order as any)?.[0]?.dir || "desc";
    const orderColumnName =
    (req.body.columns as any)?.[orderColumnIndex]?.data || "id";
    // console.log()
    // Search logic
    let searchCondition = {};
    if (searchValue) {
      searchCondition = {
        [Op.or]: [
          { name: { [Op.like]: `%${searchValue}%` } },
          { UDISE_code: { [Op.like]: `${searchValue}%` } },
          { master_name: { [Op.like]: `%${searchValue}%` } },
          { master_number: { [Op.like]: `%${searchValue}%` } },
          { contact_person: { [Op.like]: `%${searchValue}%` } },
          { contact_person_number: { [Op.like]: `%${searchValue}%` } },
        ],
      };
    }

    // Fetching the users with pagination, search, and sort
    if (user.user_type == 3) {
      let outerSearchResults = await School.findAll({
        attributes: [
          "id",
          "name",
          "UDISE_code",
          "master_name",
          "contact_person",
          "contact_person_number",
        ],
        where:
          searchValue !== null
            ? {
                [Op.or]: {
                  name: { [Op.like]: `%${searchValue}%` },
                  UDISE_code: { [Op.like]: `%${searchValue}%` },
                  master_name: { [Op.like]: `%${searchValue}%` },
                  contact_person: { [Op.like]: `%${searchValue}%` },
                  contact_person_number: { [Op.like]: `%${searchValue}%` },
                },
              }
            : {},
      });

      let outerSearchCondition =
        outerSearchResults.length > 0 ? { [Op.not]: null } : null;
      const { count, rows } = await School.findAndCountAll({
        include: [
          {
            model: User,
            required: false,
            attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
            order: [["user_name", orderDir]],
          },
        ],

        where:
          req.body.project == 1 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { ifp: 1, id: user.school_id },
              ]
            : req.body.project == 2 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1, id: user.school_id },
              ]
            : req.body.project == 3 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1, ifp: 1 },
                { id: user.school_id },
              ]
            : req.body.project == 1
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                  ifp: 1,
                  id: user.school_id,
                },
              ]
            : req.body.project == 2
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                  kyan: 1,
                  id: user.school_id,
                },
              ]
            : req.body.project == 3
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                  kyan: 1,
                  ifp: 1,
                  id: user.school_id,
                },
              ]
            : outerSearchCondition != null
            ? { ...searchCondition, id: user.school_id }
            : [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                  id: user.school_id,
                },
              ],
        order: [[orderColumnName, orderDir]],
        offset: start,
        limit: length,
      });
      const data = rows.map((data: any) => ({
        id: data.id,
        name: data.name,
        type: user.user_type,
        school_type: data.school_type,
        code: data.code,
        UDISE_code: data.UDISE_code,
        master_name:
          data.contact_person == "" || data.contact_person == null
            ? data.master_name
            : data.contact_person,
        master_number:
          data.contact_person_number == "" || data.contact_person_number == null
            ? data.master_number
            : data.contact_person_number,
        contact_person: data.contact_person,
        contact_person_number: data.contact_person_number,
        contact_person_designation: data.contact_person_designation,
        service_engineer: data.dataValues.User
          ? data.dataValues.User.dataValues.user_name
          : "not found",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "not found",
        address: data.address,
        pincode: data.pincode,
        district: data.district,
        schoolnet_code: data.dataValues.schoolnet_code,
        ifp: data.dataValues.ifp,
        kyan: data.dataValues.kyan,
        block: data.dataValues.block,
      }));

      const excelData = await School.findAll({
        include: [
          {
            model: User,
            required: false,
            attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
            order: [["user_name", orderDir]],
          },
        ],

        where: {
          [Op.or]: [
            { service_engineer: { [Op.ne]: null } },
            { service_engineer: null }, // Include records where service_engineer is null
          ],
          id: user.school_id,
        },

        order: [[orderColumnName, orderDir]],
      });
      const dataForExcel = excelData.map((data: any) => ({
        // id: data.id,
        name: data.name,
        type:
          user.user_type == 1
            ? "Admin"
            : user.user_type == 2
            ? "OEM"
            : user.user_type == 3
            ? "School View"
            : user.user_type == 4
            ? "Service Engineer"
            : user.user_type == 5
            ? "Help Desk"
            : "Management",
        school_type: data.school_type == 1 ? "Elementary" : "Secondary",
        code: data.code,
        UDISE_code: data.UDISE_code,
        master_name:
          data.contact_person == "" || data.contact_person == null
            ? data.master_name
            : data.contact_person,
        master_number:
          data.contact_person_number == "" || data.contact_person_number == null
            ? data.master_number
            : data.contact_person_number,
        contact_person: data.contact_person,
        contact_person_number: data.contact_person_number,
        contact_person_designation: data.contact_person_designation,
        service_engineer: data.dataValues.User
          ? data.dataValues.User?.dataValues.user_name
          : "not found",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "not found",
        address: data.address,
        pincode: data.pincode,
        district: data.district,
        schoolnet_code: data.dataValues.schoolnet_code,
        ifp: data.dataValues.ifp == 1 ? "YES" : "NO",
        kyan: data.dataValues.kyan == 1 ? "YES" : "NO",
      }));
      res.json({
        draw: draw,
        recordsTotal: count,
        recordsFiltered: count,
        data: data,
        excel: dataForExcel,
      });
    } else if (user.user_type == 5) {
      let outerSearchResults = await School.findAll({
        attributes: [
          "id",
          "name",
          "UDISE_code",
          "master_name",
          "contact_person",
          "contact_person_number",
        ],
        where:
          searchValue !== null
            ? {
                [Op.or]: {
                  name: { [Op.like]: `%${searchValue}%` },
                  UDISE_code: { [Op.like]: `%${searchValue}%` },
                  master_name: { [Op.like]: `%${searchValue}%` },
                  contact_person: { [Op.like]: `%${searchValue}%` },
                  contact_person_number: { [Op.like]: `%${searchValue}%` },
                },
              }
            : {},
      });

      let outerSearchCondition =
        outerSearchResults.length > 0 ? { [Op.not]: null } : null;
      const { count, rows } = await School.findAndCountAll({
        include: [
          {
            model: User,
            required: false,
            where: { user_type: 5, project: user.project },
            attributes: ["id", "user_name", "phone", "user_type"], // Include only the necessary attributes from the User model
            order: [["user_name", orderDir]],
          },
        ],
        where:
          req.body.project == 1 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { ifp: 1 },
              ]
            : req.body.project == 2 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1 },
              ]
            : req.body.project == 3 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1, ifp: 1 },
              ]
            : req.body.project == 1
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { ifp: 1 },
              ]
            : req.body.project == 2
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1 },
              ]
            : req.body.project == 3
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1, ifp: 1 },
              ]
            : outerSearchCondition != null
            ? searchCondition
            : [
                ,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
              ],
        order: [[orderColumnName, orderDir]],
        offset: start,
        limit: length,
      });
      const data = rows.map((data: any) => ({
        id: data.id,
        name: data.name,
        type: user.user_type,
        school_type: data.school_type,
        code: data.code,
        UDISE_code: data.UDISE_code,
        master_name:
          data.contact_person == "" || data.contact_person == null
            ? data.master_name
            : data.contact_person,
        master_number:
          data.contact_person_number == "" || data.contact_person_number == null
            ? data.master_number
            : data.contact_person_number,
        contact_person: data.contact_person,
        contact_person_number: data.contact_person_number,
        contact_person_designation: data.contact_person_designation,
        service_engineer: data.dataValues.User
          ? data.dataValues.User.dataValues.user_name
          : "not found",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "not found",
        address: data.address,
        pincode: data.pincode,
        district: data.district,
        schoolnet_code: data.dataValues.schoolnet_code,
        ifp: data.dataValues.ifp,
        kyan: data.dataValues.kyan,
      }));
      res.json({
        draw: draw,
        recordsTotal: count,
        recordsFiltered: count,
        data: data,
      });
    } else if (user.user_type == 6) {
      let isRunning = false; // Prevent overlapping executions

      cron.schedule('*/1 * * * *', async () => {
        if (isRunning) {
          console.warn('Cron job already running. Skipping this execution.');
          return;
        }
      
        isRunning = true;
        console.log('Starting device availability and details fetch...');
      
        try {
          await Promise.allSettled([fetchDeviceDetails(), fetchDeviceAvailabilities()]);
          console.log('Device availability and details fetch completed.');
        } catch (error) {
          console.error('Error during cron job execution:', error.message);
        } finally {
          isRunning = false; // Reset flag
          console.log('Cron job execution completed.');
        }
      });

      let outersearchresult;
      
      if (searchValue) {
        outersearchresult = {
          [Op.or]: [
            { serial_no: { [Op.like]: `%${searchValue}%` } },
          // {school_name: { [Op.like]: `%${searchValue}%` }},
          // {block: { [Op.like]: `%${searchValue}%` }},
          // {hm_name: { [Op.like]: `%${searchValue}%` }},
          // {hm_number: { [Op.eq]: searchValue }}

        ],
        };
      }
      let outerSearch = await Device.findAll({
        attributes: ["id", "serial_no", 'school_name', 'district', 'block', 'hm_name', 'hm_number'],
        where:
          searchValue !== null
            ? {
                [Op.or]: [{
                   serial_no: { [Op.like]: `%${searchValue}%`  },
          // school_name: { [Op.like]: `%${searchValue}%` },
          // block: { [Op.like]: `%${searchValue}%` },
          // hm_name: { [Op.like]: `%${searchValue}%` },
          // hm_number: { [Op.eq]: searchValue }

                }],
              }
            : {},
      });

      let outerSearchCondition =
        outerSearch.length > 0 ? { [Op.not]: null } : null;

        
      
      
      const { count, rows } = await ConnectionStatus.findAndCountAll({
        include: {
          model: Device,
          required: true,
        where:
        (req.body.district_id != null) && outerSearchCondition != null
            ? [{district: req.body.district_id?.toString().toUpperCase()
          }, outersearchresult]:
          (req.body.district_id != null) && outerSearchCondition != null
            ? [{ 
            district: req.body.district_id?.toString().toUpperCase()
          }, outersearchresult]:
          req.body.district_id != null ? {district: req.body.district_id?.toString().toUpperCase()}       
          : outerSearchCondition != null
          ? outersearchresult
          :
          {},
        order: [["id", "DESC"]],
          },
          where: (req.body.from && req.body.to) ? {createdAt: {
            [Op.gte]: `${req.body.from} 00:00:00`,
            [Op.lte]: `${req.body.to} 23:59:59`,
            [Op.not]: null,
          },availability_status: 1}: {availability_status: 1},
        offset: start,
        limit: length,
      });

      const data = await Promise.all(
        rows.map(async (data: any) => {
          // const startDate: any = data?.start && data?.start != '00-00-00 00:00:00' ? moment(data.start) : null;
          // const endDate: any = data?.end && data?.end != '00-00-00 00:00:00' ? moment(data.end) : null;
      
          let diffHours = 0;
          let diffMinutes = 0;
          let newTotalHours = 0;
      
          // if (startDate && endDate) {
          //   const totalDiff = Math.abs(startDate - endDate); // Total difference in milliseconds
      
          //   diffHours = Math.floor(totalDiff / (1000 * 60 * 60)); // Extract hours
          //   const remainingMs = totalDiff % (1000 * 60 * 60); // Remaining milliseconds
          //   diffMinutes = Math.floor(remainingMs / (1000 * 60)); // Extract minutes
      
          //   // Calculate the fractional hours (e.g., 1 hr 30 min -> 1.5 hr)
          //   const totalDiffHours = diffHours + diffMinutes / 60;
      
          //   // Fetch the existing total_hours from the Asset table
          //   const assetRecord = await Asset.findOne({
          //     where: { id: data.id },
          //     attributes: ['total_hours'],
          //   });
      
          //   const existingTotalHours = assetRecord?.dataValues.total_hours || 0;
      
          //   // Add new totalDiffHours to the existing total
          //   newTotalHours = existingTotalHours + totalDiffHours;
      
          //   // Update the total_hours field in the database
          //   await Asset.update(
          //     { total_hours: newTotalHours },
          //     { where: { id: data.id } }
          //   );
          // }

          // console.log(data?.Device)

          let diffSeconds = 0;
          if (data?.duration_in_seconds) {
            const totalDiff = data?.duration_in_seconds;
            if (totalDiff < 60) {
              diffSeconds = totalDiff;
            } else {
              diffHours = Math.floor(totalDiff / 3600); 
              const remainingSeconds = totalDiff % 3600; 
              diffMinutes = Math.floor(remainingSeconds / 60); 
              diffSeconds = remainingSeconds % 60; 
            }
          }
          

        return {
          id: data?.Device?.dataValues.id,
          name: data?.Device?.dataValues.school_name,
          district: data?.Device?.dataValues.district,
          block: data?.Device?.dataValues.block,
          last_seen: data?.Device?.dataValues.last_seen
            ? moment(data?.Device?.dataValues.last_seen).format('hh:mm:ss A')
            : null,
          active: data?.availability_status,
          date: data?.createdAt ? moment(data?.createdAt).format('DD/MM/YYYY') // Format date
            : null,
          serial_no: data?.Device?.dataValues.serial_no,
          diff: (diffHours != 0 && diffMinutes != 0) ? diffHours +' hr '+ diffMinutes + ' mins': (diffHours != 0 && diffMinutes == 0) ? diffHours +' hr ' : (diffHours == 0 && diffMinutes != 0) ? diffMinutes + ' mins' : (diffHours == 0 && diffMinutes == 0 && diffSeconds != 0) ? diffSeconds + ' secs' : 0 + 'secs',
          hm_name: data?.Device?.dataValues.hm_name,
          hm_number: data?.Device?.dataValues.hm_number
        };
      })
    )

      res.json({
        draw: draw,
        recordsTotal: count,
        recordsFiltered: count,
        data: data,
        searchCondition: searchCondition,
        searchValue: searchValue,
      });
    } else {
      let outerSearchResults = await School.findAll({
        attributes: [
          "id",
          "name",
          "UDISE_code",
          "master_name",
          "contact_person",
          "contact_person_number",
          "block",
        ],
        where:
          searchValue !== null
            ? {
                [Op.or]: {
                  name: { [Op.like]: `%${searchValue}%` },
                  UDISE_code: { [Op.like]: `%${searchValue}%` },
                  master_name: { [Op.like]: `%${searchValue}%` },
                  contact_person: { [Op.like]: `%${searchValue}%` },
                  contact_person_number: { [Op.like]: `%${searchValue}%` },
                },
              }
            : {},
      });

      let outerSearchCondition =
        outerSearchResults.length > 0 ? { [Op.not]: null } : null;

      const { count, rows } = await School.findAndCountAll({
        include: [
          {
            model: User,
            required: true,
            attributes: ["id", "user_name", "phone", "user_type"],
            where:
              outerSearchCondition == null
                ? { user_name: { [Op.like]: `%${searchValue}%` } }
                : {},
            order: [["user_name", orderDir]],
            // Include only the necessary attributes from the User model
          },
        ],
        where:
          req.body.project == 1 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { ifp: 1 },
              ]
            : req.body.project == 2 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1 },
              ]
            : req.body.project == 3 && outerSearchCondition != null
            ? [
                searchCondition,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1, ifp: 1 },
              ]
            : req.body.project == 1
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { ifp: 1 },
              ]
            : req.body.project == 2
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1 },
              ]
            : req.body.project == 3
            ? [
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
                { kyan: 1, ifp: 1 },
              ]
            : outerSearchCondition != null
            ? searchCondition
            : [
                ,
                {
                  [Op.or]: [
                    { service_engineer: { [Op.ne]: null } },
                    { service_engineer: null }, // Include records where service_engineer is null
                  ],
                },
              ],

        order: [[orderColumnName, orderDir]],
        offset: start,
        limit: length,
      });

      const excelData = await School.findAll({
        include: [
          {
            model: User,
            required: true,
            attributes: ["id", "user_name", "phone", "user_type"],
            order: [["user_name", orderDir]],
          },
        ],
        where: {
          [Op.or]: [
            { service_engineer: { [Op.ne]: null } },
            { service_engineer: null },
          ],
        },

        order: [[orderColumnName, orderDir]],
      });
      const dataForExcel = excelData.map((data: any) => ({
        // id: data.id,
        name: data.name,
        type:
          user.user_type == 1
            ? "Admin"
            : user.user_type == 2
            ? "OEM"
            : user.user_type == 3
            ? "School View"
            : user.user_type == 4
            ? "Service Engineer"
            : user.user_type == 5
            ? "Help Desk"
            : "Management",
        school_type: data.school_type == 1 ? "Elementary" : "Secondary",
        code: data.code,
        UDISE_code: data.UDISE_code,
        master_name:
          data.contact_person == "" || data.contact_person == null
            ? data.master_name
            : data.contact_person,
        master_number:
          data.contact_person_number == "" || data.contact_person_number == null
            ? data.master_number
            : data.contact_person_number,
        contact_person: data.contact_person,
        contact_person_number: data.contact_person_number,
        contact_person_designation: data.contact_person_designation,
        service_engineer: data.dataValues.User
          ? data.dataValues.User?.dataValues.user_name
          : "not found",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "not found",
        address: data.address,
        pincode: data.pincode,
        district: data.district,
        schoolnet_code: data.dataValues.schoolnet_code,
        ifp: data.dataValues.ifp == 1 ? "YES" : "NO",
        kyan: data.dataValues.kyan == 1 ? "YES" : "NO",
      }));
      const data = rows.map((data: any) => ({
        id: data.id,
        name: data.name,
        type: user.user_type,
        school_type: data.school_type,
        code: data.code,
        UDISE_code: data.UDISE_code,
        master_name:
          data.contact_person == "" || data.contact_person == null
            ? data.master_name
            : data.contact_person,
        master_number:
          data.contact_person_number == "" || data.contact_person_number == null
            ? data.master_number
            : data.contact_person_number,
        contact_person: data.contact_person,
        contact_person_number: data.contact_person_number,
        contact_person_designation: data.contact_person_designation,
        service_engineer: data.dataValues.User
          ? data.dataValues.User?.dataValues.user_name
          : "not found",
        phone: data.dataValues.User
          ? data.dataValues.User.dataValues.phone
          : "not found",
        address: data.address,
        pincode: data.pincode,
        district: data.district,
        schoolnet_code: data.dataValues.schoolnet_code,
        ifp: data.dataValues.ifp,
        kyan: data.dataValues.kyan,
        block: data.dataValues.block,
      }));
      res.json({
        draw: draw,
        recordsTotal: count,
        recordsFiltered: count,
        data: data,
        searchCondition: searchCondition,
        searchValue: searchValue,
        excel: dataForExcel,
      });
    }
  } else {
    res.status(404).send("Schools not found!");
  }
  // } catch (error) {
  //   console.error("Error while fetching schools:", error);
  //   if (error) {
  //     // Log Sequelize validation errors, if any
  //     console.error("Validation Errors:", error);
  //   }
  //   res.status(500).send("Error while fetching schools");
  // }
};

export const checkUDISECodeUniqueness: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }
    if (user) {
      const data = await School.findOne({
        where: { UDISE_code: req.body.UDISE_code },
      });
      if (data) {
        return res.json({ success: false });
      } else {
        return res.json({ success: true });
      }
    }
  } catch (e: any) {
    return { error: e };
  }
};

// export const schoolExcelSheetForManagement: RequestHandler = async (
//   req,
//   res,
//   next
// ) => {
//   try {
//     let user: any;
//     let decodedToken: any;
//     if (req.headers.authorization) {
//       const jwtString = req.headers.authorization.split(" ")[1];
//       decodedToken = jwt.decode(jwtString);
//       user = await User.findOne({ where: { id: decodedToken.id } });
//     }

//     // const draw = req.body.draw;
//     //   const start = parseInt(req.body.start as string, 10) || 0;
//     //   const length = parseInt(req.body.length as string, 10) || 10;

//     const searchValue = (req.body.search as any)?.value || "";

//     // For ordering (sorting)
//     const orderColumnIndex = (req.body.order as any)?.[0]?.column;
//     const orderDir = (req.body.order as any)?.[0]?.dir || "desc";
//     const orderColumnName =
//       (req.body.columns as any)?.[orderColumnIndex]?.data || "id";

//     let innersearchresult;
//     let outersearchresult;
//     if (searchValue) {
//       innersearchresult = {
//         [Op.or]: [
//           { name: { [Op.like]: `%${searchValue}%` } },
//           { UDISE_code: { [Op.like]: `${searchValue}%` } },
//           { block: { [Op.like]: `%${searchValue}%` } },
//         ],
//       };
//     }
//     if (searchValue) {
//       outersearchresult = {
//         [Op.or]: [{ serial_no: { [Op.like]: `%${searchValue}%` } }],
//       };
//     }
//     let innerSearch = await School.findAll({
//       attributes: [
//         "id",
//         "name",
//         "UDISE_code",
//         "master_name",
//         "contact_person",
//         "contact_person_number",
//         "block",
//         "district",
//         "district_id",
//       ],
//       where:
//         searchValue !== null
//           ? {
//               [Op.or]: {
//                 name: { [Op.like]: `%${searchValue}%` },
//                 UDISE_code: { [Op.like]: `%${searchValue}%` },
//                 master_name: { [Op.like]: `%${searchValue}%` },
//                 contact_person: { [Op.like]: `%${searchValue}%` },
//                 contact_person_number: { [Op.like]: `%${searchValue}%` },
//                 block: { [Op.like]: `%${searchValue}%` },
//               },
//             }
//           : {},
//     });
//     let outerSearch = await Asset.findAll({
//       attributes: ["id", "serial_no"],
//       where:
//         searchValue !== null
//           ? {
//               [Op.or]: {
//                 serial_no: { [Op.like]: `%${searchValue}%` },
//               },
//             }
//           : {},
//     });
//     let innerSearchCondition =
//       innerSearch.length > 0 ? { [Op.not]: null } : null;

//     let outerSearchCondition =
//       outerSearch.length > 0 ? { [Op.not]: null } : null;

//     const { count, rows } = await Asset.findAndCountAll({
//       include: {
//         model: School,
//         required: true,
//         where: req.body.district_id
//           ? { ifp: 1, kyan: 0, district_id: req.body.district_id }
//           : innerSearchCondition != null
//           ? [innersearchresult, { ifp: 1, kyan: 0 }]
//           : { ifp: 1, kyan: 0 },
//           include: [{model: User, attributes: ['id', 'user_name', 'phone']}]
//       },
//       where: req.body.project
//         ? { type: req.body.project }
//         : req.body.from && req.body.to
//         ? {
//             date: {
//               [Op.gte]: `${req.body.from} 00:00:00`,
//               [Op.lte]: `${req.body.to} 23:59:59`,
//               [Op.not]: null,
//             },
//           }
//         : outerSearchCondition != null
//         ? outersearchresult
//         : {},
//       order: [["type", "DESC"]],
//     });

//     const dataForExcel = rows.map((data: any) => {
//       const startDate: any = data.start ? new Date(data.start) : null;
//       const endDate: any = data.end ? new Date(data.end) : null;
    
//       let diffHours = null;
//       let diffMinutes = null;
    
//       if (startDate && endDate) {
//         const totalDiff = Math.abs(startDate - endDate); // Total difference in milliseconds
    
//         diffHours = Math.floor(totalDiff / (1000 * 60 * 60)); // Extract hours
//         const remainingMs = totalDiff % (1000 * 60 * 60); // Remaining milliseconds
//         diffMinutes = Math.floor(remainingMs / (1000 * 60)); // Extract minutes
//       }

//       return {
//         Date: formatonlyDate(data.last_seen),
//         SchoolName: data.School?.dataValues.name,
//         school_type:
//           data.School?.dataValues.school_type == 1 ? "Elementary" : "Secondary",
//         code: data.School?.dataValues.code,
//         UDISE_code: data.School?.dataValues.UDISE_code,
//         master_name:
//           data.School?.dataValues.contact_person == "" ||
//           data.School?.dataValues.contact_person == null
//             ? data.School?.dataValues.master_name
//             : data.School?.dataValues.contact_person,
//         master_number:
//           data.School?.dataValues.contact_person_number == "" ||
//           data.School?.dataValues.contact_person_number == null
//             ? data.School?.dataValues.master_number
//             : data.School?.dataValues.contact_person_number,
//         contact_person: data.School?.dataValues.contact_person,
//         contact_person_number: data.School?.dataValues.contact_person_number,
//         contact_person_designation:
//           data.School?.dataValues.contact_person_designation,
//         service_engineer: data.School.dataValues.User
//           ? data.School.dataValues.User.dataValues.user_name
//           : "not found",
//         phone: data.School.dataValues.User
//           ? data.School.dataValues.User.dataValues.phone
//           : "not found",
//         address: data.School?.dataValues.address,
//         pincode: data.School?.dataValues.pincode,
//         district: data.School?.dataValues.district,
//         Active_Inactive: data.type == 1 ? "Active" : "Inactive",
//         start: data.start != null ? formatDate(data.start) : null,
//         end: data.end != null ? formatDate(data.end): null,
//         last_seen: formatonlyTime(data.last_seen),
//         serial_no: data.serial_no,
//         working_hours: diffHours !== null && diffMinutes !== null
//         ? `${diffHours} hr ${diffMinutes} min`
//         : null,
//         Connection_status: (data.start != null) ? "Connected" : (data.start == null)? "Disconnected":"",
//         Total_Working_hours: data.total_hours
//         // schoolnet_code: data.dataValues.schoolnet_code,
//         // ifp: data.dataValues.ifp == 1 ? "YES" : "NO",
//         // kyan: data.dataValues.kyan == 1 ? "YES" : "NO",
//       };
//     });

//     res.json({
//       excel: dataForExcel,
//     });
//   } catch (error) {
//     res.status(500).send("Error while fetching schools");
//   }
// };



export const schoolExcelSheetForManagement: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    let user: any;
    let decodedToken: any;
    if (req.headers.authorization) {
      const jwtString = req.headers.authorization.split(" ")[1];
      decodedToken = jwt.decode(jwtString);
      user = await User.findOne({ where: { id: decodedToken.id } });
    }

    // const draw = req.body.draw;
    //   const start = parseInt(req.body.start as string, 10) || 0;
    //   const length = parseInt(req.body.length as string, 10) || 10;

    const searchValue = (req.body.search as any)?.value || "";

    // For ordering (sorting)
    const orderColumnIndex = (req.body.order as any)?.[0]?.column;
    const orderDir = (req.body.order as any)?.[0]?.dir || "desc";
    const orderColumnName =
      (req.body.columns as any)?.[orderColumnIndex]?.data || "id";

      let outersearchresult;
      
      if (searchValue) {
        outersearchresult = {
          [Op.or]: [
            { serial_no: { [Op.like]: `%${searchValue}%` } },
          // {school_name: { [Op.like]: `%${searchValue}%` }},
          // {block: { [Op.like]: `%${searchValue}%` }},
          // {hm_name: { [Op.like]: `%${searchValue}%` }},
          // {hm_number: { [Op.eq]: searchValue }}

        ],
        };
      }
      let outerSearch = await Device.findAll({
        attributes: ["id", "serial_no", 'school_name', 'district', 'block', 'hm_name', 'hm_number'],
        where:
          searchValue !== null
            ? {
                [Op.or]: [{
                   serial_no: { [Op.like]: `%${searchValue}%`  },
          // school_name: { [Op.like]: `%${searchValue}%` },
          // block: { [Op.like]: `%${searchValue}%` },
          // hm_name: { [Op.like]: `%${searchValue}%` },
          // hm_number: { [Op.eq]: searchValue }

                }],
              }
            : {},
      });

      let outerSearchCondition =
        outerSearch.length > 0 ? { [Op.not]: null } : null;

        
      
      
      const { count, rows } = await ConnectionStatus.findAndCountAll({
        include: {
          model: Device,
          required: true,
        where:
        (req.body.district_id != null) && outerSearchCondition != null
            ? [{district: req.body.district_id?.toString().toUpperCase()
          }, outersearchresult]:
          (req.body.district_id != null) && outerSearchCondition != null
            ? [{ 
            district: req.body.district_id?.toString().toUpperCase()
          }, outersearchresult]:
          req.body.district_id != null ? {district: req.body.district_id?.toString().toUpperCase()}
          : outerSearchCondition != null
          ? outersearchresult
          :
          {},
        order: [["id", "DESC"]],
          },
          where: (req.body.from && req.body.to) ? {createdAt: {
            [Op.gte]: `${req.body.from} 00:00:00`,
            [Op.lte]: `${req.body.to} 23:59:59`,
            [Op.not]: null,
          },availability_status: 1}: {availability_status: 1},
      });

      const dataForExcel = await Promise.all(
        rows.map(async (data: any) => {
      
          let diffHours = null;
          let diffMinutes = null;
          let diffSeconds = 0;
          if (data?.duration_in_seconds) {
            const totalDiff = data?.duration_in_seconds;
            if (totalDiff < 60) {
              diffSeconds = totalDiff;
            } else {
              diffHours = Math.floor(totalDiff / 3600); 
              const remainingSeconds = totalDiff % 3600; 
              diffMinutes = Math.floor(remainingSeconds / 60); 
              diffSeconds = remainingSeconds % 60; 
            }
          }
     

        return {
          // id: data?.Device?.dataValues.id,
          date: data?.createdAt ? moment(data?.createdAt).format('DD/MM/YYYY') // Format date
            : null,
          school_name: data?.Device?.dataValues.school_name,
          hm_name: data?.Device?.dataValues.hm_name,
          hm_number: data?.Device?.dataValues.hm_number,
          district: data?.Device?.dataValues.district,
          block: data?.Device?.dataValues.block,
          serial_no: data?.Device?.dataValues.serial_no,
          active: data?.availability_status == 1 ? 'yes' : 'no',
          Working_hours: (diffHours != 0 && diffMinutes != 0) ? diffHours +' hr '+ diffMinutes + ' mins': (diffHours != 0 && diffMinutes == 0) ? diffHours +' hr ' : (diffHours == 0 && diffMinutes != 0) ? diffMinutes + ' mins' : (diffHours == 0 && diffMinutes == 0 && diffSeconds != 0) ? diffSeconds + ' secs' : 0 + 'secs',
          //start: startDate != null ? startDate.format('DD/MM/YYYY hh:mm:ss A') : null, // AM/PM format
          //end:endDate != null ? endDate.format('DD/MM/YYYY hh:mm:ss A') : null, // AM/PM format
          last_seen: data?.Device?.dataValues.last_seen
            ? moment(data?.Device?.dataValues.last_seen).format('hh:mm:ss A') // Format time with AM/PM
            : null,
          // diff: 
          //   diffHours !== null && diffMinutes !== null
          //     ? `${diffHours} hr ${diffMinutes} min`
          //     : null,
          // diff: data?.ConnectionStatuses[0]?.dataValues.duration_in_seconds
        };
      })
    )

    res.json({
      excel: dataForExcel,
    });
  } catch (error) {
    res.status(500).send("Error while fetching schools");
  }



// Schedule Cron Jobs



};