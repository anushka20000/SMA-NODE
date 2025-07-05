import { Router } from "express"
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware";
import { checkEmailUniqueness, checkPhoneUniqueness, destroyUser, exportAssetFileToDB, exportSchool, exportSchoolUser, exportServiceEngineer, exportServiceEngineerINSCHOOLToDB, getServiceEngineer, getUserById, getUsersList, saveUser, updateProfilePicture, updateUser } from "../controllers/UserController";
import { destroyAsset, getAssetById, getAssets, getAssetsList, getExcelforAsset, removeAssetFromSchool, saveAsset, serialNoUniqueness, updateAsset } from "../controllers/AssetController";
import { checkUDISECodeUniqueness, destroySchool, fetchSchoolName, getSchoolById, getSchoolList, getSchools, saveSchool, saveSchoolUser, schoolExcelSheetForManagement, updateSchool } from "../controllers/SchoolController";
import { AppLogin, Login, TokenVerification, changePassword, forgotPassword, verifyOtp } from "../controllers/AuthController";
import { destroyGrievance, getDashboardList, getDashboardListForManagement, getGrievanceById, getGrievanceSchoolList, getGrievancesList, saveGrievance, updateGrievance, updateGrievanceApp } from "../controllers/GrievanceController";
import { destroyIssue, getIssueById, getIssuesList, saveIssue, updateIssue } from "../controllers/IssueController";
import { destroyAssetType, getAssetCategory, getAssetType, getAssetTypeById, getAssetTypesList, saveAssetTypeType, updateAssetType } from "../controllers/AssetTypeController";
import { bulkUploadSchoolVisit, getAppDashboard, getAppGrievance, getAppSchoolVisit, getSchoolVisit, getSchoolVisitById, getSchoolVisitList, getSchoolVisitNameById, saveSchoolVisit } from "../controllers/SchoolVisitController";
import { getAttendanceById, getAttendanceList, getExcelForAttendance, markVisit, saveAttendance } from "../controllers/AttendanceController";
import { exportDistrict, getDistricts } from "../controllers/DistrictController";

const router = Router();

//Login
router.post("/api/login", Login);
router.get("/api/me", TokenVerification);
router.put("/api/forgot-password", forgotPassword);
router.post("/api/verify-otp", verifyOtp);
router.post("/api/reset-password", changePassword);

//User
router.post("/api/user",adminAuthMiddleware, getUsersList);
router.get("/api/service-engineer/:type/:ifp?/:kyan?",adminAuthMiddleware, getServiceEngineer);
router.post("/api/user/check-email",adminAuthMiddleware, checkEmailUniqueness);
router.post("/api/user/check-phone",adminAuthMiddleware, checkPhoneUniqueness);
router.get("/api/user/edit/:id",adminAuthMiddleware, getUserById);
router.post("/api/user/store",adminAuthMiddleware, saveUser);
router.put("/api/user/update/:id",adminAuthMiddleware, updateUser);
router.delete("/api/user/delete/:id",adminAuthMiddleware, destroyUser);

router.post("/api/export", exportAssetFileToDB);
router.post("/api/school-visit-bulk-upload", bulkUploadSchoolVisit);

//Asset
router.post("/api/asset",adminAuthMiddleware, getAssetsList);
router.post("/api/asset/serial-no",adminAuthMiddleware, serialNoUniqueness);
router.post("/api/assets",adminAuthMiddleware, getAssets);
router.get("/api/asset/edit/:id",adminAuthMiddleware, getAssetById);
router.post("/api/asset/store",adminAuthMiddleware, saveAsset);
router.put("/api/asset/update",adminAuthMiddleware, updateAsset);
router.delete("/api/asset/delete/:id",adminAuthMiddleware, destroyAsset);
router.delete("/api/school-asset/delete/:id",adminAuthMiddleware, removeAssetFromSchool);
router.get("/api/asset-excel",adminAuthMiddleware, getExcelforAsset);

//Grievance
router.post("/api/grievance",adminAuthMiddleware, getGrievancesList);
router.get("/api/grievance/asset-list/:id",adminAuthMiddleware, getGrievanceSchoolList);
router.get("/api/grievance/edit/:id",adminAuthMiddleware, getGrievanceById);
router.post("/api/grievance/store",adminAuthMiddleware, saveGrievance);
router.put("/api/grievance/update",adminAuthMiddleware, updateGrievance);
router.delete("/api/grievance/delete/:id",adminAuthMiddleware, destroyGrievance);

//Issue
router.post("/api/issue",adminAuthMiddleware, getIssuesList);
router.get("/api/issue/:id",adminAuthMiddleware, getIssueById);
router.post("/api/issue/store",adminAuthMiddleware, saveIssue);
router.put("/api/issue/update",adminAuthMiddleware, updateIssue);
router.delete("/api/issue/delete/:id",adminAuthMiddleware, destroyIssue);

//Asset Type
// router.post("/api/asset-type",adminAuthMiddleware, getAssetTypesList);
router.post("/api/asset-type",adminAuthMiddleware, getAssetType);
router.get("/api/asset-category",adminAuthMiddleware, getAssetCategory);
router.get("/api/asset-type/edit/:id",adminAuthMiddleware, getAssetTypeById);
router.post("/api/asset-type/store",adminAuthMiddleware, saveAssetTypeType);
router.put("/api/asset-type/update",adminAuthMiddleware, updateAssetType);
router.delete("/api/asset-type/delete/:id",adminAuthMiddleware, destroyAssetType);

//School
router.post("/api/school",adminAuthMiddleware, getSchoolList);
router.get("/api/school-list",adminAuthMiddleware, getSchools);
router.post("/api/school-user/store",adminAuthMiddleware, saveSchoolUser);
router.post("/api/school/check-code",adminAuthMiddleware, checkUDISECodeUniqueness);
router.get("/api/school-name/:id",adminAuthMiddleware, fetchSchoolName);
router.get("/api/school/edit/:id",adminAuthMiddleware, getSchoolById);
router.post("/api/school/store",adminAuthMiddleware, saveSchool);
router.put("/api/school/update/:id",adminAuthMiddleware, updateSchool);
router.delete("/api/school/delete/:id",adminAuthMiddleware, destroySchool);

//School Visit
router.post("/api/school-visit",adminAuthMiddleware, getSchoolVisitList);
router.post("/api/school-visit/store",adminAuthMiddleware, saveSchoolVisit);
router.get("/api/school-visit/edit/:id",adminAuthMiddleware, getSchoolVisitById);
router.get("/api/school-visit/school-details/:id",adminAuthMiddleware, getSchoolVisitNameById);

//dashboard
router.get("/api/dashboard",adminAuthMiddleware, getDashboardList);
router.get("/api/dashboard-management",adminAuthMiddleware, getDashboardListForManagement);


//attendance
router.get("/api/attendance",adminAuthMiddleware, getAttendanceById);
router.post("/api/attendance/store",adminAuthMiddleware, saveAttendance);
router.post("/api/attendance-list",adminAuthMiddleware, getAttendanceList);
router.post("/api/attendance-excel",adminAuthMiddleware, getExcelForAttendance);

// router.post("/api/excel",adminAuthMiddleware, exportExcel);

//districts
router.get("/api/districts", getDistricts);
router.get("/api/district-import", exportDistrict);
router.post("/api/school-excel",adminAuthMiddleware, schoolExcelSheetForManagement);



//App login
router.post("/api/app/login", AppLogin);
router.get("/api/app/dashboard", adminAuthMiddleware, getAppDashboard);
router.post("/api/app/school-visit", adminAuthMiddleware, getAppSchoolVisit);
router.post("/api/app/grievance", adminAuthMiddleware, getAppGrievance);
router.post("/api/app/mark-school-visit",adminAuthMiddleware, markVisit);
router.post("/api/app/grievance/update",adminAuthMiddleware, updateGrievanceApp);
router.post("/api/app/user/update-profile-picture",adminAuthMiddleware, updateProfilePicture);




export default router;
