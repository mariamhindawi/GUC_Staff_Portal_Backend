const mongoose = require("mongoose");

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
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['Under review','Accepted','Rejected','Not submitted'],
        default:'Not submitted'
    },
    HODComment:{
        type:String
    },
    replacementID:{
        type:String
    },
    replacementReply:{
        type: String,
        enum:['Accepted','Rejected','Waiting for reply']
    },
    reason:{
        type:String
    }
})

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
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['Under review','Accepted','Rejected'],
        default:'Under review'
    },
    HODComment:{
        type:String
    },
    reason:{
        type:String
    }
})

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
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['Under review','Accepted','Rejected'],
        default:'Under review'
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
})

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
    day:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['Under review','Accepted','Rejected'],
        default:'Under review'
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
})


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
    requestedBy:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['Under review','Accepted','Rejected'],
        default:'Under review'
    },
    HODComment:{
        type:String
    },
    reason:{
        type:String,
        required:true
    }
})


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
        enum:['Under review','Accepted','Rejected'],
        default:'Under review'
    },
    reason:{
        type:String
    },
    HODComment:{
        type:String
    }
})

const slotLinkingRequestSchema = new mongoose.Schema({
    type:{
        type:String,
        default:"slotLinkingRequest",
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
        type:String,
        required:true
    },
    slot:{
        type: Number,
        required:true
    },
    status:{
        type:String,
        enum:['Under review','Accepted','Rejected'],
        default:'Under review'
    },
    HODComment:{
        type:String
    }
})


module.exports.annualLeaveModel = mongoose.model("annualLeave", annualLeaveSchema, "request");
module.exports.accidentalLeaveModel = mongoose.model("accidentalLeave", accidentalLeaveSchema, "request");
module.exports.sickLeaveModel = mongoose.model("sickLeave", sickLeaveSchema, "request");
module.exports.slotLinkingModel = mongoose.model("slotLinkingLeave", slotLinkingRequestSchema, "request");
module.exports.compensationLeaveModel = mongoose.model("compensationLeave", compensationRequestSchema, "request");
module.exports.dayOffChangeModel = mongoose.model("dayOffChangeLeave", dayOffChangeRequestSchema, "request");
module.exports.maternityLeaveModel = mongoose.model("maternityLeave", maternityLeaveSchema, "request");