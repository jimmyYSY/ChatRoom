//内置的HTTP模块提供了HTTP服务器和客户端功能
var http = require("http");
//内置的fs模块提供了与文件系统相关的功能
var fs = require("fs");
//内置的path模块提供了与文件系统路径相关的功能
var path = require("path");
//附加的mime模块又根据文件扩展名得出MIME类型的能力
var mime = require("mime");
//cache是用来缓存文件内容的对象
var cache = {};

//文件数据发送及404错误响应

function send404(response){
    response.writeHead(404,{"Content-Type": "text/plain"});
    response.write("Error 404: resource not found.");
    response.end();
}

function sendFile(response, filePath, fileContents){
    response.writeHead(
	200,
	{"content-type": mime.lookup(path.basename(filePath))});
    response.end(fileContents);
}

function serveStatic(response, cache, absPath){
    //检查文件是否缓存在内存中
    if(cache[absPath]){
	//从内存中返回文件
	sendFile(response, absPath, cache[absPath]);
    }else{
	//检查文件是否存在
	fs.exists(absPath, function(exists){
	    if(exists){
		//从硬盘中读取文件
		fs.readFile(absPath, function(err, data){
		    if(err){
			send404(response);
		    }else{
			cache[absPath] = data;
			//从硬盘中读取文件并返回
			sendFile(response, absPath, data);
		    }
		});
	    }else{
		//发送404响应
		send404(response);
	    }
	});
    }
}
//创建http服务器，用匿名函数定义对每个请求的处理行为
var server = http.createServer(function(request, response){
    var filePath = false;
    if(request.url == "/"){
	//确定返回的默认HTML文件
	filePath = 'public/index.html';
    }else{
	//将URL路径转为文件的相对路径
	filePath = 'public' + request.url;
    }

    var absPath = './' + filePath;
    //返回静态文件
    serveStatic(response, cache, absPath);
});


//设置启动HTTP服务器
server.listen(3000,function(){
    console.log("Server listening on port 3000");
});

//加载socket.io node模块
var chatServer = require('./lib/chat_server');
//启动服务
chatServer.listen(server);

