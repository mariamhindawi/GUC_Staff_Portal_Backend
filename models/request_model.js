const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
    id:{
        type:Number,
        required:true
    },
    type:{
        type:String,
        required:true,
        enum:['leave','slot-linking']
    },
    requestedBy:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['Under review','Accepted','Requested'],
        default:'Under review'
    },
    comment:{
        type:String
    }
})

module.exports = mongoose.model("request", requestSchema);