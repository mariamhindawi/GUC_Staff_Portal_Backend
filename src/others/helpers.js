const { requestModel, maternityLeaveModel } = require("../models/request_model");

function datesEqual(date1, date2) {
  return date1.getDate() === date2.getDate()
    && date1.getMonth() === date2.getMonth()
    && date1.getFullYear() === date2.getFullYear();
}

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

function checkRecordTime(date) {
  const checkedDate = new Date(date);
  if (checkedDate.getHours() < 7) {
    checkedDate.setHours(7);
    checkedDate.setMinutes(0);
    checkedDate.setSeconds(0);
    checkedDate.setMilliseconds(0);
  }
  else if (checkedDate.getHours() > 18) {
    checkedDate.setHours(19);
    checkedDate.setMinutes(0);
    checkedDate.setSeconds(0);
    checkedDate.setMilliseconds(0);
  }
  else {
    checkedDate.setMilliseconds(0);
  }
  return checkedDate;
}

function getNumberOfDaysInMonth(currMonth, currYear) {
  switch (currMonth) {
    case 0:
    case 2:
    case 4:
    case 6:
    case 7:
    case 9:
    case 11:
      return 31;
    case 3:
    case 5:
    case 8:
    case 10:
      return 30;
    case 1:
      if (currYear % 4 === 0)
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

async function getMissingDays(month, year, user, userAttendanceRecords) {
  const dayOff = convertDay(user.dayOff);
  const numberOfDaysInMonth = getNumberOfDaysInMonth(month, year);
  const expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
  const normalDaysAttended = [];
  const daysOffAttended = [];
  const missingDays = [];

  for (let i = 0; i < userAttendanceRecords.length; i++) {
    const date = userAttendanceRecords[i].signInTime;
    if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
      normalDaysAttended.push(date.getDate());
    }
    else if (!daysOffAttended.includes(date.getDate())) {
      daysOffAttended.push(date.getDate());
    }
  }

  if (normalDaysAttended.length >= expectedDaysToAttend) {
    return missingDays;
  }

  for (let i = 0; i < numberOfDaysInMonth; i++) {
    const date = new Date(year, month, 11 + i);
    if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
      const request = (
        await requestModel.findOne({
          requestedBy: user.id,
          type: { $eq: "annualLeave", $eq: "accidentalLeave", $eq: "sickLeave", $eq: "compensationRequest" },
          day: date,
          status: "Accepted",
        }) ||
        (await maternityLeaveModel.find({
          requestedBy: user.id,
          type: "maternityLeave",
          day: { $lte: date },
          status: "Accepted",
        }).sort({ day: "desc" }).limit(1))[0]
      );
      if (!request
        || (request.type === "compensationRequest" && !daysOffAttended.includes(request.compensationDay.getDate()))
        || (request.type === "maternityLeave" && date > new Date(request.day.getTime() + (request.duration * 24 * 60 * 60 * 1000)))
      ) {
        missingDays.push(date);
      }
    }
  }
  return missingDays;
}

async function getNumberOfDaysWithExcuse(month, year, user) {
  const dayOff = convertDay(user.dayOff);
  let numberOfDaysWithExcuse = 0;

  const requests = await requestModel.find({
    requestedBy: user.id,
    type: { $eq: "annualLeave", $eq: "accidentalLeave", $eq: "sickLeave", $eq: "compensationRequest" },
    day: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) },
    status: "Accepted",
  });
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    if (request.type === "compensationRequest") {
      const day = request.compensationDay.getDate();
      const userAttendanceRecord = await attendanceRecordModel.findOne({
        user: user.id,
        signInTime: { $gte: new Date(year, month, day), $lt: new Date(year, month, day + 1) },
        signOutTime: { $gte: new Date(year, month, day), $lt: new Date(year, month, day + 1) },
      });
      if (userAttendanceRecord) {
        numberOfDaysWithExcuse++;
      }
    }
    else {
      numberOfDaysWithExcuse++;
    }
  }

  const maternityLeaveRequest = (await maternityLeaveModel.find({
    requestedBy: user.id,
    type: "maternityLeave",
    day: { $lte: new Date(year, month + 1, 11) },
    status: "Accepted",
  }).sort({ day: "desc" }).limit(1))[0];
  if (maternityLeaveRequest) {
    const firstDayOfMonth = new Date(year, month, 11);
    const lastDayOfMonth = new Date(year, month + 1, 10);
    const lastDayOfLeave = new Date(maternityLeaveRequest.day.getTime() + (maternityLeaveRequest.duration * 24 * 60 * 60 * 1000));
    if (lastDayOfLeave >= firstDayOfMonth) {
      const firstDay = maternityLeaveRequest.day < firstDayOfMonth ? firstDayOfMonth : maternityLeaveRequest.day;
      const lastDay = lastDayOfLeave < lastDayOfMonth ? lastDayOfLeave : lastDayOfMonth;
      let currentDay = new Date(firstDay);
      while (currentDay <= lastDay) {
        if (currentDay !== 5 && currentDay !== dayOff) {
          numberOfDaysWithExcuse++;
        }
        currentDay = new Date(year, month, currentDay.getDate() + 1);
      }
    }
  }

  return numberOfDaysWithExcuse;
}

async function getHours(month, year, user, userAttendanceRecords) {
  const dayOff = convertDay(user.dayOff);
  const numberOfDaysInMonth = getNumberOfDaysInMonth(month);
  const expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
  const numberOfDaysWithExcuse = await getNumberOfDaysWithExcuse(month, year, user);
  const requiredHours = (expectedDaysToAttend - numberOfDaysWithExcuse) * 8.4;

  let spentSeconds = 0;
  for (let i = 0; i < userAttendanceRecords.length; i++) {
    const signInTime = checkRecordTime(userAttendanceRecords[i].signInTime);
    const signOutTime = checkRecordTime(userAttendanceRecords[i].signOutTime);
    spentSeconds += (signOutTime - signInTime) / 1000;
  }

  const spentHours = spentSeconds / 3600;
  if (spentHours > requiredHours) {
    return { requiredHours: requiredHours, missingHours: 0, extraHours: spentHours - requiredHours };
  }
  else {
    return { requiredHours: requiredHours, missingHours: requiredHours - spentHours, extraHours: 0 };
  }
}

function calculateSalary(baseSalary, numberOfMissingDays, missingHours) {
  if (missingHours < 3.0) {
    missingHours = 0;
  }
  const hours = Math.floor(missingHours);
  const minutes = Math.floor((missingHours - hours) * 60);
  let calculatedSalary = baseSalary;
  calculatedSalary -= (numberOfMissingDays * (baseSalary / 60));
  calculatedSalary -= (hours * (baseSalary / 180));
  calculatedSalary -= (minutes * (baseSalary / 10800));
  calculatedSalary = calculatedSalary < 0 ? 0 : calculatedSalary;
  return calculatedSalary;
}

module.exports.datesEqual = datesEqual;
module.exports.getMissingDays = getMissingDays;
module.exports.getHours = getHours;
module.exports.calculateSalary = calculateSalary;
