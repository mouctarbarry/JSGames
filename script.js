let canvas;
let ctx;
let delay = 200;
let canvasWidth = 900;
let canvasHeight = 600;
let snakee;
let blockSize = 30;
let applee;
let widthInBlock = canvasWidth/blockSize;
let heightInBlock = canvasHeight/blockSize;
let score;
window.onload = function (){
    init();
   function init(){canvas = document.createElement('canvas');
       canvas.width = canvasWidth;
       canvas.height = canvasHeight;
       canvas.style.border = "1px solid";
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
           snakee.draw();
           applee.draw()
           drawScore();
           setTimeout(refreshCanvas, delay);
       }
   }

   function gameOver(){
       ctx.save();
       ctx.fillText("Game over", 5, 15);
       ctx.fillText("Appuyez sur la touche espace pour rejouer !", 5, 30);
       ctx.restore();
   }

   function restart(){
       snakee = new Snake([[6,4], [5,4], [4,4], [3,4]], "right");
       applee = new Apple([10, 10]);
       score = 0;
       refreshCanvas();
   }

   function drawScore(){
       ctx.save();
       ctx.fillText(score.toString(), 5, canvasHeight-5);
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
           ctx.fillStyle = "#ff0000";
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











































