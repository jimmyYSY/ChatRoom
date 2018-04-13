var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};


//分配用户昵称
function assignGuestName(socket, guestNumber, nickNames, namesUsed){
    //生成新昵称
    var name = 'Guest' + guestNumber;
    //把用户昵称和客户端连接ID关联
    nickNames[socket.id]= name;
    //让用户知道他们的昵称
    socket.emit('nameResult', {
	success: true,
	name: name
    });
    //存放已经被占用的昵称
    namesUsed.push(name);
    //增加用来生成昵称的计数器
    console.log('用户已进入');
    return guestNumber + 1;
}

//进入聊天室
function joinRoom(socket, room) {
    console.log('房间数据处理');
    //让用户进入房间
    socket.join(room);
    //记录用户的当前房间
    currentRoom[socket.id] = room;
    //让用户知道他们进入了新的房间
    socket.emit('joinResult', {room: room});
    //让房间里的其他用户知道有新用户进入了房间
    socket.broadcast.to(room).emit('message', {
	text: nickNames[socket.id] + ' has joined ' + room + ' . '
    });
    //确定有哪些用户在房间里
    var usersInRoom = io.sockets.clients(room);
    //如果不知一个用户在此房间中，汇总都有谁。
    if(usersInRoom.length > 1) {
	var usersInRoomSummary = 'Users currently in ' + room + ' : ';
	for (var index in usersInRoom) {
	    var userSocketId = usersInRoom[index].id;
	    if(userSocketId != socket.id){
		if(index > 0){
		    usersInRoomSummary += ', ';
		}
		usersInRoomSummary += nickNames[userSocketId];
	    }
	}
	usersInRoomSummary += '.';
	//将房间里其他用户的汇总发送给此用户
	socket.emit('message', {text:usersInRoomSummary});
    }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed){
    //添加nameAtte-mpt事件的监听器

    console.log('用户正在尝试更改昵称');
    socket.on('nameAttempt', function(name){
	//昵称不得以Guest开头
	if(name.indexOf('Guest') == 0){
	    socket.emit('nameResult', {
		success: false,
		message: "不得以Guest作为开头昵称。"
	    });
	}else{
	    //如果昵称还未注册则注册
	    if(namesUsed.indexOf(name) == -1){
		var previousName = nickNames[socket.id];
		var previousNameIndex = namesUsed.indexOf(previousName);
		namesUsed.push(name);
		nickNames[socket.id] = name;
		//删除之前用的昵称，让其他用户可以使用
		delete namesUsed[previousNameIndex];
		socket.emit('nameResult', {
		    success: true,
		    name: name
		});
		socket.broadcast.to(currentRoom[socket.id]).emit('message', {
		    text: previousName + ' is now known as ' + name + ' . '
		});
	    }else{
		//如果昵称已经被占用，给客户端发送错误消息
		socket.emit('nameResult', {
		    success: false,
		    message: '昵称被占用。 '
		});
	    }
	}
    });
}
//转发消息
function handleMessageBroadcasting(socket){
    socket.on('message', function(message){
	console.log('正在转发消息');
	socket.broadcast.to(message.room).emit('message', {
	    text: nickNames[socket.id] + ': ' + message.text
	});
    });
}

//创建房间
function handleRoomJoining(socket){
    socket.on('join', function(room) {
	socket.leave(currentRoom[socket.id]);
	joinRoom(socket, room.newRoom);
    });
}

//确立连接
exports.listen =  function(server){
    //启动Socket.io服务器，允许它搭载在已有的HTTP服务器上
    io = socketio.listen(server);
    console.log('socket已启动');
    io.set("log level", 1);
    //定义每个用户连接的处理
    io.sockets.on('connetion',function(socket){
	//在用户连接上来时赋予其一个访客名
	guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
	//在用户连接上来时把他放入名叫Lobby的聊天室内
	joinRoom(socket, 'Lobby');
	//处理用户的消息，更名，以及聊天室的创建和变更
	handleMessageBroadcasting(socket, nickNames);
	handleNameChangeAttempts(socket, nickNames, namesUsed);
	handleRoomJoining(socket);
	//用户发出请求时，向其提供已经被占用的聊天室列表
	socket.on('rooms', function(){
	    socket.emit('rooms', io.socket.manager.rooms);
	});
	//定义用户断开连接后的清除逻辑
	handleClientDisconnection(socket, nickNames, namesUsed);
    });
};


//断开连接
function handleClientDisconnection(socket){
    socket.on('disconnect',function(){
	var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
	delete namesUsed[nameIndex];
	delete nickNames[socket.id];
    });
}

