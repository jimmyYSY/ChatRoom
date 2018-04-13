function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

//处理用户输入
function processUserInput(chatApp, socket) {
    var message = $('#send-messages').val();
    var systemmMessage;
    if(message.charAt(0) == '/'){
	systemmMessage = chatApp.processCommand(message);
	if(systemmMessage) {
	    $('#messages').append(divSystemContentElement(systemmMessage));
	}
    }else{
	chatApp.sendMessage($('#room').text(), message);
	$('#messages').append(divEscapedContentElement(message));
	$('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-message').val('');
}

//客户端程序初始化
var socket = io.connect();
$(document).ready(function(){
    var chatApp = new Chat(socket);
    //显示更名尝试的结果
    socket.on('nameResult', function(result){
	var message;
	if(result.success) {
	    message = '你现在的用户名为：' + result.name + ' 。';
	}else{
	    message = result.message;
	}
	$('#messages').append(divSystemContentElement(message));
    });
    //显示房间变更结果
    socket.on('joinResult', function(result){
	$('#room').text(result.room);
	$('#messages').append(newElement);
    });
    //显示接收到的信息
    socket.on('message', function(message){
	var newElement = $('<div></div>').text(message.text);
	$('#messages').append(newElement);
    });
    //显示可用的房间列表
    socket.on('rooms', function(rooms) {
	$('#room-list').empty();

	for(var room in rooms){
	    room = room.substring(1, room.length);
	    if(room != ''){
		$('#room-list').append(divEscapedContentElement(room));
	    }
	}
	//点击房间名切换房间
	$('#room-list div').click(function() {
	    chatApp.processCommand('/join' + $(this).text());
	    $('#send-messages').focus();
	});
    });
    setInterval(function() {
	socket.emit('rooms');
    },1000);

    $('#send-messages').focus();

    $('#send-form').submit(function() {
	processUserInput(chatApp, socket);
	return false;
    });
});
