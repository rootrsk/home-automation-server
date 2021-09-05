const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    name:{
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true
    },
    contact_no: {
        type: Number,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    tokens: [{
        token: {
            type: String
        },
        device: {
            type: String
        },
        browser: {
            type: String
        }
    }],
    verified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: Number
    },
}, {
    timestamps: true
})


userSchema.statics.findByCredentials = async ({email,username, password}) => {
    var user = await User.findOne({email})
    if (!user){
        user = await User.findOne({username})
    } 
    if(!user) throw new Error('No such user found.')

    const isMatch = await bcrypt.compare(password, user.password)
    console.log(isMatch)
    if (!isMatch) throw new Error('Password is incorrect.')
    return user
}
userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()
    delete userObject.password
    delete userObject.tokens
    return userObject
}
userSchema.methods.genAuthToken = function () {
    const user = this
    const token = jwt.sign({
        _id: user._id.toString()
    }, process.env.JWT_SECRET)
    return token
}
userSchema.methods.emailVerificationToken = async function () {
    const user = this
    const token = jwt.sign({
        _id: user._id.toString()
    }, process.env.JWT_SECRET)
    return token
}
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8)
    }
    next()
})


const User = mongoose.model('User', userSchema)

module.exports = User