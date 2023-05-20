window.onload = function (){

    let canvas;
    let ctx;
    let delay = 1000;
    let canvasWidth = 900;
    let canvasHeight = 600;
    let snakee;
    let blockSize = 30;


    init();
   function init(){canvas = document.createElement('canvas');
       canvas.width = canvasWidth;
       canvas.height = canvasHeight;
       canvas.style.border = "1px solid";
       document.body.appendChild(canvas);
       ctx = canvas.getContext('2d');
       snakee = new Snake([[6,4], [5,4], [4,4]]);
       refreshCanvas();

   }

   function refreshCanvas(){
       ctx.clearRect(0,0, canvas.width, canvas.height);
       snakee.advance();
       snakee.draw();
       setTimeout(refreshCanvas, delay);
   }

   function drawBlock(ctx, position){
       let x= position[0] * blockSize;
       let y= position[1] * blockSize;
       ctx.fillRect(x, y, blockSize, blockSize);
   }
   function Snake(body){
       this.body = body;
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
           nextPosition[0]+=1;
           this.body.unshift(nextPosition);
           this.body.pop();
       };
   }
}








































