const express = require('express')
const app = require('express')()
const http = require('http').createServer(app)
const User = require('./src/models/user')
const io = require('socket.io')(http,{
    path:'/socket.io/',
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    }
})
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const useragent = require('express-useragent')
const cookieParser = require('cookie-parser')
require("dotenv").config();
const PORT = process.env.PORT || 3000
const userRouter = require('./src/routes/user')
const adminRouter = require('./src/routes/admin')
const NotificationRouter = require('./src/routes/notification')
const { addUser, removeUser, getAllUsers}  = require('./src/utils/userTracker')
app.use(express.json())
app.use(useragent.express())
app.use(cookieParser())
app.use(bodyParser.urlencoded({
    extended: true
}))
let liveSocket = null
app.use((req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin','*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next()
})

mongoose.connect(process.env.MONGODB_URL,{
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(()=>console.log('connected to database')).catch(()=>console.log('Unable to connect to database.'))

app.use(adminRouter)
app.use(userRouter)

app.get('/', (req, res) => {
    res.send({
        status: 200,
        connection: 'Successful',
        message:'Welcome to rootrsk homeAutomation Bankend Api',
        device: req.useragent.source,
        developed_by: 'Ravishankar (rootrsk)',
        front_end:'https://rootrsk-homeautomation.world'
    })
})
app.get('/status',(req,res)=>{
    res.send({
        status:200,
        connection:'Successful',
        device: req.useragent.source
    })
})
app.get('/voice',(req,res)=>{
    try {
        console.log(req.query)
        console.log(req.body)
        res.json({
            status:200
        })
    } catch (error) {
        res.json({
            status:404
        })
    }
})


http.listen(PORT,()=>{
    console.log(`Server started at port ${PORT}`)
})

const switchStatus = [false,false,false,false,false,false,false,false]
const arduinoStatus = {status:false}
app.post('/voice', (req, res) => {
    console.log(req.body,req.query)
    let switch_no = null
    const status = req.body.action === 'off'? false : true
    const username = 'Google Assistant'
    const nightLight = ['nightlight', 'night light', 'the night light','strip light','the strip light']
    const tubeLight = ['tubelight', 'tube light', 'light', 'the light','the tube light']
    const cellingFan = ['cellingfan', 'celling fan', 'fan']
    const laptop = ['laptop', 'laptopcharger', 'laptop charger', 'charger']
    const desktop = ['desktop', 'pc', 'desktop charger', 'desktopcharger', 'monitor']
    console.log(req.query.cmd.toLowerCase())
    if (nightLight.includes(req.query.cmd.toLowerCase().trim())) {
        switch_no = 1
    }
    if (tubeLight.includes(req.query.cmd.toLowerCase().trim())) {
        console.log('light command')
        switch_no = 7
    }
    if (cellingFan.includes(req.query.cmd.toLowerCase().trim())) {
        switch_no = 8
    }
    if (laptop.includes(req.query.cmd.toLowerCase().trim())) {
        switch_no = 5
    }
    if (desktop.includes(req.query.cmd.toLowerCase())) {
        switch_no = 6
    }
    if(!switch_no){
        return res.json({
            status: 'failed',
            error:'invalid command'
        })
    }
    try {
        if(process.env.VOICE_KEY!== req.body.key){
            return res.json({
                status:'failed',
                error:'invalid key'
            })
        }
        console.log(req.query)
        if (liveSocket) {
            console.log('liveSocket')
            switchStatus[switch_no-1] = status
            liveSocket.in('123').emit('switch-triggered', ({switch_no,status,username}))
            io.emit('hh','fuck')
        }
        res.json({
            status: 'success',
        })
    } catch (error) {
        console.log(error)
        res.json({
            status: 'failed',
            error: error.message
        })
    }
})

io.on('connection', async(socket) => {
    liveSocket = socket
    if(!liveSocket){
        return
    }
    io.on('hh',(x)=>{
        console.log(x)
    })
    console.log("New Connection")
    liveSocket.emit('message',{message:'Welcome'})
    liveSocket.on('join',async({username,password,room})=>{
        try {
            const user = await User.findByCredentials({email:username,username,password})
            if(!user) throw new Error('User not found.')
            const {error} = addUser({username: user.username,room,id:liveSocket.id})
            if(error) throw new Error(error)
            liveSocket.emit('login',{error:'',status: 200,user})
            liveSocket.broadcast.to(room).emit('new_connection',{user,message:'new user has joined the room.'})
            
            liveSocket.join(room)
            liveSocket.emit('arduino-connection-status', {status: arduinoStatus.status})
            liveSocket.emit('arduino-data', switchStatus)
            liveSocket.emit('req-arduino-status','requested')
            if(user.username==='arduino'){
                console.log('arduion connected')
                arduinoStatus.status = true
                liveSocket.broadcast.to('123').emit('arduino-connection-status',{status:true})
                console.log(getAllUsers())
            }
            // liveSocket = socket

        } catch (error) {
            console.log(error)
            return liveSocket.emit('login',{error:error.message,status:400})
        }
    })

    liveSocket.on('switch-trigger',({switch_no,status,username})=>{
        console.log('switch-trigger')
        console.log({switch_no,status,username})
        switchStatus[switch_no-1] = status
        liveSocket.broadcast.to('123').emit('switch-triggered', ({switch_no,status,username}))
    })
    
    liveSocket.on('arduino-status',(status)=>{
        Object.entries(status).forEach(([key, value], index) => switchStatus[index] = Boolean(parseInt(value)));
        liveSocket.broadcast.to('123').emit('arduino-data', switchStatus)
    })

    liveSocket.on('sensor-send',({temp,humidity,co,ch,time})=>{
        if(!time) time= new Date();
        liveSocket.broadcast.to('123').emit('sensor-sent', ({temp,humidity,co,ch,time}))
    })
    
    liveSocket.on('disconnecting', async(reason) => {
        console.log("A user is disconnecting.")
        const user = await removeUser({id:liveSocket.id})
        if(user){
            if (user.username === 'arduino') {
                liveSocket.broadcast.to('123').emit('arduino-connection-status',{status:false})
                arduinoStatus.status  = false
            }
        }
    })
    liveSocket.on('disconnect', async(reason) => {
        console.log("A user is disconnected.")
        const user = await removeUser({id:liveSocket.id})
        if(user){
            if (user.username === 'arduino') {
                liveSocket.broadcast.to('123').emit('arduino-connection-status',{status:false})
                arduinoStatus.status  = false
            }
        }
    })
});
