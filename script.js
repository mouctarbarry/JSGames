let canvas;
let ctx;
let delay = 100;
let canvasWidth = 900;
let canvasHeight = 600;
let snakee;
let blockSize = 30;
let applee;
let widthInBlock = canvasWidth/blockSize;
let heightInBlock = canvasHeight/blockSize;
let score;
let timeOut;
window.onload = function (){
    init();
   function init(){canvas = document.createElement('canvas');
       canvas.width = canvasWidth;
       canvas.height = canvasHeight;
       canvas.style.border = "30px solid gray";
       canvas.style.margin = "50px auto";
       canvas.style.display = "block";
       canvas.style.backgroundColor = "#ddd"
       document.body.appendChild(canvas);
       ctx = canvas.getContext('2d');
       snakee = new Snake([[6,4], [5,4], [4,4], [3,4]], "right");
       applee = new Apple([10, 10]);
       score = 0;
       refreshCanvas();

   }

   function refreshCanvas(){
       snakee.advance();
       if (snakee.checkCollision()){
           gameOver();
       }else {
           if (snakee.isEatingApple(applee)){
               snakee.ateApple = true;
               score++;
               do {
                   applee.setNewPosition();
               } while (applee.isOnSnake(snakee));
           }
           ctx.clearRect(0,0, canvas.width, canvas.height);
           drawScore();
           snakee.draw();
           applee.draw()
           timeOut = setTimeout(refreshCanvas, delay);

       }
   }

   function gameOver(){
       ctx.save();
       ctx.font = "bold 70px sans-serif";
       ctx.fillStyle = "black";
       ctx.textAlign = "center";
       ctx.textBaseline = "middle";
       ctx.strokeStyle = "white";
       let centerX = canvasWidth/2;
       let centerY = canvasHeight/2
       ctx.fillText("Game Over", centerX, centerY -180);
       ctx.strokeText("Game Over", centerX, centerY -180);

       ctx.font = "bold 30px sans-serif";
       ctx.strokeText("Appuyez sur la touche Espace pour rejouer", centerX, centerY-120);
       ctx.fillText("Appuyez sur la touche Espace pour rejouer", centerX, centerY-120);
       ctx.restore();
   }

   function restart(){
       snakee = new Snake([[6,4], [5,4], [4,4], [3,4]], "right");
       applee = new Apple([10, 10]);
       score = 0;
       clearTimeout(timeOut);
       refreshCanvas();
   }

   function drawScore(){
       ctx.save();
       ctx.font = "bold 200px sans-serif";
       ctx.fillStyle = "gray";
       ctx.textAlign = "center";
       ctx.textBaseline = "middle";
       let centerX = canvasWidth/2;
       let centerY = canvasHeight/2
       ctx.fillText(score.toString(), centerX, centerY);
       ctx.restore();
   }

   function drawBlock(ctx, position){
       let x= position[0] * blockSize;
       let y= position[1] * blockSize;
       ctx.fillRect(x, y, blockSize, blockSize);
   }
   function Snake(body, direction){
       this.body = body;
       this.direction = direction
       this.ateApple = false;
       this.draw = function(){
           ctx.save();
           ctx.fillStyle = "#d52727";
           for (let i = 0; i < this.body.length; i++){
               drawBlock(ctx, this.body[i]);
           }
           ctx.restore();
       };
       this.advance = function (){
           let nextPosition = this.body[0].slice();
           switch (this.direction){
               case "left":
                   nextPosition[0] -=1;
                   break;
               case "right":
                   nextPosition[0] +=1;
                   break;
               case "down":
                   nextPosition[1] +=1;
                   break;
               case "up":
                   nextPosition[1] -=1;
                   break;
               default:
                   throw ("Invalid Direction");
           }
           this.body.unshift(nextPosition);
           if (!this.ateApple)
                this.body.pop();
           else
               this.ateApple = false;
       };
       this.setDirection = function (newDirection){
           let allowedDirections;
           switch (this.direction){
               case "left":
               case "right":
                   allowedDirections = ["up, down"];
                   break;
               case "down":
               case "up":
                   allowedDirections = ["left, right"];
                   break;
               default:
                   throw ("Invalid Direction");
           }
           if (allowedDirections.indexOf(newDirection) > -1) {
               this.direction = newDirection;
           }
           let oppositeDirections = {
               left: "right",
               right: "left",
               up: "down",
               down: "up"
           };

           if (newDirection !== oppositeDirections[this.direction]) {
               this.direction = newDirection;
           }
       };
       this.checkCollision = function (){
           let wallCollision = false;
           let snakeCollision = false;
           let head = this.body[0];
           let rest = this.body.slice(1);
           let snakeX = head[0];
           let snakeY = head[1];
           let minX = 0;
           let minY = 0;
           let maxX = widthInBlock -1;
           let maxY = heightInBlock -1;
           let isNotBetweenHorizontalWalls = snakeX < minX || snakeX>maxX;
           let isNotBetweenVerticalWalls = snakeY < minY || snakeY>maxY;

           if (isNotBetweenHorizontalWalls || isNotBetweenVerticalWalls){
               wallCollision = true;
           }

           for (let i = 0; i<rest.length; i++){
               if (snakeX ===rest[i][0] && snakeY ===rest[i][1]){
                   snakeCollision = true;
               }
           }

           return wallCollision || snakeCollision;
       };

       this.isEatingApple = function (appleToEat){
           let head = this.body[0];
           return head[0] === appleToEat.position[0] && head[1] === appleToEat.position[1];
       };
   }

    document.onkeydown=function handleKeyDown(e){
        let key = e.code;
        let newDirection;
        switch (key){
            case "ArrowLeft":
                newDirection = "left";
                break;
            case "ArrowUp":
                newDirection = "up";
                break;
            case "ArrowRight":
                newDirection = "right"
                break;
            case "ArrowDown":
                newDirection = "down"
                break;
            case "Space":
                restart();
                return;
            default:
                return;
        }
        snakee.setDirection(newDirection);
    }
}

function Apple(position){
    this.position = position;
    this.draw = function (){
      ctx.save();
      ctx.fillStyle = "green";
      ctx.beginPath();
      let radius = blockSize/2;
      let x = this.position[0]*blockSize + radius;
      let y = this.position[1]*blockSize +radius;
      ctx.arc(x, y, radius, 0, Math.PI*2, true);
      ctx.fill();
      ctx.restore();
    };
    this.setNewPosition = function (){
        let newX = Math.round(Math.random()*(widthInBlock -1));
        let newY = Math.round(Math.random()*(heightInBlock -1));
        this.position = [newX, newY];
    };
    this.isOnSnake = function (snakeToCheck){
        let isOnSnake = false;
        for (let i = 0;i<snakeToCheck.body.length; i++){
            if (this.position[0]===snakeToCheck.body[i][0] &&
                    this.position[1]===snakeToCheck.body[i][1]){
                isOnSnake = true;
            }
        }
        return isOnSnake;
    };
}










































