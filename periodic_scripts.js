const schedule = require("node-schedule");

const hrMemberModel = require("./models/hr_member_model");
const academicMemberModel = require("./models/academic_member_model");
const jwtBlacklistModel = require("./models/jwt_blacklist_model");
const userBlacklistModel = require("./models/user_blacklist_model");

const updateAnnualLeaveBalacnceJob = schedule.scheduleJob("0 0 0 11 * *", async () => {
    await hrMemberModel.updateMany({}, {$inc: {annualLeaveBalance: 2.5}});
    await academicMemberModel.updateMany({}, {$inc: {annualLeaveBalance: 2.5}});
});

const removeBlockedTokensJob = schedule.scheduleJob("0 */15 * * * *", async () => {
    await jwtBlacklistModel.deleteMany({expiresAt: {$lt: new Date()}});
});

const removeBlockedUsersJob = schedule.scheduleJob("0 */15 * * * *", async () => {
    const date = new Date(Date.now() - 1000 * 60 * 15);
    await userBlacklistModel.deleteMany({blockedAt: {$lt: date}});
});

module.exports.updateAnnualLeaveBalacnceJob = updateAnnualLeaveBalacnceJob;
module.exports.removeBlockedTokensJob = removeBlockedTokensJob;
module.exports.removeBlockedUsersJob = removeBlockedUsersJob;