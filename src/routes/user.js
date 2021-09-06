const express = require('express')
const User = require('../models/user')
const router = new express.Router()
const axios = require('axios')
const userAuth = require('../middleware/userAuth')
const {userErrorHandler} = require('../middleware/error')
// const Chart = require('../models/chart')

router.get('/',(req,res)=>{
    res.send({
        message: 'success',
        data: {
            welcome: 'Welcome to rootrsk homeAutomation backend api',
            // headers :req.useragent,
            connection: 'Successful',
            device:{
                browser: req.useragent.browser,
                os: req.useragent.os,
                source: req.useragent.source
            },
            developed_by: 'Ravishankar (rootrsk)',
            front_end: 'https://rootrsk-homeautomation.world'
        }
    })
})
router.get('/weather',async(req,res)=>{
    try {
        const response = await axios({
            url:`https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API}&q=${req.query.location}&aqi=yes`,
            method:'get',
        })
        res.send({data: response.data})

    } catch (e) {
        console.log(e)
        res.send({error:e.message,success:false})
    }
})
router.post('/signup',async(req,res)=>{    
    try {
        const user = new User({
            name:req.body.name,
            username: req.body.username,
            email: req.body.email,
            contact_no: req.body.contact,
            password: req.body.password,
            city:req.body.city
        })
        await user.save()
        const token = user.genAuthToken()
        
        user.tokens = user.tokens.concat({
            token: token,
            browser: req.useragent.browser,
            device: req.useragent.os
        })
        let options = {
            // maxAge: 1000*60*60, // would expire after 30 seconds
            httpOnly: false, // The cookie only accessible by the web server
            signed: false // Indicates if the cookie should be signed
        }
        res.send({
            message: 'Account created successfully.',
            success:true,
            user: user,
            token,
            cookies: req.cookies
        })

    } catch (e) {
        const error = userErrorHandler(e.message)
        res.send({
            message: 'failed',
            error,
            success:false
        })
    }
})

router.post('/login',async(req,res)=>{

    try {
        console.log(req.headers.authorization)
        const user = await User.findByCredentials(req.body.email,req.body.password)
        const token = user.genAuthToken()
        user.tokens = user.tokens.concat({
            token: token,
            browser: req.useragent.browser,
            device: req.useragent.os
        })
        
        let options = {
            // maxAge: 1000*60*60, // would expire after 30 seconds
            httpOnly: false, // The cookie only accessible by the web server
            signed: false // Indicates if the cookie should be signed
        }
        res.cookie('auth_token',token,options)
        res.send({
            message:'success',
            user:user,
            token,
        })
    } catch (e) {
        res.send({
            message: 'failed',
            error: e.message
        })
    }
})

router.post('/user/logout',userAuth,async(req,res)=>{
    try {
        const user = req.user
        console.log(user)
        res.send({
            message: 'success',
            user: user,
        })
    } catch (e) {
        res.send({
            message: 'failed',
            error: e.message
        })
    }
})

router.get('/user/me',userAuth,async(req,res)=>{
    res.json({
        status: 'success',
        isAutheticated: true,
        user:req.user
    })
})

router.post('/user/dashboard',userAuth,async(req,res)=>{
    try {
        const charts = await Chart.findOne({user_id: req.user._id})
        const testsCount = await Test.countDocuments()
        const completed_tests = await Answer.find({}).countDocuments()
        res.json({
            status: 'success',
            message: 'Fetched Successfully',
            charts,
            user: req.user,
            total_attemps: charts.accuracy.length,
            total_tests: testsCount,
            completed_tests
        })
    } catch (e) {
        res.json({
            status: 'failed',
            error: e.message,
            message: 'Something went Wrong.'
        })
    }
})
router.post('/tests',async(req,res)=>{
    try {
        const tests =await Test.find({})
        res.json({
            status: 'success',
            message: 'Fetched Successfully',
            tests
        })
    } catch (e) {
        res.json({
            status: 'failed',
            error: e,
            message: 'Something went Wrong.'
        })
    }
})

module.exports = router