const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const departmentModel = require("../models/department_model");
const facultyModel = require("../models/faculty_model");
const attendanceRecordModel = require("../models/attendance_record_model");
const slotModel = require("../models/slot_model");
const notificationModel = require("../models/notification_model");
const { requestModel, maternityLeaveModel } = require("../models/request_model");
const userBlacklistModel = require("../models/user_blacklist_model");

const router = express.Router();

function convertDay(day) {
    switch (day) {
        case "Sunday": return 0;
        case "Monday": return 1;
        case "Tuesday": return 2;
        case "Wednesday": return 3;
        case "Thursday": return 4;
        case "Friday": return 5;
        case "Saturday": return 6;
    }
    return -1;
}

function getNumberOfDaysInMonth(currMonth, currYear) {
    switch (currMonth) {
        //31 days
        case 0:
        case 2:
        case 4:
        case 6:
        case 7:
        case 9:
        case 11:
            return 31;
        //30 days
        case 3:
        case 5:
        case 8:
        case 10:
            return 30;
        //28 days or 29 days
        case 1:
            if (currYear % 4 !== 0)
                return 29;
            return 28;
    }
    return -1;
}

function getExpectedDaysToAttend(dayOff, firstDay, numberOfDaysInMonth) {
    let expectedDaysToAttend = 20;
    if (numberOfDaysInMonth === 31) {
        expectedDaysToAttend = 23;
        if (firstDay % 7 === 5 || (firstDay + 1) % 7 === 5 || (firstDay + 2) % 7 === 5) {
            expectedDaysToAttend--;
        }
        if (firstDay % 7 === dayOff || (firstDay + 1) % 7 === dayOff || (firstDay + 2) % 7 === dayOff) {
            expectedDaysToAttend--;
        }
    }
    else if (numberOfDaysInMonth === 30) {
        expectedDaysToAttend = 22;
        if (firstDay % 7 === 5 || (firstDay + 1) % 7 === 5) {
            expectedDaysToAttend--;
        }
        if (firstDay % 7 === dayOff || (firstDay + 1) % 7 === dayOff) {
            expectedDaysToAttend--;
        }
    }
    else if (numberOfDaysInMonth === 29) {
        expectedDaysToAttend = 21;
        if (firstDay % 7 === 5) {
            expectedDaysToAttend--;
        }
        if (firstDay % 7 === dayOff) {
            expectedDaysToAttend--;
        }
    }
    return expectedDaysToAttend;
}

async function getMissingDays(month, year, dayOff, userAttendanceRecords, user) {
    const numberOfDaysInMonth = getNumberOfDaysInMonth(month, year);
    let normalDaysAttended = [];
    let daysOffAttended = [];

    for (let i = 0; i < userAttendanceRecords.length; i++) {
        let date = userAttendanceRecords[i].signInTime;
        if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
            normalDaysAttended.push(date.getDate());
        }
        else if (!daysOffAttended.includes(date.getDate())) {
            daysOffAttended.push(date.getDate());
        }
    }

    let expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
    if (expectedDaysToAttend === normalDaysAttended.length) {
        return { missingDays: [], numberOfDaysWithExcuse: 0 };
    }

    let missingDays = [];
    for (let i = 0; i < numberOfDaysInMonth; i++) {
        let date = new Date(year, month, 11 + i);
        date.setTime(date.getTime() + (1000 * 60 * 60 * 2));
        if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
            missingDays.push(date);
        }
    }
    let finalMissingDays = [];
    let numberOfDaysWithExcuse = 0;
    for (let i = 0; i < missingDays.length; i++) {
        let date = missingDays[i];
        let request = await requestModel.findOne({
            requestedBy: user.id,
            day: date,
            type: { $ne: "slotLinkingRequest", $ne: "dayOffChangeRequest", $ne: "replacementRequest", $ne: "maternityLeave" },
            status: "Accepted"
        });

        if (request) {
            if (request.type !== "compensationRequest" || request.type === "compensationRequest" && daysOffAttended.includes(missingDays[i].getDate())) {

                numberOfDaysWithExcuse++;
            }
        }
        else {

            request = await maternityLeaveModel.find({
                requestedBy: user.id,
                type: "maternityLeave",
                status: "Accepted",
                day: { $lte: missingDays[i] },
            }).sort({ day: 1 });

            if (request.length !== 0) {
                request = request[request.length - 1]
                if (missingDays[i] < request.day.setTime(request.day.getTime() + (request.duration * 24 * 60 * 60 * 1000))) {
                    numberOfDaysWithExcuse++;
                }

            }
            else {
                finalMissingDays.push(missingDays[i]);
            }
        }
    }

    return { missingDays: finalMissingDays, numberOfDaysWithExcuse: numberOfDaysWithExcuse };
}

async function getMissingAndExtraHours(month, year, dayOff, userAttendanceRecords, user) {

    const numberOfDaysInMonth = getNumberOfDaysInMonth(month);
    const expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
    let numberOfDaysWithExcuse;
    await getMissingDays(month, year, dayOff, userAttendanceRecords, user).then(result => {
        numberOfDaysWithExcuse = result.numberOfDaysWithExcuse;
    }).catch(err => {
        console.log(err);
        res.status(500).send("Error");
    })
    const requiredHours = (expectedDaysToAttend - numberOfDaysWithExcuse) * 8.4;

    let timeDiffInSeconds = 0;
    for (let i = 0; i < userAttendanceRecords.length; i++) {
        let signInTime = userAttendanceRecords[i].signInTime;
        let signOutTime = userAttendanceRecords[i].signOutTime;

        if (signInTime.getHours() < 7) {
            signInTime.setHours(7);
            signInTime.setMinutes(0);
            signInTime.setSeconds(0);
            signInTime.setMilliseconds(0);
        }
        else if (signInTime.getHours() > 18) {
            signInTime.setHours(19);
            signInTime.setMinutes(0);
            signInTime.setSeconds(0);
            signInTime.setMilliseconds(0);
        }
        else {
            signInTime.setMilliseconds(0);
        }

        if (signOutTime.getHours() < 7) {
            signOutTime.setHours(7);
            signOutTime.setMinutes(0);
            signOutTime.setSeconds(0);
            signOutTime.setMilliseconds(0);
        }
        else if (signOutTime.getHours() > 18) {
            signOutTime.setHours(19);
            signOutTime.setMinutes(0);
            signOutTime.setSeconds(0);
            signOutTime.setMilliseconds(0);
        }
        else {
            signOutTime.setMilliseconds(0);
        }

        timeDiffInSeconds += (signOutTime - signInTime) / 1000;
    }

    // const spentHours = Math.floor(timeDiffInSeconds / 3600);
    // timeDiffInSeconds %= 3600;
    // const spentMinutes = Math.floor(timeDiffInSeconds / 60);
    // timeDiffInSeconds %= 60;
    // const spentSeconds = timeDiffInSeconds;

    const spentHours = timeDiffInSeconds / 3600;
    if (spentHours > requiredHours) {
        return { missingHours: 0, extraHours: spentHours - requiredHours };
    }
    else {
        return { missingHours: requiredHours - spentHours, extraHours: 0 };
    }
}

router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role === "HR") {
        next();
    }
    else {
        res.status(403).send("Unauthorized access.");
    }
});

router.route("/add-hr-member")
    .post(async (req, res) => {
        if (!req.body.email) {
            res.status(400).send("Email is required");
            return;
        }

        if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
            res.status(400).send("Invalid email address");
            return;
        }

        let user = await hrMemberModel.findOne({ email: req.body.email });
        if (!user) {
            user = await academicMemberModel.findOne({ email: req.body.email });
        }
        if (user) {
            res.status(409).send("Email already exists");
            return;
        }

        const office = await roomModel.findOne({ name: req.body.office });
        if (!office) {
            res.status(422).send("Incorrect Office Name");
            return;
        }
        if (office.type !== "Office") {
            res.status(422).send("Room must be an office");
            return;
        }
        if (office.remainingCapacity === 0) {
            res.status(409).send("Office has full capacity");
            return;
        }
        office.remainingCapacity--;

        const salt = await bcrypt.genSalt(10);
        const newPassword = await bcrypt.hash("123456", salt);

        let newUserCount;
        await hrMemberModel.nextCount().then(count => {
            newUserCount = count;
        });

        const newUser = new hrMemberModel({
            id: "hr-" + newUserCount,
            name: req.body.name,
            email: req.body.email,
            password: newPassword,
            gender: req.body.gender,
            office: office._id,
            salary: req.body.salary
        });

        try {
            await newUser.save();
            await office.save();
            res.send("User added successfully");
        }
        catch (error) {
            console.log(error.message)
            res.status(400).send(error.messages);
        }
    });

router.route("/add-academic-member")
    .post(async (req, res) => {
        if (!req.body.email) {
            res.status(400).send("Email is required");
            return;
        }

        if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
            res.status(400).send("Invalid email address");
            return;
        }

        let user = await hrMemberModel.findOne({ email: req.body.email });
        if (!user) {
            user = await academicMemberModel.findOne({ email: req.body.email });
        }
        if (user) {
            res.status(409).send("Email already exists");
            return;
        }

        if (req.body.department) {
            var department = await departmentModel.findOne({ name: req.body.department });
            if (!department) {
                res.status(422).send("Incorrect department name");
                return;
            }
        }

        if (req.body.role === "Course Coordinator") {
            res.status(403).send("Cannot assign an academic member to be a course coordinator");
            return;
        }
        else if (req.body.role === "Head of Department") {
            if (!department) {
                res.status(422).send("Cannot assign an academic member to be a head of department without specifying the department");
                return;
            }
            if (department.headOfDepartment !== "UNASSIGNED") {
                res.status(409).send("Department already has a head");
                return;
            }
        }

        const office = await roomModel.findOne({ name: req.body.office });
        if (!office) {
            res.status(422).send("Incorrect office name");
            return;
        }
        if (office.type !== "Office") {
            res.status(422).send("Room must be an office");
            return;
        }
        if (office.remainingCapacity === 0) {
            res.status(409).send("Office has full capacity");
            return;
        }
        office.remainingCapacity--;

        const salt = await bcrypt.genSalt(10);
        const newPassword = await bcrypt.hash("123456", salt);

        let newUserCount;
        await academicMemberModel.nextCount().then(count => {
            newUserCount = count;
        });

        const newUser = new academicMemberModel({
            id: "ac-" + newUserCount,
            name: req.body.name,
            email: req.body.email,
            password: newPassword,
            gender: req.body.gender,
            role: req.body.role,
            department: department ? department._id : "UNASSIGNED",
            office: office._id,
            salary: req.body.salary,
            dayOff: req.body.dayOff
        });

        try {
            await newUser.save();
            await office.save();
            if (req.body.role === "Head of Department") {
                department.headOfDepartment = newUser.id;
                await department.save();
            }
            res.send("User added successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    })

router.route("/update-hr-member/:id")
    .put(async (req, res) => {
        const user = await hrMemberModel.findOne({ id: req.params.id });
        if (!user) {
            res.status(404).send("Incorrect user id");
            return;
        }

        if (req.body.name) {
            user.name = req.body.name;
        }

        if (req.body.email) {
            if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
                res.status(400).send("Invalid email address");
                return;
            }

            let otherUser = await hrMemberModel.findOne({ email: req.body.email });
            if (!otherUser) {
                otherUser = await academicMemberModel.findOne({ email: req.body.email });
            }
            if (otherUser) {
                if (otherUser.id !== user.id) {
                    res.status(409).send("Email already exists");
                    return;
                }
            }

            user.email = req.body.email;
        }

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            user.password = hashedPassword;
        }

        if (req.body.gender) {
            user.gender = req.body.gender;
        }

        if (req.body.office) {
            var newOffice = await roomModel.findOne({ name: req.body.office });
            if (!newOffice) {
                res.status(422).send("Incorrect office name");
                return;
            }
            if (newOffice.type !== "Office") {
                res.status(422).send("Room must be an office");
                return;
            }
            if (newOffice.remainingCapacity === 0) {
                res.status(409).send("Office has full capacity");
                return;
            }
            var oldOffice = await roomModel.findOne({ _id: user.office });
            if (oldOffice._id.toString() !== newOffice._id.toString()) {
                oldOffice.remainingCapacity++;
                newOffice.remainingCapacity--;
                user.office = newOffice._id;
            }
        }

        if (req.body.salary) {
            user.salary = req.body.salary;
        }

        try {
            await user.save();
            if (req.body.office && oldOffice._id.toString() !== newOffice._id.toString()) {
                await newOffice.save();
                await oldOffice.save();
            }
            if (req.body.password) {
                let blacklistEntry = await userBlacklistModel.findOne({ user: user.id });
                if (blacklistEntry) {
                    blacklistEntry.blockedAt = new Date();
                }
                else {
                    blacklistEntry = new userBlacklistModel({
                        user: user.id,
                        blockedAt: new Date()
                    });
                }
                await blacklistEntry.save();
            }
            res.send("User updated successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/update-academic-member/:id")
    .put(async (req, res) => {
        const user = await academicMemberModel.findOne({ id: req.params.id });
        if (!user) {
            res.status(404).send("Incorrect user id");
            return;
        }

        if (req.body.name) {
            user.name = req.body.name;
        }

        if (req.body.email) {
            if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
                res.status(400).send("Invalid email address");
                return;
            }

            let otherUser = await hrMemberModel.findOne({ email: req.body.email });
            if (!otherUser) {
                otherUser = await academicMemberModel.findOne({ email: req.body.email });
            }
            if (otherUser) {
                if (otherUser.id !== user.id) {
                    res.status(409).send("Email already exists");
                    return;
                }
            }

            user.email = req.body.email;
        }

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            user.password = hashedPassword;
        }

        if (req.body.gender) {
            user.gender = req.body.gender;
        }

        if (req.body.department) {
            var department = await departmentModel.findOne({ name: req.body.department });
            if (!department) {
                res.status(422).send("Incorrect department name");
                return;
            }
            var oldDepartment  = await departmentModel.findOne({ name: req.body.department });
            if (!req.body.role && user.role === "Head of Department") {
                if (department.headOfDepartment !== "UNASSIGNED") {
                    res.status(409).send("Department already has a head");
                    return;
                }
                oldDepartment.headOfDepartment = "UNASSIGNED";
                department.headOfDepartment = user.id;
            }
            if (req.body.role === "Head of Department") {
                if (department.headOfDepartment !== "UNASSIGNED") {
                    res.status(409).send("Department already has a head");
                    return;
                }
                if (user.role === "Head of Department") {
                    oldDepartment.headOfDepartment = "UNASSIGNED";
                }
                department.headOfDepartment = user.id;
            }
            user.department = department._id;
        }

        if (req.body.role) {
            if (req.body.role === "Course Coordinator") {
                res.status(403).send("You cannot assign an academic member to be a course coordinator");
                return;
            }
            if (req.body.role === "Head of Department" && !req.body.department) {
                department = await departmentModel.findOne({ _id: user.department });
                if (department.headOfDepartment !== "UNASSIGNED") {
                    res.status(409).send("Department already has a head");
                    return;
                }
                department.headOfDepartment = user.id;
            }
            else if (req.body.role !== "Head of Department" && user.role === "Head of Department") {
                if (req.body.department) {
                    oldDepartment.headOfDepartment = "UNASSIGNED";
                }
                else {
                    department = await departmentModel.findOne({ _id: user.department });
                    department.headOfDepartment = "UNASSIGNED";
                }
            }
            user.role = req.body.role;
        }

        if (req.body.office) {
            var newOffice = await roomModel.findOne({ name: req.body.office });
            if (!newOffice) {
                res.status(422).send("Incorrect office name");
                return;
            }
            if (newOffice.type !== "Office") {
                res.status(422).send("Room must be an office");
                return;
            }
            if (newOffice.remainingCapacity === 0) {
                res.status(409).send("Office has full capacity");
                return;
            }
            var oldOffice = await roomModel.findOne({ _id: user.office });
            if (oldOffice._id.toString() !== newOffice._id.toString()) {
                oldOffice.remainingCapacity++;
                newOffice.remainingCapacity--;
                user.office = newOffice._id;
            }
        }

        if (req.body.salary) {
            user.salary = req.body.salary;
        }

        if (req.body.dayOff) {
            user.dayOff = req.body.dayOff;
        }

        try {
            await user.save();
            if (req.body.office && oldOffice._id.toString() !== newOffice._id.toString()) {
                await newOffice.save();
                await oldOffice.save();
            }
            if (department) {
                await department.save();
            }
            if (oldDepartment) {
                await oldDepartment.save();
            }
            if (req.body.password) {
                let blacklistEntry = await userBlacklistModel.findOne({ user: user.id });
                if (blacklistEntry) {
                    blacklistEntry.blockedAt = new Date();
                }
                else {
                    blacklistEntry = new userBlacklistModel({
                        user: user.id,
                        blockedAt: new Date()
                    });
                }
                await blacklistEntry.save();
            }
            res.send("User updated successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/delete-hr-member/:id")
    .delete(async (req, res) => {
        const user = await hrMemberModel.findOneAndDelete({ id: req.params.id });
        if (!user) {
            res.status(404).send("Incorrect user id");
            return;
        }

        const office = await roomModel.findOne({ _id: user.office });
        office.remainingCapacity++;
        await office.save();

        await attendanceRecordModel.deleteMany({ user: user.id });

        res.send("User deleted successfully");
    });

router.route("/delete-academic-member/:id")
    .delete(async (req, res) => {
        const user = await academicMemberModel.findOne({ id: req.params.id });
        if (!user) {
            res.status(404).send("Incorrect user id");
            return;
        }

        const slots = await slotModel.find({ staffMember: user.id });
        if (slots.length !== 0) {
            res.status(409).send("Cannot delete user. Reassign his slots first");
            return;
        }

        await academicMemberModel.findOneAndDelete({ id: user.id });

        const office = await roomModel.findOne({ _id: user.office });
        office.remainingCapacity++;
        await office.save();

        if (user.role === "Teaching Assistant" || user.role === "Course Coordinator") {
            let courses = await courseModel.find({ teachingAssistants: user.id });
            for (let i = 0; i < courses.length; i++) {
                let course = courses[i];
                let userIndex = course.teachingAssistants.indexOf(user.id);
                course.teachingAssistants.splice(userIndex, 1);
                await course.save();
            }
        }
        else {
            let courses = await courseModel.find({ courseInstructors: user.id });
            for (let i = 0; i < courses.length; i++) {
                let course = courses[i];
                let userIndex = course.courseInstructors.indexOf(user.id);
                course.courseInstructors.splice(userIndex, 1);
                await course.save();
            }
        }

        if (user.role === "Course Coordinator") {
            let courses = await courseModel.find({ courseCoordinator: user.id });
            for (let i = 0; i < courses.length; i++) {
                let course = courses[i];
                course.courseCoordinator = "UNASSIGNED";
                await course.save();
            }
        }
        else if (user.role === "Head of Department") {
            let department = await departmentModel.findOne({ headOfDepartment: user.id });
            department.headOfDepartment = "UNASSIGNED";
            await department.save();
        }

        await attendanceRecordModel.deleteMany({ user: user.id });
        await notificationModel.deleteMany({ user: user.id });
        await requestModel.deleteMany({ requestedBy: user.id });

        res.send("User deleted successfully");
    });

router.route("/add-room")
    .post(async (req, res) => {
        const newRoom = new roomModel({
            name: req.body.name,
            capacity: req.body.capacity,
            remainingCapacity: req.body.capacity,
            type: req.body.type
        });

        try {
            await newRoom.save();
            res.send("Room added successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/update-room/:room")
    .put(async (req, res) => {
        let room = await roomModel.findOne({ name: req.params.room });
        if (!room) {
            res.status(404).send("Incorrect room name");
            return;
        }

        if (req.body.name) {
            room.name = req.body.name;
        }

        let personsAssigned = room.capacity - room.remainingCapacity;
        if (req.body.capacity) {
            if (personsAssigned > req.body.capacity) {
                res.status(409).send("Cannot update capacity, Reassign people in office first");
                return;
            }
            room.capacity = req.body.capacity;
            room.remainingCapacity = req.body.capacity - personsAssigned;
        }

        if (req.body.type) {
            if (room.type === "Office" && req.body.type !== "Office" && personsAssigned > 0) {
                res.status(409).send("Cannot update type. Reassign people in office first");
                return;
            }

            const slot = await slotModel.findOne({ room: room._id });
            if (slot && room.type !== req.body.type) {
                res.status(409).send("Cannot update type. Reassign slots first");
                return;
            }

            room.type = req.body.type;
        }

        try {
            await room.save();
            res.send("Room updated successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/delete-room/:room")
    .delete(async (req, res) => {
        let room = await roomModel.findOne({ name: req.params.room });
        if (!room) {
            res.status(404).send("Incorrect room name");
            return;
        }

        const slot = await slotModel.findOne({ room: room._id });
        if (slot) {
            res.status(409).send("Cannot delete room. Reassign slots first");
            return;
        }

        if (room.type === "Office" && room.capacity !== room.remainingCapacity) {
            res.status(409).send("Cannot delete room. Reassign people in it first");
            return;
        }

        await roomModel.findOneAndDelete({ name: req.params.room });

        res.send("Room deleted successfully");
    });

router.route("/add-course")
    .post(async (req, res) => {
        if (req.body.department) {
            var department = await departmentModel.findOne({ name: req.body.department });
            if (!department) {
                res.status(422).send("Incorrect department name");
                return;
            }
        }

        const newCourse = new courseModel({
            id: req.body.id,
            name: req.body.name,
            department: department ? department._id : "UNASSIGNED",
        });

        try {
            await newCourse.save();
            res.send("Course added successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/update-course/:id")
    .put(async (req, res) => {
        let course = await courseModel.findOne({ id: req.params.id });
        if (!course) {
            res.status(404).send("Incorrect course id");
            return;
        }

        if (req.body.id) {
            course.id = req.body.id;
        }
        if (req.body.name) {
            course.name = req.body.name;
        }
        if (req.body.department) {
            const department = await departmentModel.findOne({ name: req.body.department });
            if (!department) {
                res.status(422).send("Incorrect department name");
                return;
            }
            course.department = department._id;
        }
        

        try {
            await course.save();
            res.send("Course updated successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/delete-course/:id")
    .delete(async (req, res) => {
        let course = await courseModel.findOneAndDelete({ id: req.params.id });
        if (!course) {
            res.status(404).send("Incorrect course id");
            return;
        }

        let otherCourse = await courseModel.findOne({ courseCoordinator: course.courseCoordinator });
        if (!otherCourse) {
            let courseCoordinator = await academicMemberModel.findOne({ id: course.courseCoordinator });
            courseCoordinator.role = "Teaching Assistant";
            await courseCoordinator.save();
        }

        await slotModel.deleteMany({ course: course._id });
        // TODO: delete requests
        console.log("Here");
        res.send("Course deleted successfully");
    });

router.route("/add-department")
    .post(async (req, res) => {
        if (req.body.faculty) {
            var faculty = await facultyModel.findOne({ name: req.body.faculty });
            if (!faculty) {
                res.status(422).send("Incorrect faculty name");
                return;
            }
        }

        if (req.body.headOfDepartment) {
            var headOfDepartment = await academicMemberModel.findOne({ id: req.body.headOfDepartment });
            if (!headOfDepartment) {
                res.status(422).send("Incorrect academic member id");
                return;
            }
            if (headOfDepartment.role === "Head of Department") {
                res.status(409).send("Academic member is already the head of another department");
                return;
            }
            if (headOfDepartment.role !== "Course Instructor") {
                res.status(409).send("Academic member is not an instructor");
                return;
            }
            if (headOfDepartment.department !== "UNASSIGNED") {
                res.status(409).send("Academic member is in another department");
                return;
            }
        }

        let newDepartment = new departmentModel({
            name: req.body.name,
            faculty: faculty ? faculty._id : "UNASSIGNED",
            headOfDepartment: headOfDepartment ? headOfDepartment.id : "UNASSIGNED"
        });

        try {
            await newDepartment.save();
            if (headOfDepartment) {
                newDepartment = await departmentModel.findOne({ name: req.body.name });
                headOfDepartment.role = "Head of Department";
                headOfDepartment.department = newDepartment._id;
                await headOfDepartment.save();
            }
            res.send("Department added successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/update-department/:department")
    .put(async (req, res) => {
        let department = await departmentModel.findOne({ name: req.params.department });
        if (!department) {
            res.status(404).send("Incorrect department name");
            return;
        }

        if (req.body.name) {
            department.name = req.body.name;
        }
        if (req.body.faculty) {
            if(req.body.faculty==="UNASSIGNED") {
                department.faculty = "UNASSIGNED"; 
            }
            else {
                const faculty = await facultyModel.findOne({ name: req.body.faculty });
            if (!faculty) {
                res.status(422).send("Incorrect faculty name");
                return;
            }
            department.faculty = faculty._id;
        
            }
            }
        if (req.body.headOfDepartment) {
            var newHeadOfDepartment = await academicMemberModel.findOne({ id: req.body.headOfDepartment });
            if (!newHeadOfDepartment) {
                res.status(422).send("Incorrect academic member id");
                return;
            }
            if (newHeadOfDepartment.role === "Head of Department") {
                if (!(newHeadOfDepartment.department===departmentModel._id)) {
                    res.status(409).send("Academic member is already the head of another department");
                    return;
                }
            }
            if (newHeadOfDepartment.role !== "Course Instructor") {
                res.status(409).send("Academic member is not an instructor");
                return;
            }
            if (newHeadOfDepartment.department !== department._id.toString() && newHeadOfDepartment.department !== "UNASSIGNED") {
                res.status(409).send("Academic member is in another department");
                return;
            }
            var oldHeadOfDepartment = await academicMemberModel.findOne({ id: department.headOfDepartment });
            if (oldHeadOfDepartment) {
                oldHeadOfDepartment.role = "Course Instructor";
            }
            newHeadOfDepartment.role = "Head of Department";
            newHeadOfDepartment.department = department._id;
            department.headOfDepartment = newHeadOfDepartment.id;
        }

        try {
            await department.save();
            if (newHeadOfDepartment) {
                await newHeadOfDepartment.save();

            }
            if (oldHeadOfDepartment) {
                await oldHeadOfDepartment.save();
            }
            res.send("Department updated successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }

    });

router.route("/delete-department/:department")
    .delete(async (req, res) => {
        let department = await departmentModel.findOneAndDelete({ name: req.params.department });
        if (!department) {
            res.status(404).send("Incorrect department name");
            return;
        }

        let courses = await courseModel.find({ department: department._id });
        for (i = 0; i < courses.length; i++) {
            let course = courses[i];
            course.department = "UNASSIGNED";
            await course.save();
        }

        let academicMembers = await academicMemberModel.find({ department: department._id });
        for (i = 0; i < academicMembers.length; i++) {
            let academicMember = academicMembers[i];
            academicMember.department = "UNASSIGNED";
            await academicMember.save();
        }

        if (department.headOfDepartment !== "UNASSIGNED") {
            let headOfDepartment = await academicMemberModel.findOne({ id: department.headOfDepartment });
            headOfDepartment.role = "Course Instructor";
            await headOfDepartment.save();
        }

        res.send("Department deleted successfully");
    });

router.route("/add-faculty")
    .post(async (req, res) => {
        const newFaculty = new facultyModel({
            name: req.body.name,
        });

        try {
            await newFaculty.save();
            res.send("Faculty added successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/update-faculty/:faculty")
    .put(async (req, res) => {
        let faculty = await facultyModel.findOne({ name: req.params.faculty });
        if (!faculty) {
            res.status(404).send("Incorrect faculty name");
            return;
        }

        faculty.name = req.body.name;
        try {
            await faculty.save();
            res.send("Faculty updated successfully");
        }
        catch (error) {
            console.log(error.message);
            res.status(400).send(error.message);
        }
    });

router.route("/delete-faculty/:faculty")
    .delete(async (req, res) => {
        let faculty = await facultyModel.findOneAndDelete({ name: req.params.faculty });
        if (!faculty) {
            res.status(404).send("Incorrect faculty name");
            return;
        }

        let departments = await departmentModel.find({ faculty: faculty._id });
        for (i = 0; i < departments.length; i++) {
            let department = departments[i];
            department.faculty = "UNASSIGNED";
            department.save();
        }

        res.send("Faculty deleted successfully");
    });

router.route("/view-staff-attendance-records")
    .get(async (req, res) => {
        if (!req.body.month && (req.body.year || req.body.year == 0)) {
            if (req.body.month !== 0) {
                res.send("No month specified");
                return;
            }
            if (req.body.month === 0) {
                res.send("Not a valid month");
                return;
            }
        }

        if (!req.body.year && (req.body.month || req.body.month === 0)) {
            if (req.body.year !== 0) {
                res.send("No year specified");
                return;
            }
            if (req.body.year === 0) {
                res.send("Not a valid year");
                return;
            }
        }
        if (!req.body.id) {
            res.send("No user entered.")
            return;
        }
        if (typeof req.body.id !== "string") {
            res.send("Wrong datatypes entered.")
            return;
        }
        let user = await hrMemberModel.findOne({ id: req.body.id });
        if (!user) {
            user = await academicMemberModel.findOne({ id: req.body.id });
        }
        if (!user) {
            res.send("Invalid user id.")
            return;
        }
        var userAttendanceRecords;
        var month;
        var year;

        if (!req.body.month) {
            month = new Date().getMonth();
            year = new Date().getFullYear();
            userAttendanceRecords = await attendanceRecordModel.find({
                $or: [
                    { user: user.id, signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) } },
                    { user: user.id, signOutTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) } }
                ]
            });
        }
        else {
            if (typeof req.body.month !== "number" || typeof req.body.year !== "number") {
                res.send("Wrong data types entered.");
                return;
            }
            month = req.body.month - 1;
            year = req.body.year;
            if (month < 0 || month > 11) {
                res.send("Not a valid month");
                return;
            }
            if (year < 2000) {
                res.send("Not a valid year");
                return;
            }
            userAttendanceRecords = await attendanceRecordModel.find({
                $or: [
                    { user: req.body.id, signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) } },
                    { user: req.body.id, signOutTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) } }
                ]
            });
        }

        res.send(userAttendanceRecords);
    })

router.route("/view-staff-missing-days")
    .get(async (req, res) => {
        if (!req.body.month && (req.body.year || req.body.year == 0)) {
            if (req.body.month !== 0) {
                res.send("No month specified");
                return;
            }
            if (req.body.month === 0) {
                res.send("Not a valid month");
                return;
            }
        }

        if (!req.body.year && (req.body.month || req.body.month === 0)) {
            if (req.body.year !== 0) {
                res.send("No year specified");
                return;
            }
            if (req.body.year === 0) {
                res.send("Not a valid year");
                return;
            }
        }
        if (!req.body.month) {
            const currentDate = new Date();
            if (currentDate.getDate() >= 11) {
                var month = currentDate.getMonth();
                var year = currentDate.getFullYear();
            }
            else {
                if (currentDate.getMonth() === 0) {
                    month = 11;
                    year = currentDate.getFullYear() - 1;
                }
                else {
                    month = currentDate.getMonth() - 1;
                    year = currentDate.getFullYear();
                }
            }
        }
        else {

            if (typeof req.body.month !== "number" || typeof req.body.year !== "number") {
                res.send("Wrong data types entered.");
                return;
            }
            month = req.body.month - 1;
            year = req.body.year;
            if (month < 0 || month > 11) {
                res.send("Not a valid month");
                return;
            }
            if (year < 2000) {
                res.send("Not a valid year");
                return;
            }
        }

        let hrMembers = await hrMemberModel.find({});
        let academicMembers = await academicMemberModel.find({});
        let membersWithMissingDays = [];

        for (let i = 0; i < hrMembers.length; i++) {

            let user = hrMembers[i];
            let dayOff = convertDay(user.dayOff);
            let userAttendanceRecords = await attendanceRecordModel.find({ user: user.id, signInTime: { $ne: null, $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) }, signOutTime: { $ne: null } });

            await getMissingDays(month, year, dayOff, userAttendanceRecords, user).then(result => {
                if (result.missingDays.length > 0) {
                    membersWithMissingDays.push({ id: user.id, missingDays: result.missingDays });
                }
            }).catch(err => {
                console.log(err);
                res.status(500).send("Error");
            })
        }
        for (let i = 0; i < academicMembers.length; i++) {

            let user = academicMembers[i];
            let dayOff = convertDay(user.dayOff);
            let userAttendanceRecords = await attendanceRecordModel.find({ user: user.id, signInTime: { $ne: null, $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) }, signOutTime: { $ne: null } });

            await getMissingDays(month, year, dayOff, userAttendanceRecords, user).then(result => {
                if (result.missingDays.length > 0) {
                    membersWithMissingDays.push({ id: user.id, missingDays: result.missingDays });
                }
            }).catch(err => {
                console.log(err);
                res.status(500).send("Error");
            })
        }
        res.send(membersWithMissingDays);
    });

router.route("/view-staff-missing-hours")
    .get(async (req, res) => {
        if (!req.body.month && (req.body.year || req.body.year == 0)) {
            if (req.body.month !== 0) {
                res.send("No month specified");
                return;
            }
            if (req.body.month === 0) {
                res.send("Not a valid month");
                return;
            }
        }

        if (!req.body.year && (req.body.month || req.body.month === 0)) {
            if (req.body.year !== 0) {
                res.send("No year specified");
                return;
            }
            if (req.body.year === 0) {
                res.send("Not a valid year");
                return;
            }
        }
        if (!req.body.month) {
            const currentDate = new Date();
            if (currentDate.getDate() >= 11) {
                var month = currentDate.getMonth();
                var year = currentDate.getFullYear();
            }
            else {
                if (currentDate.getMonth() === 0) {
                    month = 11;
                    year = currentDate.getFullYear() - 1;
                }
                else {
                    month = currentDate.getMonth() - 1;
                    year = currentDate.getFullYear();
                }
            }
        }
        else {

            if (typeof req.body.month !== "number" || typeof req.body.year !== "number") {
                res.send("Wrong data types entered.");
                return;
            }
            month = req.body.month - 1;
            year = req.body.year;
            if (month < 0 || month > 11) {
                res.send("Not a valid month");
                return;
            }
            if (year < 2000) {
                res.send("Not a valid year");
                return;
            }
        }

        let hrMembers = await hrMemberModel.find({});
        let academicMembers = await academicMemberModel.find({});
        let membersWithMissingHours = [];

        for (let i = 0; i < hrMembers.length; i++) {
            let user = hrMembers[i];
            let dayOff = convertDay(user.dayOff);
            let userAttendanceRecords = await attendanceRecordModel.find({ user: user.id, signInTime: { $ne: null, $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) }, signOutTime: { $ne: null } });
            let missingHours;
            await getMissingAndExtraHours(month, year, dayOff, userAttendanceRecords, user).then(result => {
                if (result.missingHours > 0) {
                    membersWithMissingHours.push({ id: user.id, missingHours: result.missingHours });
                }

            }).catch(err => {
                console.log(err);
                res.status(500).send("Error");
            })
        }

        for (let i = 0; i < academicMembers.length; i++) {
            let user = academicMembers[i];
            let dayOff = convertDay(user.dayOff);
            let userAttendanceRecords = await attendanceRecordModel.find({ user: user.id, signInTime: { $ne: null, $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) }, signOutTime: { $ne: null } });
            await getMissingAndExtraHours(month, year, dayOff, userAttendanceRecords, user).then(result => {
                if (result.missingHours > 0) {
                    membersWithMissingHours.push({ id: user.id, missingHours: result.missingHours });
                }
            }).catch(err => {
                console.log(err);
                res.status(500).send("Error");
            })
        }
        res.send(membersWithMissingHours);
    });

router.route("/add-missing-record")
    .post(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        if (req.body.id === token.id) {
            res.send("Cannot add missing record for yourself");
            return;
        }

        let user = await hrMemberModel.findOne({ id: req.body.id });
        if (!user) {
            user = await academicMemberModel.findOne({ id: req.body.id });
        }
        if (!user) {
            res.send("Invalid user id.");
            return;
        }

        let missingRecordType = req.body.missingRecordType;
        let signInYear = req.body.signInYear;
        let signInMonth = req.body.signInMonth - 1;
        let signInDay = req.body.signInDay;
        let signInHour = req.body.signInHour;
        let signInMinute = req.body.signInMinute;
        let signOutYear = req.body.signOutYear;
        let signOutMonth = req.body.signOutMonth - 1;
        let signOutDay = req.body.signOutDay;
        let signOutHour = req.body.signOutHour;
        let signOutMinute = req.body.signOutMinute;
        let signInDate;
        let signOutDate;
        let userRecord = {};

        if (!missingRecordType === "signOut" && !missingRecordType === "SignIn" && !missingRecordType === "fullDay") {
            res.send("Inavalid missing record type.");
            return;
        }
        if (signInYear === 0 || signOutYear === 0) {
            res.send("Not a valid year");
            return;
        }
        if (signInMonth === 0 || signOutMonth === 0) {
            res.send("Not a valid month");
            return;
        }
        if (signInDay === 0 || signOutDay === 0) {
            res.send("Not a valid day");
            return;
        }
        if (!signInYear || !signOutYear || !signInMonth || !signOutMonth || !signInDay || !signOutDay
            || (!signInHour && signInHour !== 0) || (!signOutHour && signOutHour !== 0) || (!signInMinute && signInMinute !== 0) || (!signOutMinute && signOutMinute !== 0)) {
            res.send("Not all fields are entered.");
            return;
        }
        if (typeof signInYear !== "number" || typeof signOutYear !== "number" || typeof signInMonth !== "number" || typeof signOutMonth !== "number"
            || typeof signInDay !== "number" || typeof signOutDay !== "number" || typeof signInHour !== "number" || typeof signOutHour !== "number"
            || typeof signInMinute !== "number" || typeof signOutMinute !== "number" || typeof missingRecordType !== "string") {
            res.send("Wrong data types entered.");
            return;
        }
        if (signInYear < 2000 || signOutYear < 2000) {
            res.send("Invalid year.");
            return;
        }
        if (signInMonth <= 0 || signInMonth > 12 || signOutMonth <= 0 || signOutMonth > 12) {
            res.send("Invalid month.");
            return;
        }
        if (signInHour < 0 || signInHour > 23 || signOutHour < 0 || signOutHour > 23) {
            res.send("Invalid hour.");
            return;
        }
        if (signInMinute < 0 || signInMinute > 59 || signOutMinute < 0 || signOutMinute > 59) {
            res.send("Invalid hour.");
            return;
        }
        if (signInDay !== signOutDay || signInMonth !== signOutMonth || signInYear !== signOutYear) {
            res.send("Cannot match these records together ");
            return;
        }
        if (signInHour > signOutHour) {
            res.send("Cannot have the sign in hour that is greater than the sign out hour.");
            return;
        }
        if (signInHour === signOutHour && signInMinute > signOutMinute) {
            res.send("Cannot have the sign in hour equal to the sign out hour if the sign in minute is greater than the sign out minute.");
            return;
        }
        signInDate = new Date(signInYear, signInMonth - 1, signInDay, signInHour, signInMinute, 0, 0);
        signOutDate = new Date(signOutYear, signOutMonth - 1, signOutDay, signOutHour, signOutMinute, 0, 0);


        if (missingRecordType === "signIn") {
            userRecord = await attendanceRecordModel.findOne({
                user: user.id, signOutTime: {
                    $gte: signOutDate,
                    $lte: new Date(signOutYear, signOutMonth - 1, signOutDay, signOutHour, signOutMinute, 59, 0)
                }, signInTime: null
            })

            if (!userRecord) {
                res.send("Could not find specified sign out time.");
                return;
            }
            else {
                userRecord.signInTime = signInDate;
                try {
                    await userRecord.save();
                    res.send(userRecord);
                }
                catch (error) {
                    console.log(error.message)
                    res.send(error);
                }
            }
        }
        else if (missingRecordType === "signOut") {

            userRecord = await attendanceRecordModel.findOne({
                user: user.id, signInTime: {
                    $gte: signInDate,
                    $lte: new Date(signInYear, signInMonth - 1, signInDay, signInHour, signInMinute, 59, 0)
                }, signOutTime: null
            })

            if (!userRecord) {
                res.send("Could not find specified sign in time.");
                return;
            }
            else {
                userRecord.signOutTime = signOutDate;
                try {
                    await userRecord.save();
                    res.send(userRecord);
                }
                catch (error) {
                    console.log(error.message)
                    res.send(error);
                }
            }
        }
        else if (missingRecordType === "fullDay") {
            userRecord = new attendanceRecordModel({
                user: user.id,
                signInTime: signInDate,
                signOutTime: signOutDate

            })
            try {
                await userRecord.save();
                res.send(userRecord);
            }
            catch (error) {
                console.log(error.message)
                res.send(error);
            }
        }

    });

module.exports = router;