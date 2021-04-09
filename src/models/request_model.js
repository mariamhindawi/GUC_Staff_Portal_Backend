const mongoose = require("mongoose");
const { MongooseAutoIncrementID } = require("mongoose-auto-increment-reworked");

const requestSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  requestedBy: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["replacementRequest", "annualLeave", "accidentalLeave", "sickLeave",
      "maternityLeave", "compensationRequest", "dayOffChangeRequest", "slotLinkingRequest"],
  },
  status: {
    type: String,
    required: true,
    default: "Pending",
    enum: ["Pending", "Accepted", "Rejected"],
  }
});

const replacementSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "replacementRequest",
    immutable: true
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  requestedBy: {
    type: String,
    required: true
  },
  day: {
    type: Date,
    required: true
  },
  slot: {
    type: String,
    required: true
  },
  replacementID: {
    type: String,
    required: true
  },
  replacementReply: {
    type: String,
    enum: ["Accepted", "Rejected", "Waiting for reply"]
  }
});

const annualLeaveSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "annualLeave",
    immutable: true,
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  requestedBy: {
    type: String,
    required: true
  },
  day: {
    type: Date,
    required: true
  },
  slots: {
    type: [{}],
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  },
  HODComment: {
    type: String
  },
  replacementIDs: {
    type: [String],
    required: true
  },
  reason: {
    type: String
  }
});

const accidentalLeaveSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "accidentalLeave",
    immutable: true,
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  requestedBy: {
    type: String,
    required: true
  },
  day: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  },
  HODComment: {
    type: String
  },
  reason: {
    type: String
  }
});

const sickLeaveSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "sickLeave",
    immutable: true,
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  requestedBy: {
    type: String,
    required: true
  },
  day: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  },
  HODComment: {
    type: String
  },
  document: {
    type: String,
    required: true
  },
  reason: {
    type: String
  }
});

const maternityLeaveSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "maternityLeave",
    immutable: true,
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  requestedBy: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    max: 90
  },
  day: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  },
  HODComment: {
    type: String
  },
  document: {
    type: String,
    required: true
  },
  reason: {
    type: String
  }
});

const compensationRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "compensationRequest",
    immutable: true,
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  day: {
    type: Date,
    required: true
  },
  compensationDay: {
    type: Date,
    required: true
  },
  requestedBy: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  },
  HODComment: {
    type: String
  },
  reason: {
    type: String,
    required: true
  }
});

const dayOffChangeRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "dayOffChangeRequest",
    immutable: true,
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  requestedBy: {
    type: String,
    required: true
  },
  dayOff: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  },
  reason: {
    type: String
  },
  HODComment: {
    type: String
  }
});

const slotLinkingRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    default: "slotLinkingRequest",
    immutable: true,
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  requestedBy: {
    type: String,
    required: true
  },
  slot: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending"
  },
  ccComment: {
    type: String
  }
});


const mongooseAutoIncrementOptions = {
  modelName: "Request",
  field: "id",
  unique: true,
  startAt: 1,
  incrementBy: 1,
  nextCount: "nextCount",
  resetCount: "resetCount",
};
requestSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);
replacementSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);
annualLeaveSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);
accidentalLeaveSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);
sickLeaveSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);
slotLinkingRequestSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);
compensationRequestSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);
dayOffChangeRequestSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);
maternityLeaveSchema.plugin(MongooseAutoIncrementID.plugin, mongooseAutoIncrementOptions);

module.exports.requestModel = mongoose.model("Request", requestSchema, "Requests");
module.exports.replacementModel = mongoose.model("Replacement Request", replacementSchema, "Requests");
module.exports.annualLeaveModel = mongoose.model("Annual Leave Request", annualLeaveSchema, "Requests");
module.exports.accidentalLeaveModel = mongoose.model("Accidental Leave Request", accidentalLeaveSchema, "Requests");
module.exports.sickLeaveModel = mongoose.model("Sick Leave Request", sickLeaveSchema, "Requests");
module.exports.slotLinkingModel = mongoose.model("Slot Linking Request", slotLinkingRequestSchema, "Requests");
module.exports.compensationLeaveModel = mongoose.model("Compensation Leave Request", compensationRequestSchema, "Requests");
module.exports.dayOffChangeModel = mongoose.model("Day Off Change Request", dayOffChangeRequestSchema, "Requests");
module.exports.maternityLeaveModel = mongoose.model("Maternity Leave Request", maternityLeaveSchema, "Requests");
