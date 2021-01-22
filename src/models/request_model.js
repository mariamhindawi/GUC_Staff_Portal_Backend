const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
    },
    requestedBy: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: "Under review",
        enum: ["Under review", "Accepted", "Rejected"],
    }
});

const replacementSchema = new mongoose.Schema({
    type: {
        type: String,
        default: "replacementRequest",
        immutable: true
    },
    id: {
        type: Number,
        required: true
    },
    requestedBy: {
        type: String,
        required: true
    },
    day: {
        type: Date,
        required: true
    },
    slot:{
        type:String,
        required:true
    },
    replacementID:{
        type:String,
        required:true
    },
    replacementReply:{
        type: String,
        enum:["Accepted","Rejected","Waiting for reply"]
    }
})
const annualLeaveSchema = new mongoose.Schema({
    type:{
        type:String,
        default:"annualLeave",
        immutable:true
    },
    id:{
        type:Number,
        required:true
    },
    requestedBy:{
        type:String,
        required:true
    },
    day:{
        type:Date,
        required:true
    },
    slots:{
        type:[{}],
        required:true
    },
    status:{
        type:String,
        enum:["Under review","Accepted","Rejected"],
        default:"Under review"
    },
    HODComment:{
        type:String
    },
    replacementIDs:{
        type:[String],
        required:true
    },
    reason:{
        type:String
    }
});

const accidentalLeaveSchema = new mongoose.Schema({
    type:{
        type:String,
        default:"accidentalLeave",
        immutable:true
    },
    id:{
        type:Number,
        required:true
    },
    requestedBy:{
        type:String,
        required:true
    },
    day:{
        type:Date,
        required:true
    },
    status:{
        type:String,
        enum:["Under review","Accepted","Rejected"],
        default:"Under review"
    },
    HODComment:{
        type:String
    },
    reason:{
        type:String
    }
});

const sickLeaveSchema = new mongoose.Schema({
    type:{
        type:String,
        default:"sickLeave",
        immutable:true
    },
    id:{
        type:Number,
        required:true
    },
    requestedBy:{
        type:String,
        required:true
    },
    day:{
        type:Date,
        required:true
    },
    status:{
        type:String,
        enum:["Under review","Accepted","Rejected"],
        default:"Under review"
    },
    HODComment:{
        type:String
    },
    document:{
        type:String,
        required:true
    },
    reason:{
        type:String
    }
});

const maternityLeaveSchema = new mongoose.Schema({
    type:{
        type:String,
        default:"maternityLeave",
        immutable:true
    },
    id:{
        type:Number,
        required:true
    },
    requestedBy:{
        type:String,
        required:true
    },
    duration:{
        type:Number,
        max:90
    },
    day:{
        type:Date,
        required:true
    },
    status:{
        type:String,
        enum:["Under review","Accepted","Rejected"],
        default:"Under review"
    },
    HODComment:{
        type:String
    },
    document:{
        type:String,
        required:true
    },
    reason:{
        type:String
    }
});


const compensationRequestSchema = new mongoose.Schema({
    type:{
        type:String,
        default:"compensationRequest",
        immutable:true
    },
    id:{
        type:Number,
        required:true
    },
    day:{
        type:Date,
        required:true
    },
    requestedBy:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:["Under review","Accepted","Rejected"],
        default:"Under review"
    },
    HODComment:{
        type:String
    },
    reason:{
        type:String,
        required:true
    }
});


const dayOffChangeRequestSchema = new mongoose.Schema({
    type:{
        type:String,
        default:"dayOffChangeRequest",
        immutable:true
    },
    id:{
        type:Number,
        required:true
    },
    requestedBy:{
        type:String,
        required:true
    },
    dayOff:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:["Under review","Accepted","Rejected"],
        default:"Under review"
    },
    reason:{
        type:String
    },
    HODComment:{
        type:String
    }
});

const slotLinkingRequestSchema = new mongoose.Schema({
    type:{
        type:String,
        default: "slotLinkingRequest",
        immutable: true
    },
    id:{
        type:Number,
        required: true
    },
    requestedBy:{
        type:String,
        required: true
    },
    slot:{
        type: String,
        required: true
    },
    status:{
        type: String,
        enum: ["Under review","Accepted","Rejected"],
        default: "Under review"
    },
    ccComment:{
        type:String
    }
});

module.exports.requestModel = mongoose.model("request", requestSchema, "requests");
module.exports.replacementModel = mongoose.model("replacementRequest", replacementSchema, "requests");
module.exports.annualLeaveModel = mongoose.model("annualLeave", annualLeaveSchema, "requests");
module.exports.accidentalLeaveModel = mongoose.model("accidentalLeave", accidentalLeaveSchema, "requests");
module.exports.sickLeaveModel = mongoose.model("sickLeave", sickLeaveSchema, "requests");
module.exports.slotLinkingModel = mongoose.model("slotLinkingRequest", slotLinkingRequestSchema, "requests");
module.exports.compensationLeaveModel = mongoose.model("compensationLeave", compensationRequestSchema, "requests");
module.exports.dayOffChangeModel = mongoose.model("dayOffChangeRequest", dayOffChangeRequestSchema, "requests");
module.exports.maternityLeaveModel = mongoose.model("maternityLeave", maternityLeaveSchema, "requests");