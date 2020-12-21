const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
    day:{
        type:String,
        enum:['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday'],
        required:true
    },
    slot:{
        type:Number,
        min:1,
        max:5,
        required:true
    },
    course:{
        type:String,
        required:true
    },
    room:{
        type:String,
        required:true
    },
    staffMember:{
        type:String
    },
    type:{
        type:String,
        enum:['Lab','Tutorial','Lecture'],
        required:true
    }
})

module.exports = mongoose.model("slot", slotSchema);