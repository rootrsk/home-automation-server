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
        message:'Welcome to rootrsk backend socket',
        device: req.useragent.source,
        
    })
})
app.get('/status',(req,res)=>{
    res.send({
        status:200,
        connection:'Successful',
        device: req.useragent.source
    })
})

http.listen(PORT,()=>{
    console.log(`Server started at port ${PORT}`)
})

const switchStatus = [false,false,false,false,false,false,false,false]
const arduinoStatus = {status:false}

io.on('connection', async(socket) => {
    console.log("New Connection")
    socket.emit('message',{message:'Welcome'})
    socket.on('join',async({username,password,room})=>{
        
        try {
            const user = await User.findByCredentials({email:username,username,password})
            if(!user) throw new Error('User not found.')
            const {error} = addUser({username: user.username,room,id:socket.id})
            if(error) throw new Error(error)
            socket.emit('login',{error:'',status: 200,user})
            socket.broadcast.to(room).emit('new_connection',{user,message:'new user has joined the room.'})
            
            socket.join(room)
            socket.emit('arduino-connection-status', {status: arduinoStatus.status})
            socket.emit('arduino-data', switchStatus)
            socket.emit('req-arduino-status','requested')
            if(user.username==='arduino'){
                console.log('arduion connected')
                arduinoStatus.status = true
                socket.broadcast.to('123').emit('arduino-connection-status',{status:true})
                console.log(getAllUsers())
            }

        } catch (error) {
            console.log(error)
            return socket.emit('login',{error:error.message,status:400})
        }
    })
    socket.on('switch-trigger',({switch_no,status,username})=>{
        switchStatus[switch_no-1] = status
        socket.broadcast.to('123').emit('switch-triggered', ({switch_no,status,username}))
    })

    socket.on('arduino-status',(status)=>{
        Object.entries(status).forEach(([key, value], index) => switchStatus[index] = Boolean(parseInt(value)));
        socket.broadcast.to('123').emit('arduino-data', switchStatus)
    })

    socket.on('sensor-send',({temp,humidity,co,ch,time})=>{
        if(!time) time= new Date();
        socket.broadcast.to('123').emit('sensor-sent', ({temp,humidity,co,ch,time}))
    })
    
    socket.on('disconnecting', async(reason) => {
        console.log("A user is disconnecting.")
        const user = await removeUser({id:socket.id})
        if(user){
            if (user.username === 'arduino') {
                socket.broadcast.to('123').emit('arduino-connection-status',{status:false})
                arduinoStatus.status  = false
            }
        }
    })
    socket.on('disconnect', async(reason) => {
        console.log("A user is disconnected.")
        const user = await removeUser({id:socket.id})
        if(user){
            if (user.username === 'arduino') {
                socket.broadcast.to('123').emit('arduino-connection-status',{status:false})
                arduinoStatus.status  = false
            }
        }
    })
});